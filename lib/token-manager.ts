import ky from "ky";

import { API_CONFIG, API_ENDPOINTS } from "@/lib/constants";
import type { AuthResponse } from "@/types/auth";

/**
 * 간단한 토큰 암호화/복호화 (기본 보안)
 */
class TokenCrypto {
  private static readonly key = "your-app-secret-key-2024"; // production에서는 환경변수로 관리

  static encrypt(text: string): string {
    try {
      // 간단한 Base64 인코딩 (실제로는 더 강력한 암호화 사용 권장)
      const encoded = btoa(encodeURIComponent(text + "|" + Date.now()));
      return encoded;
    } catch {
      return text;
    }
  }

  static decrypt(encryptedText: string): string | null {
    try {
      const decoded = decodeURIComponent(atob(encryptedText));
      const [text] = decoded.split("|");
      return text;
    } catch {
      return null;
    }
  }
}

/**
 * 보안 강화된 토큰 관리 클래스
 */
export class TokenManager {
  private static instance: TokenManager;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

  // 보안 설정
  private readonly useSessionStorage: boolean;
  private readonly encryptTokens: boolean;

  constructor() {
    // production 환경에서는 sessionStorage와 암호화 사용
    this.useSessionStorage = process.env.NODE_ENV === "production";
    this.encryptTokens = process.env.NODE_ENV === "production";
  }

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  private getStorage(): Storage {
    if (typeof window === "undefined") return {} as Storage;
    return this.useSessionStorage ? sessionStorage : localStorage;
  }

  private setSecureItem(key: string, value: string): void {
    if (typeof window === "undefined") return;

    try {
      const storage = this.getStorage();
      const finalValue = this.encryptTokens
        ? TokenCrypto.encrypt(value)
        : value;
      storage.setItem(key, finalValue);
    } catch (error) {
      console.warn("Failed to store token securely:", error);
    }
  }

  private getSecureItem(key: string): string | null {
    if (typeof window === "undefined") return null;

    try {
      const storage = this.getStorage();
      const storedValue = storage.getItem(key);
      if (!storedValue) return null;

      return this.encryptTokens
        ? TokenCrypto.decrypt(storedValue)
        : storedValue;
    } catch (error) {
      console.warn("Failed to retrieve token securely:", error);
      return null;
    }
  }

  private removeSecureItem(key: string): void {
    if (typeof window === "undefined") return;

    try {
      const storage = this.getStorage();
      storage.removeItem(key);
    } catch (error) {
      console.warn("Failed to remove token securely:", error);
    }
  }

  // 토큰 설정
  setTokens(accessToken: string, refreshToken?: string): void {
    this.accessToken = accessToken;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }

    // 보안 강화된 저장
    this.setSecureItem("accessToken", accessToken);
    if (refreshToken) {
      this.setSecureItem("refreshToken", refreshToken);
    }

    // 토큰 만료 시간 저장 (JWT는 보통 1시간, 여유분 5분을 빼고 55분으로 설정)
    const expiryTime = Date.now() + 55 * 60 * 1000;
    this.setSecureItem("tokenExpiry", expiryTime.toString());
  }

  // 토큰 가져오기
  getAccessToken(): string | null {
    if (this.accessToken) {
      return this.accessToken;
    }

    // 보안 강화된 복원
    this.accessToken = this.getSecureItem("accessToken");
    this.refreshToken = this.getSecureItem("refreshToken");
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    if (this.refreshToken) {
      return this.refreshToken;
    }

    this.refreshToken = this.getSecureItem("refreshToken");
    return this.refreshToken;
  }

  // 토큰 제거
  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;

    // 보안 강화된 제거
    this.removeSecureItem("accessToken");
    this.removeSecureItem("refreshToken");
    this.removeSecureItem("tokenExpiry");
  }

  // 토큰 만료 체크
  isTokenExpired(): boolean {
    const expiryTime = this.getSecureItem("tokenExpiry");
    if (!expiryTime) {
      return true; // 만료 시간이 없으면 만료된 것으로 간주
    }

    return Date.now() >= parseInt(expiryTime);
  }

  // 토큰 만료가 임박했는지 체크 (5분 이내)
  isTokenExpiringSoon(): boolean {
    const expiryTime = this.getSecureItem("tokenExpiry");
    if (!expiryTime) {
      return true;
    }

    const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
    return fiveMinutesFromNow >= parseInt(expiryTime);
  }

  // 토큰 갱신
  async refreshAccessToken(): Promise<string> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh(refreshToken);

    try {
      const newAccessToken = await this.refreshPromise;
      this.isRefreshing = false;
      this.refreshPromise = null;
      return newAccessToken;
    } catch (error) {
      this.isRefreshing = false;
      this.refreshPromise = null;
      this.clearTokens();
      throw error;
    }
  }

  private async performTokenRefresh(refreshToken: string): Promise<string> {
    try {
      const response = await ky
        .post(
          `${API_CONFIG.BASE_URL}/${API_CONFIG.PREFIX}/${API_CONFIG.VERSION}/${API_ENDPOINTS.AUTH.REFRESH}`,
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
            timeout: 10000,
          }
        )
        .json<AuthResponse>();

      this.setTokens(response.accessToken, response.refreshToken);

      // Zustand store의 토큰도 업데이트
      if (typeof window !== "undefined") {
        try {
          const { useAuthStore } = await import("@/store/auth-store");
          const { setTokens } = useAuthStore.getState();
          setTokens(response.accessToken, response.refreshToken);
        } catch (error) {
          console.error("Failed to update auth store tokens:", error);
        }
      }

      return response.accessToken;
    } catch (error) {
      console.error("Token refresh failed:", error);
      throw new Error("Token refresh failed");
    }
  }

  // 보안 상태 검증
  validateSecurityState(): boolean {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    // 토큰이 있지만 만료된 경우
    if (accessToken && this.isTokenExpired()) {
      console.warn("Access token is expired");
      return false;
    }

    // refresh token이 없는 경우
    if (accessToken && !refreshToken) {
      console.warn("Missing refresh token");
      return false;
    }

    return true;
  }
}

/**
 * 401 Unauthorized 에러 처리
 */
export async function handleUnauthorizedError(): Promise<void> {
  const tokenManager = TokenManager.getInstance();

  // 토큰 제거
  tokenManager.clearTokens();

  // Zustand store의 인증 상태 초기화
  if (typeof window !== "undefined") {
    try {
      const { useAuthStore } = await import("@/store/auth-store");
      const { logout } = useAuthStore.getState();
      logout();
    } catch (error) {
      console.error("Failed to clear auth state:", error);
    }

    // 로그인 페이지로 리디렉션 (현재 페이지가 로그인 관련 페이지가 아닌 경우만)
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath.startsWith("/auth/") || currentPath === "/";

    if (!isAuthPage) {
      setTimeout(() => {
        window.location.href = "/auth/signin";
      }, 1000); // 토스트 메시지를 보여줄 시간 확보
    }
  }
}

// 토큰 관리자 인스턴스 export
export const tokenManager = TokenManager.getInstance();
