/**
 * Auth Context
 * 集中管理所有认证方式的初始化（Google、Apple、Email等）
 * 确保认证相关的 hooks 只在应用根部初始化一次，避免重复初始化
 */

import { createContext, useContext, ReactNode, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import appleAuth from '@invertase/react-native-apple-authentication';
import { OAUTH_CONFIG } from '../config/oauth';

type GoogleAuthHandler = (accessToken: string) => void | Promise<void>;
type AppleAuthHandler = (identityToken: string) => void | Promise<void>;

// AuthSessionResult 类型定义（兼容原有接口）
type AuthSessionResult = {
  type: 'success' | 'cancel' | 'dismiss' | 'error';
  authentication?: {
    accessToken: string;
  };
  error?: any;
};

interface AuthContextType {
  // Google 登录
  googleRequest: any | null;
  googleResponse: AuthSessionResult | null;
  googlePromptAsync: () => Promise<AuthSessionResult>;
  registerGoogleAuthHandler: (handler: GoogleAuthHandler) => void;
  
  // Apple 登录
  appleResponse: AuthSessionResult | null;
  applePromptAsync: () => Promise<AuthSessionResult>;
  registerAppleAuthHandler: (handler: AppleAuthHandler) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [googleResponse, setGoogleResponse] = useState<AuthSessionResult | null>(null);
  const [appleResponse, setAppleResponse] = useState<AuthSessionResult | null>(null);

  // 初始化 Google Sign-In
  useEffect(() => {
    GoogleSignin.configure({
      iosClientId: OAUTH_CONFIG.google.iosClientId??'98810470437-blnapfvh4jorcna4c0jlrknnjtr44rpq.apps.googleusercontent.com',
      offlineAccess: false, // 不需要离线访问
    });
  }, []);

  // Google 登录函数
  const googlePromptAsync = async (): Promise<AuthSessionResult> => {
    try {
      // 检查是否已经登录
      await GoogleSignin.hasPlayServices();
      
      // 执行登录
      const userInfo = await GoogleSignin.signIn();
      
      // 获取 access token
      const tokens = await GoogleSignin.getTokens();
      
      if (tokens.accessToken) {
        const result: AuthSessionResult = {
          type: 'success',
          authentication: {
            accessToken: tokens.accessToken,
          },
        };
        setGoogleResponse(result);
        return result;
      } else {
        throw new Error('No access token received');
      }
    } catch (error: any) {
      console.error('❌ [AuthContext] Google Sign-In error:', error);
      
      let result: AuthSessionResult;
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        result = { type: 'cancel' };
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // 操作正在进行中，等待完成
        throw new Error('Sign in is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        result = { type: 'error', error: 'Play Services not available' };
      } else {
        result = { type: 'error', error };
      }
      
      setGoogleResponse(result);
      return result;
    }
  };

  // 使用 ref 存储 Google 登录处理函数，确保只调用一次
  const googleAuthHandlerRef = useRef<GoogleAuthHandler | null>(null);

  // 注册 Google 登录处理函数
  const registerGoogleAuthHandler = (handler: GoogleAuthHandler) => {
    googleAuthHandlerRef.current = handler;
  };

  // Apple 登录函数
  const applePromptAsync = async (): Promise<AuthSessionResult> => {
    try {
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign In is only available on iOS');
      }

      // 检查 Apple 登录是否可用
      if (!appleAuth.isSupported) {
        throw new Error('Apple Sign In is not available on this device');
      }

      // 执行 Apple 登录
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      // 检查凭证状态
      const credentialState = await appleAuth.getCredentialStateForUser(appleAuthRequestResponse.user);
      
      if (credentialState === appleAuth.State.AUTHORIZED) {
        // 后端登录接口 /api/v1/auth/login 期望的是 apple_code（即 authorization code），
        // 而不是 identityToken；否则会在换取 token 时出现 invalid_grant。
        if (appleAuthRequestResponse.authorizationCode) {
          const result: AuthSessionResult = {
            type: 'success',
            authentication: {
              // 这里沿用 accessToken 字段名，但实际传递的是 authorizationCode，
              // 下游会将其作为 apple_code 发给后端。
              accessToken: appleAuthRequestResponse.authorizationCode,
            },
          };
          setAppleResponse(result);
          return result;
        } else {
          throw new Error('No identity token received from Apple');
        }
      } else {
        throw new Error('Apple Sign In authorization failed');
      }
    } catch (error: any) {
      console.error('❌ [AuthContext] Apple Sign-In error:', error);
      
      let result: AuthSessionResult;
      // 检查是否是用户取消的错误
      if (error.code === appleAuth.Error.CANCELED || error.code === '1001') {
        result = { type: 'cancel' };
      } else {
        result = { type: 'error', error };
      }
      
      setAppleResponse(result);
      return result;
    }
  };

  // 使用 ref 存储 Apple 登录处理函数
  const appleAuthHandlerRef = useRef<AppleAuthHandler | null>(null);

  // 注册 Apple 登录处理函数
  const registerAppleAuthHandler = (handler: AppleAuthHandler) => {
    appleAuthHandlerRef.current = handler;
  };

  // 集中处理 Google 登录响应（只在这里处理一次）
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { authentication } = googleResponse;
      if (authentication?.accessToken && googleAuthHandlerRef.current) {
        console.log('🔐 [AuthContext] Google OAuth success, calling registered handler');
        googleAuthHandlerRef.current(authentication.accessToken);
      }
    }
  }, [googleResponse]);

  // 集中处理 Apple 登录响应（只在这里处理一次）
  useEffect(() => {
    if (appleResponse?.type === 'success') {
      const { authentication } = appleResponse;
      if (authentication?.accessToken && appleAuthHandlerRef.current) {
        console.log('🍎 [AuthContext] Apple OAuth success, calling registered handler');
        appleAuthHandlerRef.current(authentication.accessToken);
      }
    }
  }, [appleResponse]);

  const value: AuthContextType = {
    googleRequest: null, // 不再需要 request 对象
    googleResponse,
    googlePromptAsync,
    registerGoogleAuthHandler,
    appleResponse,
    applePromptAsync,
    registerAppleAuthHandler,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}

