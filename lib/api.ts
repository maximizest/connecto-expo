import ky, { type KyInstance, type Options, HTTPError } from 'ky'

import { API_CONFIG, HTTP_STATUS } from '@/lib/constants'
import { tokenManager, handleUnauthorizedError } from '@/lib/token-manager'
import { ErrorHandler, type ErrorHandlingOptions } from '@/lib/error-handler'
import { RequestDeduplicator, createRequestKey } from '@/lib/request-deduplicator'
import type { ApiError } from '@/types/api'

/**
 * API 에러 처리 함수 (새로운 에러 핸들링 시스템 사용)
 */
async function handleApiError(error: unknown, options?: ErrorHandlingOptions): Promise<never> {
  await ErrorHandler.handle(error, options)
  throw error
}

/**
 * ky 인스턴스 생성 및 설정
 */
function createApiClient(): KyInstance {
  return ky.create({
    prefixUrl: `${API_CONFIG.BASE_URL}/${API_CONFIG.PREFIX}/${API_CONFIG.VERSION}`,
    timeout: API_CONFIG.TIMEOUT,
    retry: {
      limit: 2,
      methods: ['get', 'post', 'put', 'patch', 'delete'], // 모든 HTTP 메서드에서 재시도 허용
      statusCodes: [401, 408, 413, 429, 500, 502, 503, 504], // 401 추가
    },
    headers: {
      'Content-Type': 'application/json',
    },
    hooks: {
      beforeRequest: [
        async (request) => {
          // 토큰 만료 체크 및 미리 갱신
          if (tokenManager.isTokenExpiringSoon() && tokenManager.getRefreshToken()) {
            try {
              await tokenManager.refreshAccessToken()
            } catch (error) {
              console.error('Proactive token refresh failed:', error)
              // 미리 갱신 실패해도 기존 토큰으로 요청 시도
            }
          }

          const accessToken = tokenManager.getAccessToken()
          if (accessToken) {
            request.headers.set('Authorization', `Bearer ${accessToken}`)
          }
        }
      ],
      beforeRetry: [
        async ({ request, error, retryCount }) => {
          // 401 에러 시 토큰 갱신 시도 (첫 번째 재시도에서만)
          if (error instanceof HTTPError && error.response?.status === HTTP_STATUS.UNAUTHORIZED && retryCount === 1) {
            const refreshToken = tokenManager.getRefreshToken()
            if (!refreshToken) {
              await handleUnauthorizedError()
              throw error
            }

            try {
              const newAccessToken = await tokenManager.refreshAccessToken()
              request.headers.set('Authorization', `Bearer ${newAccessToken}`)
              return
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError)
              // 토큰 갱신 실패 시 인증 상태 초기화 및 리디렉션
              await handleUnauthorizedError()
              throw error
            }
          }
        }
      ],
      afterResponse: [
        (request, options, response) => {
          // 응답이 성공적이면 그대로 반환
          if (response.ok) {
            return response
          }

          // 에러 응답 처리
          return response
        }
      ],
      beforeError: [
        async (error) => {
          const { response } = error
          if (response) {
            try {
              const errorData = await response.json() as ApiError
              // @foryourdev/nestjs-crud는 message가 배열이므로 첫 번째 요소 사용
              error.message = Array.isArray(errorData.message)
                ? errorData.message[0] || error.message
                : String(errorData.message) || error.message
            } catch {
              // JSON 파싱 실패 시 기본 메시지 사용
            }
          }
          return error
        }
      ]
    }
  })
}

// API 클라이언트 인스턴스
export const api = createApiClient()

// 요청 옵션 확장 타입
interface ExtendedOptions extends Options {
  errorOptions?: ErrorHandlingOptions
  deduplication?: {
    enabled?: boolean
    key?: string
  }
}

/**
 * API 유틸리티 함수들
 */
export const apiUtils = {
  // GET 요청
  async get<T>(url: string, options?: ExtendedOptions): Promise<T> {
    const { deduplication, errorOptions, ...kyOptions } = options || {}

    const requestFn = async (signal: AbortSignal) => {
      return await api.get(url, { ...kyOptions, signal }).json<T>()
    }

    try {
      // 중복 요청 방지 적용 (기본적으로 GET 요청에는 적용)
      if (deduplication?.enabled !== false) {
        const requestKey = deduplication?.key || createRequestKey(url, 'GET')
        return await RequestDeduplicator.deduplicate(requestKey, requestFn)
      } else {
        const controller = new AbortController()
        return await requestFn(controller.signal)
      }
    } catch (error) {
      return await handleApiError(error, errorOptions)
    }
  },

  // POST 요청
  async post<T>(url: string, data?: unknown, options?: ExtendedOptions): Promise<T> {
    const { deduplication, errorOptions, ...kyOptions } = options || {}

    const requestFn = async (signal: AbortSignal) => {
      return await api.post(url, { json: data, ...kyOptions, signal }).json<T>()
    }

    try {
      // POST 요청은 기본적으로 중복 방지 비활성화 (명시적으로 활성화된 경우만)
      if (deduplication?.enabled === true) {
        const requestKey = deduplication?.key || createRequestKey(url, 'POST', data)
        return await RequestDeduplicator.deduplicate(requestKey, requestFn)
      } else {
        const controller = new AbortController()
        return await requestFn(controller.signal)
      }
    } catch (error) {
      return await handleApiError(error, errorOptions)
    }
  },

  // PUT 요청
  async put<T>(url: string, data?: unknown, options?: ExtendedOptions): Promise<T> {
    const { deduplication, errorOptions, ...kyOptions } = options || {}

    const requestFn = async (signal: AbortSignal) => {
      return await api.put(url, { json: data, ...kyOptions, signal }).json<T>()
    }

    try {
      // PUT 요청은 기본적으로 중복 방지 비활성화
      if (deduplication?.enabled === true) {
        const requestKey = deduplication?.key || createRequestKey(url, 'PUT', data)
        return await RequestDeduplicator.deduplicate(requestKey, requestFn)
      } else {
        const controller = new AbortController()
        return await requestFn(controller.signal)
      }
    } catch (error) {
      return await handleApiError(error, errorOptions)
    }
  },

  // PATCH 요청
  async patch<T>(url: string, data?: unknown, options?: ExtendedOptions): Promise<T> {
    const { deduplication, errorOptions, ...kyOptions } = options || {}

    const requestFn = async (signal: AbortSignal) => {
      return await api.patch(url, { json: data, ...kyOptions, signal }).json<T>()
    }

    try {
      // PATCH 요청은 기본적으로 중복 방지 비활성화
      if (deduplication?.enabled === true) {
        const requestKey = deduplication?.key || createRequestKey(url, 'PATCH', data)
        return await RequestDeduplicator.deduplicate(requestKey, requestFn)
      } else {
        const controller = new AbortController()
        return await requestFn(controller.signal)
      }
    } catch (error) {
      return await handleApiError(error, errorOptions)
    }
  },

  // DELETE 요청
  async delete<T>(url: string, options?: ExtendedOptions): Promise<T> {
    const { deduplication, errorOptions, ...kyOptions } = options || {}

    const requestFn = async (signal: AbortSignal) => {
      return await api.delete(url, { ...kyOptions, signal }).json<T>()
    }

    try {
      // DELETE 요청은 기본적으로 중복 방지 비활성화
      if (deduplication?.enabled === true) {
        const requestKey = deduplication?.key || createRequestKey(url, 'DELETE')
        return await RequestDeduplicator.deduplicate(requestKey, requestFn)
      } else {
        const controller = new AbortController()
        return await requestFn(controller.signal)
      }
    } catch (error) {
      return await handleApiError(error, errorOptions)
    }
  },

  // CRUD 쿼리 문자열 생성 (@foryourdev/nestjs-crud 형식)
  buildCrudQuery(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'filter' && typeof value === 'object' && !Array.isArray(value)) {
          // 필터 객체를 filter[field_operator]=value 형식으로 변환
          Object.entries(value as Record<string, unknown>).forEach(([filterKey, filterValue]) => {
            if (filterValue !== undefined && filterValue !== null) {
              searchParams.append(`filter[${filterKey}]`, String(filterValue))
            }
          })
        } else if (key === 'page' && typeof value === 'object' && !Array.isArray(value)) {
          // 페이지 객체를 page[number]=1&page[size]=10 형식으로 변환
          Object.entries(value as Record<string, unknown>).forEach(([pageKey, pageValue]) => {
            if (pageValue !== undefined && pageValue !== null) {
              searchParams.append(`page[${pageKey}]`, String(pageValue))
            }
          })
        } else if (Array.isArray(value)) {
          // 배열 값 처리 - nestjs-crud는 쉼표로 구분된 단일 값을 원함
          searchParams.append(key, value.join(','))
        } else {
          searchParams.append(key, String(value))
        }
      }
    })

    return searchParams.toString()
  },

  // 필터 헬퍼 함수들
  createFilter(field: string, operator: string, value: unknown): Record<string, unknown> {
    return {
      [`${field}_${operator}`]: value
    }
  },

  // 이메일 필터 헬퍼 (현재 백엔드에서 허용된 유일한 필터)
  emailFilter(value: string): Record<string, unknown> {
    return {
      filter: {
        email_like: `%${value}%`
      }
    }
  }
} 