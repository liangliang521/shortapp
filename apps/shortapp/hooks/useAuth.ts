/**
 * 认证 Hook - 使用 Zustand 全局状态管理
 * 自动处理状态同步和重渲染
 */

import { useEffect, useCallback } from 'react';
// import * as AppleAuthentication from 'expo-apple-authentication'; // TODO: Replace with react-native-apple-authentication or similar
import { Platform } from 'react-native';
import { trackLogin } from '@vibecoding/analytics';
import { OAUTH_CONFIG } from '../config/oauth';
import { useAuthStoreData } from '../stores/authStore';
import { useAuthContext } from '../contexts/AuthContext';

export function useAuth() {
    // 从全局store获取状态和方法
    const {
        isAuthenticated,
        user,
        accessToken,
        loginType,
        isLoading,
        isGoogleLoading,
        isAppleLoading,
        error,
        initialize,
        loginWithGoogle: storeLoginWithGoogle,
        loginWithApple: storeLoginWithApple,
        logout: storeLogout,
        refreshToken,
        setIsGoogleLoading,
        setIsAppleLoading,
        clearError,
    } = useAuthStoreData();

    // 使用 Auth Context（避免多次初始化）
    const { googleRequest, googleResponse, googlePromptAsync, registerGoogleAuthHandler, appleResponse, applePromptAsync, registerAppleAuthHandler } = useAuthContext();

    // 初始化认证状态
    useEffect(() => {
        initialize();
    }, [initialize]);

    /**
     * 处理 Google 登录
     */
    const handleGoogleLogin = useCallback(async (googleAccessToken: string) => {
        try {
            console.log('🔐 [useAuth] handleGoogleLogin started with token:', googleAccessToken.substring(0, 20));
            console.log('🔐 [useAuth] Calling storeLoginWithGoogle...');
            await storeLoginWithGoogle(googleAccessToken);
            console.log('✅ [useAuth] storeLoginWithGoogle completed successfully');
            trackLogin('google', true);
        } catch (err) {
            console.error('❌ [useAuth] handleGoogleLogin error:', err);
            throw err;
        } finally {
            console.log('🔐 [useAuth] handleGoogleLogin finished, resetting loading state');
            setIsGoogleLoading(false);
        }
    }, [storeLoginWithGoogle, setIsGoogleLoading]);

    // 注册 Google 登录处理函数（只注册一次）
    useEffect(() => {
        registerGoogleAuthHandler(handleGoogleLogin);
    }, [registerGoogleAuthHandler, handleGoogleLogin]);

    // 处理 Google 登录响应的其他情况（取消、错误）
    useEffect(() => {
        if (googleResponse) {
            if (googleResponse.type === 'cancel' || googleResponse.type === 'dismiss') {
                // 用户取消或关闭弹窗时重置loading状态
                console.log('⚠️ [useAuth] Google login cancelled/dismissed');
                setIsGoogleLoading(false);
            } else if (googleResponse.type === 'error') {
                // 登录错误时重置loading状态
                console.log('❌ [useAuth] Google login error:', googleResponse.error);
                setIsGoogleLoading(false);
                clearError();
            }
        }
    }, [googleResponse, setIsGoogleLoading, clearError]);

    /**
     * Google 登录
     */
    const loginWithGoogle = useCallback(async () => {
        try {
            console.log('🔐 [useAuth] loginWithGoogle button clicked');
            clearError();
            setIsGoogleLoading(true);
            console.log('🔐 [useAuth] Calling googlePromptAsync...');
            const result = await googlePromptAsync();
            console.log('🔐 [useAuth] googlePromptAsync result:', result.type);
            return result;
        } catch (err) {
            console.error('❌ [useAuth] loginWithGoogle Error:', err);
            clearError();
            setIsGoogleLoading(false);
            throw err;
        } finally {
            console.log('🔐 [useAuth] loginWithGoogle finally block');
            setIsGoogleLoading(false);
        }
    }, [googlePromptAsync, setIsGoogleLoading, clearError]);

    /**
     * 处理 Apple 登录
     */
    const handleAppleLogin = useCallback(async (appleIdentityToken: string) => {
        try {
            console.log('🍎 [useAuth] handleAppleLogin started with token:', appleIdentityToken.substring(0, 20));
            console.log('🍎 [useAuth] Calling storeLoginWithApple...');
            await storeLoginWithApple(appleIdentityToken);
            console.log('✅ [useAuth] storeLoginWithApple completed successfully');
            trackLogin('apple', true);
        } catch (err) {
            console.error('❌ [useAuth] handleAppleLogin error:', err);
            throw err;
        } finally {
            console.log('🍎 [useAuth] handleAppleLogin finished, resetting loading state');
            setIsAppleLoading(false);
        }
    }, [storeLoginWithApple, setIsAppleLoading]);

    // 注册 Apple 登录处理函数（只注册一次）
    useEffect(() => {
        registerAppleAuthHandler(handleAppleLogin);
    }, [registerAppleAuthHandler, handleAppleLogin]);

    // 处理 Apple 登录响应的其他情况（取消、错误）
    useEffect(() => {
        if (appleResponse) {
            if (appleResponse.type === 'cancel' || appleResponse.type === 'dismiss') {
                // 用户取消或关闭弹窗时重置loading状态
                console.log('⚠️ [useAuth] Apple login cancelled/dismissed');
                setIsAppleLoading(false);
            } else if (appleResponse.type === 'error') {
                // 登录错误时重置loading状态
                console.log('❌ [useAuth] Apple login error:', appleResponse.error);
                setIsAppleLoading(false);
                clearError();
            }
        }
    }, [appleResponse, setIsAppleLoading, clearError]);

    /**
     * Apple 登录
     */
    const loginWithApple = useCallback(async () => {
        try {
            console.log('🍎 [useAuth] loginWithApple button clicked');
            clearError();
            setIsAppleLoading(true);
            console.log('🍎 [useAuth] Calling applePromptAsync...');
            const result = await applePromptAsync();
            console.log('🍎 [useAuth] applePromptAsync result:', result.type);
            return result;
        } catch (err) {
            console.error('❌ [useAuth] loginWithApple Error:', err);
            clearError();
            setIsAppleLoading(false);
            throw err;
        } finally {
            console.log('🍎 [useAuth] loginWithApple finally block');
            setIsAppleLoading(false);
        }
    }, [applePromptAsync, setIsAppleLoading, clearError]);

    /**
     * 登出
     */
    const logout = useCallback(async () => {
        try {
            await storeLogout();
        } catch (err) {
            throw err;
        }
    }, [storeLogout]);

    return {
        // 状态
        isAuthenticated,
        user,
        accessToken,
        loginType,
        isLoading,
        isGoogleLoading,
        isAppleLoading,
        error,

        // 方法
        loginWithGoogle,
        loginWithApple,
        logout,
        refreshToken,
        clearError,
    };
}