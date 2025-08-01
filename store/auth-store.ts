import React from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { tokenManager } from "@/lib/token-manager";
import type { AuthResponse } from "@/types/auth";
import type { AuthStore } from "@/types/store";
import type { User } from "@/types/user/crud-user";

/**
 * 인증 상태 관리 스토어
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // 상태 초기값
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      // 로그인 액션
      login: (response: AuthResponse) => {
        const { accessToken, refreshToken, user } = response;

        // 토큰 매니저에 토큰 설정
        tokenManager.setTokens(accessToken, refreshToken);

        // 스토어 상태 업데이트
        set({
          user: user || null,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      // 로그아웃 액션
      logout: () => {
        // 토큰 매니저에서 토큰 제거
        tokenManager.clearTokens();

        // 스토어 상태 초기화
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      // 사용자 정보 업데이트 액션
      updateUser: (updatedUser: Partial<User>) => {
        const currentUser = get().user;
        if (!currentUser) return;

        set({
          user: {
            ...currentUser,
            ...updatedUser,
          },
        });
      },

      // 토큰 설정 액션
      setTokens: (accessToken: string, refreshToken?: string) => {
        // 토큰 매니저에 토큰 설정
        tokenManager.setTokens(accessToken, refreshToken);

        // 스토어 상태 업데이트
        set((state) => ({
          accessToken,
          refreshToken: refreshToken || state.refreshToken,
          isAuthenticated: true,
        }));
      },
    }),
    {
      name: "auth-storage", // localStorage 키
      storage: createJSONStorage(() => localStorage),
      // 민감한 토큰 정보는 저장하지 않고 tokenManager에서 관리
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // 스토어 복원 시 토큰 복원
      onRehydrateStorage: () => (state) => {
        if (state) {
          const accessToken = tokenManager.getAccessToken();
          const refreshToken = tokenManager.getRefreshToken();

          if (accessToken && refreshToken) {
            state.accessToken = accessToken;
            state.refreshToken = refreshToken;
            state.isAuthenticated = true;
          } else {
            state.isAuthenticated = false;
            state.user = null;
          }
        }
      },
    }
  )
);

/**
 * Hydration 상태 관리
 */
const useHydration = () => {
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
};

/**
 * 인증 관련 셀렉터들
 */
export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const updateUser = useAuthStore((state) => state.updateUser);
  const setTokens = useAuthStore((state) => state.setTokens);
  const hydrated = useHydration();

  return {
    user,
    isAuthenticated: hydrated ? isAuthenticated : false,
    login,
    logout,
    updateUser,
    setTokens,
    hydrated,
    userId: user?.id,
    userEmail: user?.email,
    userName: user?.name,
  };
};

/**
 * 사용자 권한 확인 훅
 */
export const usePermissions = () => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return {
    // 인증된 사용자인지 확인
    canAccess: isAuthenticated,

    // 사용자 본인 데이터 접근 권한 확인
    canEditProfile: (targetUserId?: string) => {
      if (!isAuthenticated || !user) return false;
    },

    // 소셜 로그인 사용자인지 확인
    isSocialUser: user?.provider !== "local",

    // 활성 사용자인지 확인
    isActiveUser: true,
  };
};
