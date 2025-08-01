/**
 * 인증 관련 타입 정의
 */

import type { User } from "@/types/user/crud-user";

// 로그인 요청 타입
export interface LoginRequest {
  email: string;
  password: string;
}

// 회원가입 요청 타입
export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

// 인증 응답 타입
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user?: User;
}

// 토큰 갱신 요청 타입
export interface RefreshTokenRequest {
  refreshToken: string;
}

// 소셜 로그인 제공자 타입
export type SocialProvider = "google" | "kakao" | "naver" | "apple";

// 소셜 로그인 응답 타입
export interface SocialLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  isNewUser: boolean;
}

// JWT 토큰 페이로드 타입
export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

// 토큰 상태 타입
export interface TokenStatus {
  isValid: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  expiresAt?: Date;
  timeUntilExpiry?: number;
}
