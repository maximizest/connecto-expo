# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

React Native Expo 기반의 크로스 플랫폼 모바일 애플리케이션. NestJS CRUD 백엔드와 통신하며 NativeWind(Tailwind CSS)를 사용한 UI 컴포넌트 시스템 구현.

## 개발 환경 설정 및 실행

### 기본 명령어
```bash
# 개발 서버 실행 (캐시 클리어)
yarn dev

# 플랫폼별 실행
yarn ios              # iOS 시뮬레이터
yarn android          # Android 에뮬레이터
yarn web              # 웹 브라우저

# 캐시 클리어 후 플랫폼별 실행
yarn dev:web
yarn dev:android

# 프로젝트 정리
yarn clean            # .expo, node_modules 삭제
```

### 설치 후 처리
- `postinstall` 스크립트가 자동으로 TailwindCSS 글로벌 스타일 생성 (`npx tailwindcss -i ./global.css -o ./node_modules/.cache/nativewind/global.css`)

## 코드 아키텍처

### 디렉토리 구조 및 역할

```
app/                    # Expo Router 기반 화면 라우팅
├── _layout.tsx        # 루트 레이아웃 (테마, 네비게이션, ToastProvider)
├── index.tsx          # 메인 홈 화면
└── +not-found.tsx     # 404 에러 페이지

components/
├── ui/                # @rn-primitives 기반 재사용 가능 UI 컴포넌트
│                      # (button, card, avatar, dialog 등 33개 컴포넌트)
└── ThemeToggle.tsx    # 다크모드 토글 컴포넌트

lib/                   # 핵심 비즈니스 로직 및 유틸리티
├── api.ts            # ky 기반 API 클라이언트 (자동 토큰 갱신, 중복 요청 방지)
├── token-manager.ts  # JWT 토큰 관리 (만료 체크, 자동 갱신)
├── error-handler.ts  # 중앙화된 에러 처리 시스템
├── request-deduplicator.ts  # 동일 API 요청 중복 방지
├── query-builder.ts  # @foryourdev/nestjs-crud 쿼리 생성기
├── query-invalidation.ts    # TanStack Query 캐시 무효화
├── env-validator.ts  # 환경변수 검증 시스템
├── constants.ts      # API 설정, HTTP 상태 코드, 에러 메시지
├── useColorScheme.tsx # 다크모드 상태 관리 훅
└── icons/            # lucide-react-native 아이콘

store/                # Zustand 상태 관리
├── auth-store.ts     # 인증 상태 (user, tokens, login/logout)
├── progressStore.ts  # 예제 progress 상태
└── scrollStore.ts    # 예제 scroll 상태

types/                # TypeScript 타입 정의
├── api.ts           # API 응답, 에러, 페이지네이션 타입
├── auth.ts          # 인증 관련 타입
├── crud.ts          # CRUD 작업 타입
├── query.ts         # TanStack Query 타입
├── store.ts         # Zustand 스토어 타입
└── user/            # 사용자 도메인 타입
```

### 핵심 설계 패턴

#### 1. 자동 토큰 갱신 시스템
- **만료 임박 감지**: API 요청 전 토큰 만료 5분 전 자동 갱신 (`tokenManager.isTokenExpiringSoon()`)
- **401 에러 복구**: `beforeRetry` 훅에서 토큰 갱신 후 요청 재시도
- **실패 처리**: 갱신 실패 시 `handleUnauthorizedError()` 호출하여 로그인 화면 리디렉션

#### 2. 요청 중복 방지 시스템
- **GET 요청**: 기본적으로 중복 방지 활성화
- **POST/PUT/PATCH/DELETE**: 명시적으로 `deduplication: { enabled: true }` 설정 필요
- **요청 키 생성**: URL + HTTP 메서드 + 요청 데이터 해시
- **AbortController**: 중복 요청 감지 시 이전 요청 자동 취소

#### 3. 에러 처리 계층
```typescript
// lib/api.ts의 모든 API 메서드는 통합 에러 핸들러 사용
try {
  return await RequestDeduplicator.deduplicate(requestKey, requestFn)
} catch (error) {
  return await handleApiError(error, errorOptions)
}

// ErrorHandler.handle()이 다음을 자동 처리:
// - HTTP 에러 분류 및 로깅
// - 네트워크 에러 감지
// - 사용자 친화적 메시지 생성
// - Toast 알림 표시 (옵션)
```

#### 4. NestJS CRUD 통합
- **쿼리 빌더**: `apiUtils.buildCrudQuery()` 사용하여 `filter[field_operator]=value` 형식 생성
- **페이지네이션**: `PaginatedResponse<T>` 타입으로 metadata 포함 응답 처리
- **필터 헬퍼**: `apiUtils.createFilter()`, `apiUtils.emailFilter()` 제공
- **예제**:
```typescript
const query = apiUtils.buildCrudQuery({
  filter: { email_like: '%@example.com' },
  page: { number: 1, size: 10 },
  sort: ['createdAt,DESC']
})
// 결과: filter[email_like]=%@example.com&page[number]=1&page[size]=10&sort=createdAt,DESC
```

#### 5. 상태 관리 패턴
- **Zustand Persist**: 인증 상태는 localStorage에 자동 저장 (`partialize`로 민감 정보 제외)
- **Hydration 처리**: SSR/SSG 대비 `useHydration()` 훅으로 클라이언트 마운트 확인
- **토큰 분리**: accessToken/refreshToken은 `tokenManager`가 관리, user 정보만 스토어에 저장
- **셀렉터**: `useAuth()`, `usePermissions()` 등 커스텀 훅으로 상태 접근

## 코딩 규칙

### API 호출
```typescript
// ✅ 올바른 사용법 (통합 에러 처리 + 중복 방지)
import { apiUtils } from '@/lib/api'

const users = await apiUtils.get<User[]>('users', {
  errorOptions: { showToast: true, logError: true }
})

// ❌ 직접 ky 호출 (에러 처리 누락)
const response = await api.get('users').json()
```

### 에러 처리
```typescript
// ✅ 선언적 에러 옵션 사용
await apiUtils.post('users', userData, {
  errorOptions: {
    showToast: true,
    customMessage: '사용자 생성에 실패했습니다'
  }
})

// ✅ 타입 가드 활용
if (isValidationError(error)) {
  console.log(error.validationErrors)
}
```

### 환경변수
- **필수 변수**: `NEXT_PUBLIC_API_URL` (기본값: `http://localhost:4000`)
- **검증**: `lib/env-validator.ts`의 스키마 정의 참조
- **타입 안전 접근**: `createEnvAccessor()` 사용 권장

### 스타일링
- **NativeWind 4**: Tailwind 클래스명 사용 (`className="bg-background text-foreground"`)
- **테마 변수**: `global.css`에 정의된 CSS 변수 활용 (`hsl(var(--primary))`)
- **다크모드**: `useColorScheme()` 훅으로 현재 테마 확인
- **플랫폼 대응**: `Platform.select()` 사용 (`app/_layout.tsx:33-37` 참조)

#### Color 디자인 시스템
Figma 디자인 시스템 기반의 색상 팔레트 구현 (`global.css`, `tailwind.config.js`)

**Base Colors**:
```typescript
bg-base-white      // #FFFFFF
bg-base-black      // #000000
bg-base-red        // #F03F40 (Error)
```

**Purple Scale** (Primary):
```typescript
bg-purple-25       // #FAFAFF (lightest)
bg-purple-50       // #F4F3FF
bg-purple-100      // #EBE9FE
bg-purple-200      // #D9D6FE
bg-purple-300      // #BDB4FE
bg-purple-400      // #9B8AFB
bg-purple-500      // #7A5AF8 (Primary, WCAG AA)
bg-purple-600      // #6938EF
bg-purple-700      // #5925DC (WCAG AAA)
bg-purple-800      // #4A1FB8
bg-purple-900      // #3E1C96
bg-purple-950      // #27115F (darkest)
```

**Yellow Scale** (Warning):
```typescript
bg-yellow-25       // #FEFDF0 (lightest)
bg-yellow-50       // #FEFBE8
bg-yellow-100      // #FEF7C3
bg-yellow-200      // #FEEE95
bg-yellow-300      // #FDE272
bg-yellow-400      // #FAC515
bg-yellow-500      // #EAAA08 (Primary)
bg-yellow-600      // #CA8504
bg-yellow-700      // #A15C07 (WCAG AA)
bg-yellow-800      // #854A0E
bg-yellow-900      // #713B12
bg-yellow-950      // #542C0D (darkest)
```

**Success (Green) Scale**:
```typescript
bg-success-50      // #ECFDF3
bg-success-200     // #ABEFC6
bg-success-700     // #067647 (WCAG AAA)
```

**사용 예시**:
```tsx
// 기본 색상
<View className="bg-purple-500 text-base-white">
  <Text>Primary Button</Text>
</View>

// 그라데이션 및 상태 변화
<Pressable className="bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700">
  <Text className="text-base-black">Warning</Text>
</Pressable>

// Success 상태
<View className="border border-success-700 bg-success-50">
  <Text className="text-success-700">Success Message</Text>
</View>

// CSS 변수로 직접 접근 (고급)
<View style={{ backgroundColor: 'hsl(var(--purple-500))' }}>
  <Text>Custom Style</Text>
</View>
```

**접근성 (WCAG Contrast Ratios)**:
- `purple-500`: AA 4.53:1 (흰색 텍스트)
- `purple-700`: AAA 7.71:1 (흰색 텍스트)
- `yellow-700`: AA 5.20:1 (흰색 텍스트)
- `success-700`: AAA (흰색 텍스트)

### Path Alias
- `@/*`: 프로젝트 루트 경로
- `~/*`: 프로젝트 루트 경로 (동일)
- Metro와 TypeScript에 모두 설정됨 (`metro.config.js:8-11`, `tsconfig.json:17-20`)

## 주의사항

### API 클라이언트
- **재시도 정책**: 401 에러 포함 최대 2회 재시도 (`lib/api.ts:24-28`)
- **토큰 갱신 타이밍**: 만료 5분 전부터 자동 갱신 시도 (`token-manager.ts`)
- **beforeRetry 훅**: 401 에러 시 첫 번째 재시도에서만 토큰 갱신 (`lib/api.ts:54`)

### 상태 관리
- **토큰 저장 위치**: `tokenManager`가 관리하며 스토어의 `partialize`에서 제외
- **Hydration**: 클라이언트 마운트 전 `hydrated` 상태 확인 필수
- **localStorage**: `persist` 미들웨어 사용 시 `onRehydrateStorage` 콜백에서 토큰 복원

### 한글 주석
- 모든 코드 주석과 커밋 메시지는 한글로 작성
- 타입 정의와 인터페이스 문서화도 한글 사용

### UI 컴포넌트
- `@rn-primitives/*` 패키지 기반의 33개 프리미티브 사용
- 새 컴포넌트 추가 시 `components/ui/` 디렉토리에 배치
- 반드시 `cn()` 유틸리티로 클래스명 병합 (`lib/utils.ts`)
