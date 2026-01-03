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
} from 'react-native';
import SubAppLauncherService, { LoadingProgress } from '../../src/services/SubAppLauncher';
import { normalizeExpUrlToHttp } from '../../src/utils/url';

// Native view component for sub-app container
const SubAppContainerView = requireNativeComponent<any>('SubAppContainerView');

export interface MobilePreviewProps {
  previewUrl: string;
  projectId: string;
  onMessage?: (data: string) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: string) => void;
}

export interface MobilePreviewRef {
  refresh: () => void;
}

// TODO: 测试用固定地址，后续需要移除
const TEST_MANIFEST_URL = 'http://127.0.0.1:8081/apps/text-sample/manifest.json';

const MobilePreview = React.forwardRef<MobilePreviewRef, MobilePreviewProps>(({
  previewUrl,
  projectId,
  onMessage,
  onLoadStart: onLoadStartProp,
  onLoadEnd: onLoadEndProp,
  onError: onErrorProp,
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

  // 打开子 App
  const openSubApp = useCallback(async () => {
    // 使用测试地址覆盖传入的 previewUrl
    const manifestUrl = TEST_MANIFEST_URL || previewUrl;
    
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
        const manifestUrl = TEST_MANIFEST_URL || previewUrl;
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
    if (isMountedRef.current && TEST_MANIFEST_URL) {
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
  
  if (!manifestUrl) {
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
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>
            Please check your network connection and try again.
          </Text>
        </View>
      )}
    </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 1001,
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
  },
  // 错误容器（用于非覆盖层场景）
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
});

