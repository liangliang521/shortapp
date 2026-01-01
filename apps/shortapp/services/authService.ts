/**
 * 认证服务
 * 处理 Google 和 Apple 登录，管理 access token
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { httpClient, apiConfig, type User } from '@vibecoding/api-client';

// 存储键
const STORAGE_KEYS = {
    ACCESS_TOKEN: '@auth/access_token',
    USER_INFO: '@auth/user_info',
    LOGIN_TYPE: '@auth/login_type',
};

export type LoginType = 'google' | 'apple' | 'email';

export interface AuthState {
    isAuthenticated: boolean;
    accessToken: string | null;
    user: User | null;
    loginType: LoginType | null;
}

class AuthService {
    private currentState: AuthState = {
        isAuthenticated: false,
        accessToken: null,
        user: null,
        loginType: null,
    };

    /**
     * 初始化认证服务 - 从本地存储恢复登录状态
     */
    async initialize(): Promise<AuthState> {
        try {
            console.log('🔄 [AuthService] Starting initialization');
            const [accessToken, userInfo, loginType] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
                AsyncStorage.getItem(STORAGE_KEYS.USER_INFO),
                AsyncStorage.getItem(STORAGE_KEYS.LOGIN_TYPE),
            ]);

            console.log('🔄 [AuthService] AsyncStorage values:', {
                hasAccessToken: !!accessToken,
                hasUserInfo: !!userInfo,
                loginType: loginType
            });

            if (accessToken && userInfo) {
                const user = JSON.parse(userInfo);

                // 设置到 API 配置
                apiConfig.setAccessToken(accessToken);

                this.currentState = {
                    isAuthenticated: true,
                    accessToken,
                    user,
                    loginType: (loginType as LoginType | null) || null,
                };

                console.log('✅ [AuthService] 已恢复登录状态:', user.email);
            } else {
                console.log('ℹ️ [AuthService] 未找到已保存的登录状态');
                // 确保状态是未登录
                this.currentState = {
                    isAuthenticated: false,
                    accessToken: null,
                    user: null,
                    loginType: null,
                };
            }

            console.log('🔄 [AuthService] Returning state:', this.currentState);
            return this.currentState;
        } catch (error) {
            console.error('❌ [AuthService] 初始化失败:', error);
            return this.currentState;
        }
    }

    /**
     * Google 登录
     */
    async loginWithGoogle(googleAccessToken: string): Promise<AuthState> {
        try {
            console.log('🔐 [AuthService] 正在使用 Google 登录...');

            const response = await httpClient.loginWithGoogle(googleAccessToken);

            if (response.code === 0 && response.data) {
                const { user, access_token } = response.data;

                // 保存到本地存储
                await Promise.all([
                    AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token),
                    AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user)),
                    AsyncStorage.setItem(STORAGE_KEYS.LOGIN_TYPE, 'google'),
                ]);

                // 设置到 API 配置
                apiConfig.setAccessToken(access_token);

                // 更新当前状态
                this.currentState = {
                    isAuthenticated: true,
                    accessToken: access_token,
                    user,
                    loginType: 'google',
                };

                console.log('✅ [AuthService] Google 登录成功:', user.email);
                return this.currentState;
            } else {
                throw new Error(response.info || 'Login failed');
            }
        } catch (error) {
            console.error('❌ [AuthService] Google 登录失败:', error);
            throw error;
        }
    }

    /**
     * Apple 登录
     */
    async loginWithApple(appleIdToken: string): Promise<AuthState> {
        try {
            console.log('🔐 [AuthService] 正在使用 Apple 登录...');

            const response = await httpClient.loginWithApple(appleIdToken);

            if (response.code === 0 && response.data) {
                const { user, access_token } = response.data;

                // 保存到本地存储
                await Promise.all([
                    AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token),
                    AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user)),
                    AsyncStorage.setItem(STORAGE_KEYS.LOGIN_TYPE, 'apple'),
                ]);

                // 设置到 API 配置
                apiConfig.setAccessToken(access_token);

                // 更新当前状态
                this.currentState = {
                    isAuthenticated: true,
                    accessToken: access_token,
                    user,
                    loginType: 'apple',
                };

                console.log('✅ [AuthService] Apple 登录成功:', user.email || user.name);
                return this.currentState;
            } else {
                throw new Error(response.info || 'Login failed');
            }
        } catch (error) {
            console.error('❌ [AuthService] Apple 登录失败:', error);
            throw error;
        }
    }

    /**
     * 邮箱登录（审核使用）
     */
    async loginWithEmail(email: string, password: string): Promise<AuthState> {
        try {
            console.log('🔐 [AuthService] 正在使用邮箱登录...');
            console.log('🔐 [AuthService] Email:', email);

            const response = await httpClient.loginWithEmail(email, password);

            if (response.code === 0 && response.data) {
                const { user, access_token } = response.data;

                // 保存到本地存储
                await Promise.all([
                    AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token),
                    AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user)),
                    AsyncStorage.setItem(STORAGE_KEYS.LOGIN_TYPE, 'email'),
                ]);

                // 设置到 API 配置
                apiConfig.setAccessToken(access_token);

                // 更新当前状态
                this.currentState = {
                    isAuthenticated: true,
                    accessToken: access_token,
                    user,
                    loginType: 'google', // 使用 google 类型（避免修改太多代码）
                };

                console.log('✅ [AuthService] 邮箱登录成功:', user.email);
                return this.currentState;
            } else {
                throw new Error(response.info || '邮箱登录失败');
            }

        } catch (error) {
            console.error('❌ [AuthService] 邮箱登录失败:', error);
            throw error;
        }
    }

    /**
     * 刷新 Token
     */
    async refreshToken(): Promise<string> {
        try {
            console.log('🔄 [AuthService] 正在刷新 Token...');

            const response = await httpClient.refreshToken();

            if (response.code === 0 && response.data) {
                const { access_token } = response.data;

                // 保存新的 token
                await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);

                // 设置到 API 配置
                apiConfig.setAccessToken(access_token);

                // 更新当前状态
                this.currentState.accessToken = access_token;

                console.log('✅ [AuthService] Token 刷新成功');
                return access_token;
            } else {
                throw new Error(response.info || 'Token refresh failed');
            }
        } catch (error) {
            console.error('❌ [AuthService] Token 刷新失败:', error);
            // 刷新失败可能是 refresh token 也过期了，清除本地状态
            // httpClient 已经清除了内存中的 token，这里清除本地存储
            await this.logout();
            throw error;
        }
    }

    /**
     * 刷新用户信息
     */
    async refreshUserProfile(): Promise<AuthState> {
        try {
            console.log('🔄 [AuthService] 正在刷新用户信息...');

            const response = await httpClient.getUserProfile();

            if (response.code === 0 && response.data) {
                const user = response.data;

                // 保存用户信息
                await AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));

                // 更新当前状态
                this.currentState.user = user;

                console.log('✅ [AuthService] 用户信息刷新成功:', {
                    email: user.email,
                    sub_status: user.sub_status,
                    pkg_code: user.pkg_code,
                });

                return this.currentState;
            } else {
                throw new Error(response.info || '用户信息刷新失败');
            }
        } catch (error) {
            console.error('❌ [AuthService] 用户信息刷新失败:', error);
            throw error;
        }
    }

    /**
     * 登出
     */
    async logout(): Promise<void> {
        try {
            console.log('🚪 [AuthService] 正在登出...');

            // 调用登出 API（可选）
            try {
                await httpClient.logout();
            } catch (error) {
                console.warn('⚠️ [AuthService] 登出 API 调用失败（忽略）:', error);
            }

            // 清除本地存储
            await Promise.all([
                AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
                AsyncStorage.removeItem(STORAGE_KEYS.USER_INFO),
                AsyncStorage.removeItem(STORAGE_KEYS.LOGIN_TYPE),
            ]);

            // 清除 API 配置
            apiConfig.setAccessToken(null);

            // 重置当前状态
            this.currentState = {
                isAuthenticated: false,
                accessToken: null,
                user: null,
                loginType: null,
            };

            console.log('✅ [AuthService] 登出成功');
        } catch (error) {
            console.error('❌ [AuthService] 登出失败:', error);
            throw error;
        }
    }

    /**
     * 获取当前认证状态
     */
    getState(): AuthState {
        return { ...this.currentState };
    }

    /**
     * 检查是否已登录
     */
    isAuthenticated(): boolean {
        return this.currentState.isAuthenticated;
    }

    /**
     * 获取访问令牌
     */
    getAccessToken(): string | null {
        return this.currentState.accessToken;
    }

    /**
     * 获取用户信息
     */
    getUser(): User | null {
        return this.currentState.user;
    }
}

// 导出单例实例
export const authService = new AuthService();


