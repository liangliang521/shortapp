/**
 * 认证状态管理 - 使用 Zustand
 * 全局状态管理，自动处理重渲染
 */

import { create } from 'zustand';
import { authService, AuthState, LoginType } from '../services/authService';
import { OAUTH_CONFIG, validateOAuthConfig } from '../config/oauth';

interface AuthStore {
    // 状态
    authState: AuthState;
    isLoading: boolean;
    isGoogleLoading: boolean;
    isAppleLoading: boolean;
    error: string | null;
    initialized: boolean;

    // 初始化
    initialize: () => Promise<void>;

    // 登录方法
    loginWithGoogle: (googleAccessToken: string) => Promise<void>;
    loginWithApple: (appleToken: string) => Promise<void>;
    loginWithEmail: (email: string, password: string) => Promise<void>;

    // 登出
    logout: () => Promise<void>;

    // 刷新token
    refreshToken: () => Promise<void>;

    // 刷新用户信息
    refreshUserProfile: () => Promise<void>;

    // 设置loading状态
    setIsGoogleLoading: (loading: boolean) => void;
    setIsAppleLoading: (loading: boolean) => void;

    // 清除错误
    clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
    // 初始状态
    authState: {
        isAuthenticated: false,
        accessToken: null,
        user: null,
        loginType: null,
    },
    isLoading: true,
    isGoogleLoading: false,
    isAppleLoading: false,
    error: null,
    initialized: false,

    // 初始化
    initialize: async () => {
        const { initialized } = get();
        if (initialized) {
            console.log('🔄 [AuthStore] Already initialized, skipping');
            return;
        }

        try {
            console.log('🔄 [AuthStore] Starting initialization');
            set({ isLoading: true });

            validateOAuthConfig();
            const state = await authService.initialize();

            console.log('🔄 [AuthStore] Got state from authService.initialize:', state);
            set({
                authState: state,
                initialized: true,
                isLoading: false
            });
        } catch (err) {
            console.error('❌ [AuthStore] Initialization failed:', err);
            set({
                error: err instanceof Error ? err.message : 'Initialization failed',
                isLoading: false
            });
        }
    },

    // Google登录
    loginWithGoogle: async (googleAccessToken: string) => {
        try {
            console.log('🔐 [AuthStore] Starting Google login');
            set({ error: null, isGoogleLoading: true });

            const state = await authService.loginWithGoogle(googleAccessToken);
            console.log('✅ [AuthStore] Google login successful:', state);

            set({
                authState: state,
                isGoogleLoading: false
            });
        } catch (err) {
            console.error('❌ [AuthStore] Google login failed:', err);
            set({
                error: err instanceof Error ? err.message : 'Google login failed',
                isGoogleLoading: false
            });
            throw err;
        }
    },

    // Apple登录
    loginWithApple: async (appleToken: string) => {
        try {
            console.log('🍎 [AuthStore] Starting Apple login');
            set({ error: null, isAppleLoading: true });

            const state = await authService.loginWithApple(appleToken);
            console.log('✅ [AuthStore] Apple login successful:', state);

            set({
                authState: state,
                isAppleLoading: false
            });
        } catch (err) {
            console.error('❌ [AuthStore] Apple login failed:', err);
            set({
                error: err instanceof Error ? err.message : 'Apple login failed',
                isAppleLoading: false
            });
            throw err;
        }
    },

    // 邮箱登录（审核使用）
    loginWithEmail: async (email: string, password: string) => {
        try {
            console.log('🔐 [AuthStore] Starting email login');
            set({ error: null, isLoading: true });

            const state = await authService.loginWithEmail(email, password);
            console.log('✅ [AuthStore] Email login successful:', state);

            set({
                authState: state,
                isLoading: false
            });
        } catch (err) {
            console.error('❌ [AuthStore] Email login failed:', err);
            set({
                error: err instanceof Error ? err.message : 'Email login failed',
                isLoading: false
            });
            throw err;
        }
    },

    // 登出
    logout: async () => {
        try {
            console.log('🚪 [AuthStore] Starting logout');
            set({ error: null, isLoading: true });

            await authService.logout();
            const newState = authService.getState();

            console.log('✅ [AuthStore] Logout successful:', newState);
            set({
                authState: newState,
                isLoading: false
            });
        } catch (err) {
            console.error('❌ [AuthStore] Logout failed:', err);
            set({
                error: err instanceof Error ? err.message : 'Logout failed',
                isLoading: false
            });
            throw err;
        }
    },

    // 刷新token
    refreshToken: async () => {
        try {
            console.log('🔄 [AuthStore] Refreshing token');
            set({ error: null });

            await authService.refreshToken();
            const newState = authService.getState();

            console.log('✅ [AuthStore] Token refresh successful:', newState);
            set({ authState: newState });
        } catch (err) {
            console.error('❌ [AuthStore] Token refresh failed:', err);
            set({ error: err instanceof Error ? err.message : 'Token refresh failed' });
            throw err;
        }
    },

    // 刷新用户信息
    refreshUserProfile: async () => {
        try {
            console.log('🔄 [AuthStore] Refreshing user profile');
            set({ error: null });

            const newState = await authService.refreshUserProfile();

            console.log('✅ [AuthStore] User profile refresh successful:', newState.user);
            set({ authState: newState });
        } catch (err) {
            console.error('❌ [AuthStore] User profile refresh failed:', err);
            set({ error: err instanceof Error ? err.message : 'User profile refresh failed' });
            throw err;
        }
    },

    // 设置loading状态
    setIsGoogleLoading: (loading: boolean) => {
        set({ isGoogleLoading: loading });
    },

    setIsAppleLoading: (loading: boolean) => {
        set({ isAppleLoading: loading });
    },

    // 清除错误
    clearError: () => {
        set({ error: null });
    },
}));
// 导出便捷的hooks
export const useAuthStoreData = () => {
    const store = useAuthStore();
    return {
        // 状态
        isAuthenticated: store.authState.isAuthenticated,
        user: store.authState.user,
        accessToken: store.authState.accessToken,
        loginType: store.authState.loginType,
        isLoading: store.isLoading,
        isGoogleLoading: store.isGoogleLoading,
        isAppleLoading: store.isAppleLoading,
        error: store.error,

        // 方法
        initialize: store.initialize,
        loginWithGoogle: store.loginWithGoogle,
        loginWithApple: store.loginWithApple,
        loginWithEmail: store.loginWithEmail,
        logout: store.logout,
        refreshToken: store.refreshToken,
        refreshUserProfile: store.refreshUserProfile,
        setIsGoogleLoading: store.setIsGoogleLoading,
        setIsAppleLoading: store.setIsAppleLoading,
        clearError: store.clearError,
    };
};

