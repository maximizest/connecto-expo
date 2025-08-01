/**
 * User 관련 타입 정의
 */

export enum UserProvider {
  LOCAL = "local",
  GOOGLE = "google",
  APPLE = "apple",
  KAKAO = "kakao",
  NAVER = "naver",
}

// User 기본 인터페이스
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string | null;
  provider: UserProvider;
  providerId?: string | null;
  refreshToken?: string | null;
  createdAt: string;
  updatedAt: string;
}

// User 생성 요청 타입
export interface CreateUserRequest {
  name: string;
  email: string;
  password?: string | null;
  provider: UserProvider;
  providerId?: string | null;
}

// User 수정 요청 타입
export interface UpdateUserRequest {
  name?: string | null;
}

// User 필터 타입
export interface UserFilter {
  email?: string;
}
