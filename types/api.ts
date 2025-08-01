/**
 * 기본 API 관련 타입 정의
 */

// 기본 API 응답 타입
export interface ApiResponse<T = unknown> {
  data: T
  message: string
  status: number
}

// 에러 응답 세부 타입
export interface ValidationErrorDetail {
  field: string
  message: string
  value?: unknown
}

export interface ApiErrorDetail {
  code?: string
  field?: string
  message: string
  constraints?: Record<string, string>
}

// 구체화된 에러 응답 타입 (@foryourdev/nestjs-crud CrudExceptionFilter 적용)
export interface ApiError {
  message: string | string[]  // 단일 또는 배열 형태
  statusCode: number
  error?: string
  details?: Record<string, unknown>
  // 추가 에러 정보
  timestamp?: string
  path?: string
  method?: string
  // 유효성 검사 에러 세부사항
  validationErrors?: ValidationErrorDetail[]
}

// HTTP 응답 상태별 에러 타입
export interface ValidationError extends ApiError {
  statusCode: 422
  validationErrors: ValidationErrorDetail[]
}

export interface AuthenticationError extends ApiError {
  statusCode: 401
  error: 'Unauthorized'
}

export interface AuthorizationError extends ApiError {
  statusCode: 403
  error: 'Forbidden'
}

export interface NotFoundError extends ApiError {
  statusCode: 404
  error: 'Not Found'
}

export interface ConflictError extends ApiError {
  statusCode: 409
  error: 'Conflict'
}

export interface ServerError extends ApiError {
  statusCode: 500
  error: 'Internal Server Error'
}

// 네트워크 에러 타입
export interface NetworkError {
  name: 'NetworkError'
  message: string
  code?: string
  stack?: string
}

// 통합 에러 타입
export type ApplicationError =
  | ValidationError
  | AuthenticationError
  | AuthorizationError
  | NotFoundError
  | ConflictError
  | ServerError
  | NetworkError

// 페이지네이션 관련 타입
export interface PaginationParams {
  page?: number
  limit?: number
  sort?: string | string[]
  filter?: Record<string, unknown>
}

// 정렬 방향 타입
export type SortDirection = 'asc' | 'desc'

// 정렬 필드 타입
export interface SortField {
  field: string
  direction: SortDirection
}

// nestjs-crud 페이지네이션 응답 구조
export interface PaginationMetadata {
  operation: string
  timestamp: string
  affectedCount: number
  includedRelations?: string[]
  excludedFields?: string[]
  pagination: {
    type: 'offset' | 'cursor' | 'number'
    total: number
    page?: number
    pages?: number
    totalPages?: number
    offset?: number
    limit?: number
    nextCursor?: string
    prevCursor?: string
    hasNext?: boolean
    hasPrev?: boolean
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  metadata: PaginationMetadata
}

// HTTP 메서드 타입
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

// API 요청 옵션 타입
export interface ApiRequestOptions {
  method?: HttpMethod
  headers?: Record<string, string>
  params?: Record<string, unknown>
  timeout?: number
  retry?: number | boolean
  retryDelay?: number
  signal?: AbortSignal
}

// API 응답 메타데이터
export interface ResponseMetadata {
  requestId?: string
  timestamp: string
  version?: string
  cached?: boolean
  processingTime?: number
}

// 완전한 API 응답 타입
export interface FullApiResponse<T> extends ApiResponse<T> {
  metadata?: ResponseMetadata
}

// 필터 연산자 타입
export type FilterOperator =
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'like' | 'ilike' | 'in' | 'not_in'
  | 'between' | 'null' | 'not_null'
  | 'start' | 'end' | 'contains'

// 필터 값 타입
export type FilterValue = string | number | boolean | null | string[] | number[]

// 동적 필터 타입
export type DynamicFilter = {
  [K in `${string}_${FilterOperator}`]?: FilterValue
}

// 타입 가드 함수들
export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    'message' in error
}

export function isValidationError(error: unknown): error is ValidationError {
  return isApiError(error) &&
    error.statusCode === 422 &&
    'validationErrors' in error
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof Error &&
    (error.name === 'NetworkError' || error.message.includes('fetch'))
}

export function isPaginatedResponse<T>(response: unknown): response is PaginatedResponse<T> {
  return typeof response === 'object' &&
    response !== null &&
    'data' in response &&
    'metadata' in response &&
    Array.isArray((response as any).data)
} 