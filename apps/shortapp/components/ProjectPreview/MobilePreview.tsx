/**
 * MobilePreview - Mobile 项目预览组件
 * 用于显示 miniapp 类型项目的预览（使用原生子 App 加载）
 * 简化版本：只保留核心预览功能，下载过程全屏覆盖显示
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Platform,
  requireNativeComponent,
  AppState,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import SubAppLauncherService, { LoadingProgress } from '../../src/services/SubAppLauncher';
import { normalizeExpUrlToHttp } from '../../src/utils/url';
import { SubAppErrorBoundary } from './SubAppErrorBoundary';
import { ChevronBackIcon } from '../icons/SvgIcons';

// Native view component for sub-app container
const SubAppContainerView = requireNativeComponent<any>('SubAppContainerView');

export interface MobilePreviewProps {
  previewUrl: string;
  projectId: string;
  onMessage?: (data: string) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: string) => void;
  onBack?: () => void;
}

export interface MobilePreviewRef {
  refresh: () => void;
}

// TODO: 测试用固定地址，后续需要移除
const TEST_MANIFEST_URL = 'https://bc5ac454-31fa-4403-8795-55917b1f579f.shortapp.space/metadata.json';

const MobilePreview = React.forwardRef<MobilePreviewRef, MobilePreviewProps>(({
  previewUrl,
  projectId,
  onMessage,
  onLoadStart: onLoadStartProp,
  onLoadEnd: onLoadEndProp,
  onError: onErrorProp,
  onBack,
}, ref) => {
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [subAppReady, setSubAppReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef(null);
  const isMountedRef = useRef(true);

  // 是否显示下载覆盖层（加载中且未就绪时显示）
  const showLoadingOverlay = isLoading && !subAppReady;

  // 监听加载进度
  useEffect(() => {
    const unsubscribe = SubAppLauncherService.addProgressListener((progress) => {
      setLoadingProgress(progress);
      setIsLoading(progress.progress < 1.0);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 监听子 App 就绪事件
  useEffect(() => {
    console.log('[MobilePreview] Setting up onSubAppReady listener');
    const unsubscribe = SubAppLauncherService.addSubAppReadyListener(() => {
      console.log('[MobilePreview] onSubAppReady event received');
      setSubAppReady(true);
      setIsLoading(false);
      setLoadingProgress(null);
      onLoadEndProp?.();
    });

    return () => {
      unsubscribe();
    };
  }, [onLoadEndProp]);

  // 监听全局错误（捕获子 App 的未处理错误）
  useEffect(() => {
    // 设置全局错误处理器来捕获子 App 的错误
    // @ts-ignore - ErrorUtils is a global object in React Native
    const ErrorUtils = (global as any).ErrorUtils;
    if (!ErrorUtils) {
      console.warn('[MobilePreview] ErrorUtils not available');
      return;
    }
    
    const originalErrorHandler = ErrorUtils.getGlobalHandler?.();
    
    if (ErrorUtils.setGlobalHandler) {
      ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        // 检查错误是否来自子 App（通过错误堆栈和消息判断）
        const errorStack = error.stack || '';
        const errorMessage = error.message || '';
        
        // 判断是否为子 App 错误
        const isSubAppError = 
          errorStack.includes('SubApp') || 
          errorStack.includes('sub-app') ||
          errorMessage.includes('ExpoLinking') ||
          errorMessage.includes('scheme') ||
          errorMessage.includes('Cannot make a deep link') ||
          errorMessage.includes('standalone app') ||
          errorMessage.includes('no custom scheme');
        
        if (isSubAppError) {
          console.error('❌ [MobilePreview] Caught sub-app error:', error);
          
          // 生成更有价值的错误信息
          let userFriendlyMessage = '子 App 加载失败';
          if (errorMessage.includes('scheme') || errorMessage.includes('Cannot make a deep link')) {
            userFriendlyMessage = '子 App 配置错误：缺少深链接配置。这通常不影响核心功能，但深链接功能可能无法使用。';
          } else if (errorMessage.includes('ExpoLinking')) {
            userFriendlyMessage = '子 App 链接模块错误：' + errorMessage;
          } else {
            userFriendlyMessage = `子 App 运行时错误：${errorMessage}`;
          }
          
          setError(userFriendlyMessage);
          setIsLoading(false);
          setSubAppReady(false);
          onErrorProp?.(userFriendlyMessage);
          
          // 不调用原始错误处理器，防止应用崩溃
          return;
        }
        
        // 对于其他错误，使用原始错误处理器
        if (originalErrorHandler) {
          originalErrorHandler(error, isFatal);
        }
      });
    }

    return () => {
      // 恢复原始错误处理器
      if (ErrorUtils.setGlobalHandler && originalErrorHandler) {
        ErrorUtils.setGlobalHandler(originalErrorHandler);
      }
    };
  }, [onErrorProp]);

  // 打开子 App
  const openSubApp = useCallback(async () => {
    // 使用测试地址覆盖传入的 previewUrl
    console.log('[MobilePreview] Opening sub app with preview URL:', previewUrl);
    const manifestUrl =  previewUrl;
    
    if (!manifestUrl) {
      const errorMsg = 'No preview URL available';
      setError(errorMsg);
      onErrorProp?.(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSubAppReady(false);
    setLoadingProgress({ status: '开始加载...', done: 0, total: 1, progress: 0 });
    onLoadStartProp?.();

    try {
      // 使用 normalizeExpUrlToHttp 处理 URL
      const normalizedUrl = normalizeExpUrlToHttp(manifestUrl);
      const moduleName = 'main';
      
      await SubAppLauncherService.openSubApp(
        normalizedUrl,
        moduleName,
        {
          projectId,
        }
      );

      console.log('[MobilePreview] Sub app opened successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load mobile app';
      console.error('❌ [MobilePreview] Failed to open sub app:', err);
      setError(errorMessage);
      setIsLoading(false);
      setLoadingProgress(null);
      onErrorProp?.(errorMessage);
    }
  }, [previewUrl, projectId, onLoadStartProp, onErrorProp]);

  // 刷新预览（重新打开子 App）
  const handleRefresh = useCallback(async () => {
    try {
      console.log('🔄 [MobilePreview] Refreshing mobile preview...');
      setIsLoading(true);
      setLoadingProgress({ status: '正在刷新预览...', done: 0, total: 1, progress: 0 });
      setSubAppReady(false);
      
      try {
        await SubAppLauncherService.reloadSubApp();
      } catch (reloadError) {
        console.log('[MobilePreview] Reload failed, trying to reopen sub app:', reloadError);
        const manifestUrl = previewUrl;
        const normalizedUrl = normalizeExpUrlToHttp(manifestUrl);
        await SubAppLauncherService.openSubApp(normalizedUrl, 'main', { projectId });
      }
      
      setIsLoading(false);
      setLoadingProgress(null);
      console.log('[MobilePreview] Preview refreshed successfully');
    } catch (error) {
      setIsLoading(false);
      setLoadingProgress(null);
      const errorMessage = error instanceof Error ? error.message : '刷新预览失败';
      setError(errorMessage);
      onErrorProp?.(errorMessage);
      console.error('[MobilePreview] Failed to reload sub app:', error);
    }
  }, [previewUrl, projectId, onErrorProp]);

  // 暴露刷新方法给父组件
  React.useImperativeHandle(ref, () => ({
    refresh: handleRefresh,
  }), [handleRefresh]);

  // 组件挂载时自动打开子 App
  useEffect(() => {
    if (isMountedRef.current) {
      openSubApp();
    }

    return () => {
      isMountedRef.current = false;
      // 组件卸载时关闭子 App
      SubAppLauncherService.closeSubApp();
    };
  }, [openSubApp]);

  // 检查是否有有效的 manifest URL
  const manifestUrl = TEST_MANIFEST_URL || previewUrl;
  
  // 调试：打印接收到的 previewUrl
  console.log('🔍 [MobilePreview] Received previewUrl:', {
    previewUrl,
    TEST_MANIFEST_URL,
    manifestUrl,
    hasPreviewUrl: !!previewUrl,
    hasTestUrl: !!TEST_MANIFEST_URL,
    finalManifestUrl: manifestUrl,
  });
  
  if (!manifestUrl) {
    console.warn('⚠️ [MobilePreview] No preview URL available:', {
      previewUrl,
      TEST_MANIFEST_URL,
      manifestUrl,
    });
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No preview URL available</Text>
          <Text style={styles.errorSubtext}>
            This project doesn't have a preview URL yet.
          </Text>
        </View>
      </View>
    );
  }

  if (Platform.OS !== 'ios') {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Mobile preview not supported</Text>
          <Text style={styles.errorSubtext}>
            Mobile app preview is currently only supported on iOS.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SubAppErrorBoundary
      onError={(error, errorInfo) => {
        console.error('❌ [MobilePreview] ErrorBoundary caught error:', error);
        const errorMessage = error.message || '子 App 加载错误';
        setError(errorMessage);
        setIsLoading(false);
        setSubAppReady(false);
        onErrorProp?.(errorMessage);
      }}
      onBack={onBack}
    >
      <View style={styles.container}>
        {/* 子 App 容器 - 核心预览区域 */}
        <View style={styles.subAppContainer}>
          <SubAppContainerView 
            ref={containerRef}
            style={styles.subAppView}
          />
        </View>

      {/* 全屏下载覆盖层 - 显示在预览页面之上 */}
      {showLoadingOverlay && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#F75A01" />
          
          {/* 加载状态文本 */}
          {loadingProgress?.status && (
            <Text style={styles.loadingStatusText}>{loadingProgress.status}</Text>
          )}
          
          {/* 进度条 */}
          {loadingProgress && (
            <View style={styles.loadingProgressContainer}>
              <View style={styles.loadingProgressBarContainer}>
                <View 
                  style={[
                    styles.loadingProgressBar, 
                    { width: `${loadingProgress.progress * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.loadingProgressPercent}>
                {loadingProgress.total > 0 
                  ? `${Math.round(loadingProgress.progress * 100)}% (${loadingProgress.done}/${loadingProgress.total})`
                  : `${Math.round(loadingProgress.progress * 100)}%`}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 错误提示覆盖层 */}
      {error && (
        <View style={styles.errorOverlay}>
          {/* 返回按钮 */}
          {onBack && (
            <View style={styles.errorHeader}>
              <Pressable
                style={({ pressed }) => [
                  styles.errorBackButton,
                  pressed && styles.errorBackButtonPressed
                ]}
                onPress={onBack}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ChevronBackIcon size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          )}
          
          <View style={styles.errorContent}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorSubtext}>
              {error.includes('深链接') || error.includes('scheme') 
                ? '这是子 App 的配置问题，不影响预览功能。您可以返回或刷新重试。'
                : '请检查网络连接或联系开发者。'}
            </Text>
            
            {/* 返回按钮 */}
            {onBack && (
              <TouchableOpacity
                style={styles.errorBackButtonLarge}
                onPress={onBack}
              >
                <Text style={styles.errorBackButtonText}>返回</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      </View>
    </SubAppErrorBoundary>
  );
});

MobilePreview.displayName = 'MobilePreview';

export default MobilePreview;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  subAppContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  subAppView: {
    flex: 1,
    backgroundColor: '#000',
  },
  // 全屏加载覆盖层
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingStatusText: {
    marginTop: 16,
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingProgressContainer: {
    marginTop: 24,
    width: '70%',
    alignItems: 'center',
  },
  loadingProgressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  loadingProgressBar: {
    height: '100%',
    backgroundColor: '#F75A01',
    borderRadius: 2,
  },
  loadingProgressPercent: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  // 错误覆盖层
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 1001,
  },
  errorHeader: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  errorBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  errorBackButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    opacity: 0.8,
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBackButtonLarge: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  errorBackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // 错误容器（用于非覆盖层场景）
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
});

