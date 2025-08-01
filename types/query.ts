/**
 * React Query (TanStack Query) 관련 타입 정의
 */

import type { ApiError } from './api'

// Query 에러 타입
export interface QueryError extends Error {
  status?: number
  statusCode?: number
  response?: {
    data?: ApiError
  }
}

// Mutation 옵션 타입
export interface MutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: QueryError, variables: TVariables) => void
  onSettled?: (data: TData | undefined, error: QueryError | null, variables: TVariables) => void
}

// Query 옵션 타입
export interface QueryOptions<TData> {
  enabled?: boolean
  staleTime?: number
  cacheTime?: number
  refetchOnWindowFocus?: boolean
  refetchOnMount?: boolean
  retry?: boolean | number
  retryDelay?: number
  onSuccess?: (data: TData) => void
  onError?: (error: QueryError) => void
}

// Infinite Query 페이지 타입
export interface InfiniteQueryPage<T> {
  data: T[]
  nextCursor?: string
  hasNextPage: boolean
}

// API 클래스 인터페이스 타입
export interface ApiClassInterface<T> {
  index: (query?: any, options?: QueryOptions<T[]>) => any
  show: (id: string, options?: QueryOptions<T>) => any
  create: (options?: MutationOptions<T, any>) => any
  update: (id: string, options?: MutationOptions<T, any>) => any
  destroy: (id: string, options?: MutationOptions<void, string>) => any
}

// Query Key 팩토리 타입
export interface QueryKeyFactory {
  all: string[]
  lists: () => string[]
  list: (filters?: Record<string, unknown>) => string[]
  details: () => string[]
  detail: (id: string) => string[]
  mutations: () => string[]
} 