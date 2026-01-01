/**
 * MobilePreview - Mobile 项目预览组件
 * 用于显示 miniapp 类型项目的预览（使用原生子 App 加载）
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
import SubAppLauncherService from '../../src/services/SubAppLauncher';

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

const MobilePreview = React.forwardRef<MobilePreviewRef, MobilePreviewProps>(({
  previewUrl,
  projectId,
  onMessage,
  onLoadStart: onLoadStartProp,
  onLoadEnd: onLoadEndProp,
  onError: onErrorProp,
}, ref) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // 打开子 App
  const openSubApp = useCallback(async () => {
    if (!previewUrl) {
      const errorMsg = 'No preview URL available';
      setError(errorMsg);
      onErrorProp?.(errorMsg);
      return;
    }

    setLoading(true);
    setError(null);
    onLoadStartProp?.();

    try {
      // 使用 previewUrl 作为 bundle URL
      // moduleName 通常为 "main" 或项目特定的模块名
      const moduleName = 'main'; // 可以根据项目配置调整
      
      await SubAppLauncherService.openSubApp(
        previewUrl,
        moduleName,
        {
          projectId,
          // 可以传递其他初始属性
        }
      );

      // 子 App 打开成功
      setLoading(false);
      onLoadEndProp?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load mobile app';
      console.error('❌ [MobilePreview] Failed to open sub app:', err);
      setError(errorMessage);
      setLoading(false);
      onErrorProp?.(errorMessage);
    }
  }, [previewUrl, projectId, onLoadStartProp, onLoadEndProp, onErrorProp]);

  // 刷新预览（重新打开子 App）
  const handleRefresh = useCallback(() => {
    console.log('🔄 [MobilePreview] Refreshing mobile preview...');
    // 先关闭当前子 App（如果有）
    SubAppLauncherService.closeSubApp();
    // 延迟一下再打开，确保关闭完成
    setTimeout(() => {
      openSubApp();
    }, 300);
  }, [openSubApp]);

  // 暴露刷新方法给父组件
  React.useImperativeHandle(ref, () => ({
    refresh: handleRefresh,
  }), [handleRefresh]);

  // 组件挂载时自动打开子 App
  useEffect(() => {
    if (isMountedRef.current && previewUrl) {
      openSubApp();
    }

    return () => {
      isMountedRef.current = false;
      // 组件卸载时关闭子 App
      SubAppLauncherService.closeSubApp();
    };
  }, [previewUrl, openSubApp]);

  if (!previewUrl) {
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
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading mobile app...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>
            Please check your network connection and try again.
          </Text>
        </View>
      )}

      {/* 子 App 会在原生层全屏显示，这里只是一个占位容器 */}
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderText}>
          Mobile app is running in fullscreen mode
        </Text>
      </View>
    </View>
  );
});

MobilePreview.displayName = 'MobilePreview';

export default MobilePreview;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  placeholderText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    transform: [{ translateY: -20 }],
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

