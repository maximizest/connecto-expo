/**
 * CRUD 관련 타입 정의 (@foryourdev/nestjs-crud 호환)
 */

// CRUD 필터 타입
export interface CrudFilter {
  [key: string]: string | number | boolean | null
}

// CRUD 쿼리 타입
export interface CrudQuery {
  // 필터링 - underscore 구분자 방식 (field_operator=value)
  filter?: CrudFilter
  // 정렬 (예: '-createdAt', 'name', ['-createdAt', 'name'])
  sort?: string | string[]
  // 관계 포함 (예: 'profile', ['profile', 'posts'])
  include?: string | string[]
  // 페이지네이션 (nestjs-crud 호환)
  page?: {
    // 페이지 번호 방식
    number?: number
    size?: number
    // 오프셋 방식  
    offset?: number
    limit?: number
    // 커서 방식
    cursor?: string
  }
}

// 필터 연산자 타입
export type FilterOperator =
  | 'eq'        // 같음 (=)
  | 'ne'        // 다름 (!=)
  | 'gt'        // 초과 (>)
  | 'gte'       // 이상 (>=)
  | 'lt'        // 미만 (<)
  | 'lte'       // 이하 (<=)
  | 'like'      // LIKE 패턴 (%value%)
  | 'start'     // 시작 문자 (value%)
  | 'end'       // 끝 문자 (%value)
  | 'in'        // 포함 (IN)
  | 'not_in'    // 미포함 (NOT IN)
  | 'between'   // 범위 (BETWEEN)
  | 'null'      // NULL 값
  | 'not_null'  // NOT NULL

// 정렬 방향 타입
export type SortDirection = 'ASC' | 'DESC'

// 페이지네이션 타입
export type PaginationType = 'offset' | 'cursor' | 'number'

// CRUD 작업 타입
export type CrudOperation = 'create' | 'read' | 'update' | 'delete'

// 쿼리 빌더 옵션 타입
export interface QueryBuilderOptions {
  defaultLimit?: number
  defaultSort?: string
  allowedFilters?: string[]
  allowedSorts?: string[]
  maxLimit?: number
}

// 쿼리 상태 타입
export interface QueryState {
  page: number
  limit: number
  sort: string
  filters: Record<string, unknown>
} 