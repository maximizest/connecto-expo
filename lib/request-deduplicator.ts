/**
 * API 요청 중복 방지 및 최적화 시스템
 */

// 요청 키 생성 함수
export function createRequestKey(
  url: string,
  method: string,
  data?: unknown
): string {
  const dataHash = data ? JSON.stringify(data) : "";
  return `${method}:${url}:${dataHash}`;
}

// 진행 중인 요청 저장소
const pendingRequests = new Map<
  string,
  {
    promise: Promise<unknown>;
    controller: AbortController;
    timestamp: number;
  }
>();

// 디바운스 타이머 저장소
const debounceTimers = new Map<string, NodeJS.Timeout>();

// 스로틀링 상태 저장소
const throttleState = new Map<
  string,
  {
    lastExecuted: number;
    isThrottled: boolean;
  }
>();

/**
 * 요청 중복 제거기
 */
export class RequestDeduplicator {
  private static readonly PENDING_TIMEOUT = 30000; // 30초 후 자동 정리
  private static readonly CLEANUP_INTERVAL = 60000; // 1분마다 정리

  static {
    // 주기적으로 만료된 요청 정리
    setInterval(() => {
      this.cleanupExpiredRequests();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * 중복 요청 방지
   */
  static async deduplicate<T>(
    key: string,
    requestFn: (signal: AbortSignal) => Promise<T>
  ): Promise<T> {
    // 이미 진행 중인 요청이 있는 경우 기존 요청 반환
    const existingRequest = pendingRequests.get(key);
    if (existingRequest) {
      console.debug(`Deduplicating request: ${key}`);
      return existingRequest.promise as Promise<T>;
    }

    // 새로운 요청 생성
    const controller = new AbortController();
    const promise = requestFn(controller.signal).finally(() => {
      // 요청 완료 후 정리
      pendingRequests.delete(key);
    });

    // 진행 중인 요청으로 등록
    pendingRequests.set(key, {
      promise,
      controller,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * 요청 취소
   */
  static cancelRequest(key: string): boolean {
    const request = pendingRequests.get(key);
    if (request) {
      request.controller.abort();
      pendingRequests.delete(key);
      console.debug(`Cancelled request: ${key}`);
      return true;
    }
    return false;
  }

  /**
   * 모든 진행 중인 요청 취소
   */
  static cancelAllRequests(): void {
    for (const request of pendingRequests.values()) {
      request.controller.abort();
    }
    pendingRequests.clear();
    console.debug("Cancelled all pending requests");
  }

  /**
   * 만료된 요청 정리
   */
  private static cleanupExpiredRequests(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, request] of pendingRequests) {
      if (now - request.timestamp > this.PENDING_TIMEOUT) {
        request.controller.abort();
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => {
      pendingRequests.delete(key);
    });

    if (expiredKeys.length > 0) {
      console.debug(`Cleaned up ${expiredKeys.length} expired requests`);
    }
  }

  /**
   * 현재 진행 중인 요청 상태
   */
  static getStatus() {
    return {
      pendingCount: pendingRequests.size,
      debounceCount: debounceTimers.size,
      throttleCount: throttleState.size,
    };
  }
}

/**
 * 디바운스 함수
 */
export function debounce<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  delay: number,
  key?: string
): (...args: T) => Promise<R> {
  return (...args: T): Promise<R> => {
    const debounceKey = key || `debounce_${fn.name}_${JSON.stringify(args)}`;

    return new Promise((resolve, reject) => {
      // 기존 타이머 취소
      const existingTimer = debounceTimers.get(debounceKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // 새로운 타이머 설정
      const timer = setTimeout(async () => {
        try {
          debounceTimers.delete(debounceKey);
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          debounceTimers.delete(debounceKey);
          reject(error);
        }
      }, delay);

      debounceTimers.set(debounceKey, timer);
    });
  };
}

/**
 * 스로틀링 함수
 */
export function throttle<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  limit: number,
  key?: string
): (...args: T) => Promise<R> {
  return (...args: T): Promise<R> => {
    const throttleKey = key || `throttle_${fn.name}_${JSON.stringify(args)}`;
    const now = Date.now();
    const state = throttleState.get(throttleKey) || {
      lastExecuted: 0,
      isThrottled: false,
    };

    return new Promise((resolve, reject) => {
      const timeSinceLastExecution = now - state.lastExecuted;

      if (timeSinceLastExecution >= limit) {
        // 즉시 실행
        state.lastExecuted = now;
        state.isThrottled = false;
        throttleState.set(throttleKey, state);

        fn(...args)
          .then(resolve)
          .catch(reject);
      } else if (!state.isThrottled) {
        // 지연 실행
        state.isThrottled = true;
        throttleState.set(throttleKey, state);

        const remainingTime = limit - timeSinceLastExecution;
        setTimeout(async () => {
          try {
            const updatedState = throttleState.get(throttleKey);
            if (updatedState) {
              updatedState.lastExecuted = Date.now();
              updatedState.isThrottled = false;
              throttleState.set(throttleKey, updatedState);
            }

            const result = await fn(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, remainingTime);
      } else {
        // 이미 스로틀링 중인 경우 무시
        console.debug(`Request throttled: ${throttleKey}`);
        reject(new Error("Request throttled"));
      }
    });
  };
}

/**
 * 검색 요청 디바운싱 (특화된 함수)
 */
export function createDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T>,
  delay: number = 300
) {
  let currentController: AbortController | null = null;

  return async (query: string): Promise<T> => {
    // 이전 요청 취소
    if (currentController) {
      currentController.abort();
    }

    // 새로운 컨트롤러 생성
    currentController = new AbortController();
    const signal = currentController.signal;

    // 디바운스 적용
    const debouncedFn = debounce(
      async (q: string) => {
        if (signal.aborted) {
          throw new Error("Request cancelled");
        }
        return await searchFn(q);
      },
      delay,
      `search_${query}`
    );

    try {
      const result = await debouncedFn(query);
      currentController = null;
      return result;
    } catch (error) {
      if (currentController) {
        currentController = null;
      }
      throw error;
    }
  };
}

/**
 * 자동 재시도 기능이 있는 요청
 */
export async function retryableRequest<T>(
  requestFn: (signal: AbortSignal) => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    retryCondition?: (error: unknown) => boolean;
    key?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryCondition = () => true,
    key = `retry_${Date.now()}_${Math.random()}`,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 중복 방지 적용
      return await RequestDeduplicator.deduplicate(
        `${key}_attempt_${attempt}`,
        (signal) => requestFn(signal)
      );
    } catch (error) {
      lastError = error;

      // 마지막 시도이거나 재시도 조건을 만족하지 않으면 에러 throw
      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }

      // 재시도 전 지연
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay * Math.pow(2, attempt))
      );
      console.debug(`Retrying request (${attempt + 1}/${maxRetries}): ${key}`);
    }
  }

  throw lastError;
}

/**
 * 정리 함수 (앱 종료 시 호출)
 */
export function cleanup(): void {
  // 모든 요청 취소
  RequestDeduplicator.cancelAllRequests();

  // 디바운스 타이머 정리
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();

  // 스로틀링 상태 정리
  throttleState.clear();

  console.debug("Request deduplicator cleanup completed");
}
