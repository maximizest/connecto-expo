import { HTTPError } from "ky";
import { useCallback } from "react";
import { useToast } from "react-native-toast-notifications";

import { ERROR_MESSAGES, HTTP_STATUS } from "@/lib/constants";
import { handleUnauthorizedError } from "@/lib/token-manager";

/**
 * 에러 타입 정의
 */
export enum ErrorType {
  NETWORK_ERROR = "NETWORK_ERROR",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND_ERROR = "NOT_FOUND_ERROR",
  CONFLICT_ERROR = "CONFLICT_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * 구조화된 에러 정보
 */
export interface StructuredError {
  type: ErrorType;
  status?: number;
  message: string;
  details?: Record<string, unknown>;
  originalError?: unknown;
}

/**
 * 에러 처리 옵션
 */
export interface ErrorHandlingOptions {
  showToast?: boolean;
  logError?: boolean;
  customHandler?: (error: StructuredError) => void;
  silent?: boolean;
  toastInstance?: any;
}

/**
 * 에러 분류기
 */
export class ErrorClassifier {
  static classify(error: unknown): StructuredError {
    // HTTP 에러 처리
    if (error && typeof error === "object" && "response" in error) {
      const httpError = error as HTTPError;
      const status = httpError.response.status;

      return {
        type: this.getErrorTypeByStatus(status),
        status,
        message: httpError.message,
        originalError: error,
      };
    }

    // 네트워크 에러 처리
    if (error instanceof Error) {
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        return {
          type: ErrorType.NETWORK_ERROR,
          message: ERROR_MESSAGES.NETWORK_ERROR,
          originalError: error,
        };
      }

      return {
        type: ErrorType.UNKNOWN_ERROR,
        message: error.message || ERROR_MESSAGES.NETWORK_ERROR,
        originalError: error,
      };
    }

    // 기타 에러
    return {
      type: ErrorType.UNKNOWN_ERROR,
      message: typeof error === "string" ? error : ERROR_MESSAGES.NETWORK_ERROR,
      originalError: error,
    };
  }

  private static getErrorTypeByStatus(status: number): ErrorType {
    switch (status) {
      case HTTP_STATUS.UNAUTHORIZED:
        return ErrorType.AUTHENTICATION_ERROR;
      case HTTP_STATUS.FORBIDDEN:
        return ErrorType.AUTHORIZATION_ERROR;
      case HTTP_STATUS.NOT_FOUND:
        return ErrorType.NOT_FOUND_ERROR;
      case HTTP_STATUS.CONFLICT:
        return ErrorType.CONFLICT_ERROR;
      case HTTP_STATUS.UNPROCESSABLE_ENTITY:
        return ErrorType.VALIDATION_ERROR;
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
        return ErrorType.SERVER_ERROR;
      default:
        if (status >= 400 && status < 500) {
          return ErrorType.VALIDATION_ERROR;
        }
        if (status >= 500) {
          return ErrorType.SERVER_ERROR;
        }
        return ErrorType.UNKNOWN_ERROR;
    }
  }
}

/**
 * 에러 핸들러
 */
export class ErrorHandler {
  private static handlers: Map<
    ErrorType,
    (error: StructuredError) => Promise<void>
  > = new Map([
    [ErrorType.AUTHENTICATION_ERROR, this.handleAuthenticationError],
    [ErrorType.AUTHORIZATION_ERROR, this.handleAuthorizationError],
    [ErrorType.VALIDATION_ERROR, this.handleValidationError],
    [ErrorType.NOT_FOUND_ERROR, this.handleNotFoundError],
    [ErrorType.CONFLICT_ERROR, this.handleConflictError],
    [ErrorType.SERVER_ERROR, this.handleServerError],
    [ErrorType.NETWORK_ERROR, this.handleNetworkError],
    [ErrorType.UNKNOWN_ERROR, this.handleUnknownError],
  ]);

  static async handle(
    error: unknown,
    options: ErrorHandlingOptions = {}
  ): Promise<StructuredError> {
    const structuredError = ErrorClassifier.classify(error);

    // 로깅
    if (options.logError !== false) {
      this.logError(structuredError);
    }

    // 커스텀 핸들러 실행
    if (options.customHandler) {
      try {
        options.customHandler(structuredError);
      } catch (handlerError) {
        console.error("Custom error handler failed:", handlerError);
      }
    }

    // 기본 핸들러 실행
    if (!options.silent) {
      const handler =
        this.handlers.get(structuredError.type) || this.handleUnknownError;
      await handler(structuredError);
    }

    // 토스트 표시
    if (options.showToast !== false && !options.silent) {
      this.showErrorToast(structuredError, options.toastInstance);
    }

    return structuredError;
  }

  private static async handleAuthenticationError(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    error: StructuredError
  ): Promise<void> {
    // 자동 토큰 갱신 시도 및 리디렉션
    await handleUnauthorizedError();
  }

  private static async handleAuthorizationError(
    error: StructuredError
  ): Promise<void> {
    // 권한 부족 처리 (리디렉션 없음)
    console.warn("Authorization failed:", error);
  }

  private static async handleValidationError(
    error: StructuredError
  ): Promise<void> {
    // 유효성 검사 에러 처리
    console.warn("Validation error:", error);
  }

  private static async handleNotFoundError(
    error: StructuredError
  ): Promise<void> {
    // 404 에러 처리
    console.warn("Resource not found:", error);
  }

  private static async handleConflictError(
    error: StructuredError
  ): Promise<void> {
    // 충돌 에러 처리 (중복 데이터 등)
    console.warn("Resource conflict:", error);
  }

  private static async handleServerError(
    error: StructuredError
  ): Promise<void> {
    // 서버 에러 처리
    console.error("Server error:", error);
  }

  private static async handleNetworkError(
    error: StructuredError
  ): Promise<void> {
    // 네트워크 에러 처리
    console.error("Network error:", error);
  }

  private static async handleUnknownError(
    error: StructuredError
  ): Promise<void> {
    // 알 수 없는 에러 처리
    console.error("Unknown error:", error);
  }

  private static showErrorToast(
    error: StructuredError,
    toastInstance?: any
  ): void {
    const messageMap: Record<ErrorType, string> = {
      [ErrorType.AUTHENTICATION_ERROR]: ERROR_MESSAGES.UNAUTHORIZED,
      [ErrorType.AUTHORIZATION_ERROR]: ERROR_MESSAGES.FORBIDDEN,
      [ErrorType.VALIDATION_ERROR]: ERROR_MESSAGES.VALIDATION_ERROR,
      [ErrorType.NOT_FOUND_ERROR]: ERROR_MESSAGES.NOT_FOUND,
      [ErrorType.CONFLICT_ERROR]: "이미 존재하는 데이터입니다.",
      [ErrorType.SERVER_ERROR]: ERROR_MESSAGES.SERVER_ERROR,
      [ErrorType.NETWORK_ERROR]: ERROR_MESSAGES.NETWORK_ERROR,
      [ErrorType.UNKNOWN_ERROR]: ERROR_MESSAGES.NETWORK_ERROR,
    };

    const message = messageMap[error.type] || error.message;

    // toastInstance가 제공되었을 때만 토스트 표시
    if (toastInstance) {
      toastInstance.show(message, { type: "error" });
    } else {
      console.error("Toast message:", message);
    }
  }

  private static logError(error: StructuredError): void {
    const logData = {
      type: error.type,
      status: error.status,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
      userAgent:
        typeof window !== "undefined" ? window.navigator.userAgent : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    };

    if (
      error.type === ErrorType.SERVER_ERROR ||
      error.type === ErrorType.UNKNOWN_ERROR
    ) {
      console.error("Application Error:", logData);
    } else {
      console.warn("Application Warning:", logData);
    }

    // 프로덕션 환경에서는 에러 모니터링 서비스로 전송 가능
    if (process.env.NODE_ENV === "production") {
      // Sentry, LogRocket 등으로 전송
      // sendToErrorMonitoring(logData)
    }
  }
}

/**
 * API 에러 처리 함수 (기존 호환성 유지)
 */
export function handleApiError(
  error: unknown,
  options?: ErrorHandlingOptions
): never {
  ErrorHandler.handle(error, options);
  throw error;
}

/**
 * useToast를 활용한 에러 핸들러 hook
 */
export function useErrorHandler() {
  const toast = useToast();

  const handleError = useCallback(
    async (
      error: unknown,
      options?: Omit<ErrorHandlingOptions, "toastInstance">
    ) => {
      const mergedOptions: ErrorHandlingOptions = {
        ...options,
        toastInstance: toast,
      };

      return await ErrorHandler.handle(error, mergedOptions);
    },
    [toast]
  );

  const handleApiError = useCallback(
    (
      error: unknown,
      options?: Omit<ErrorHandlingOptions, "toastInstance">
    ): never => {
      const mergedOptions: ErrorHandlingOptions = {
        ...options,
        toastInstance: toast,
      };

      ErrorHandler.handle(error, mergedOptions);
      throw error;
    },
    [toast]
  );

  return {
    handleError,
    handleApiError,
    classifyError: ErrorClassifier.classify,
  };
}
