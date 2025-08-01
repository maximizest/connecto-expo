/**
 * Zustand 스토어 관련 타입 정의
 */

import type { User } from "@/types/user/crud-user";
import type { AuthResponse } from "./auth";

// 인증 스토어 타입
export interface AuthStore {
  // 상태
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // 액션
  login: (response: AuthResponse) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
}

// 권한 관련 타입
export interface PermissionState {
  canManageUsers: boolean;
  canViewAnalytics: boolean;
  canManageSystem: boolean;
  canExportData: boolean;
}

// 애플리케이션 설정 스토어 타입
export interface AppStore {
  // UI 상태
  theme: "light" | "dark" | "system";
  sidebarOpen: boolean;
  locale: string;

  // 액션
  setTheme: (theme: "light" | "dark" | "system") => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setLocale: (locale: string) => void;
}

// 알림 스토어 타입
export interface NotificationStore {
  // 상태
  notifications: Notification[];
  unreadCount: number;

  // 액션
  addNotification: (
    notification: Omit<Notification, "id" | "createdAt">
  ) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

// 알림 타입
export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  autoClose?: boolean;
  duration?: number;
}
