import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  requireNativeComponent,
  SafeAreaView
} from 'react-native';
import SubAppLauncherService, { LoadingProgress } from '../services/SubAppLauncher';
import { normalizeExpUrlToHttp } from '../utils/url';

// Native view component for sub-app container
const SubAppContainerView = requireNativeComponent('SubAppContainerView');

export default function PreviewScreen({ manifestUrl, moduleName, initialProps, onClose }) {
  const [loadingProgress, setLoadingProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [subAppReady, setSubAppReady] = useState(false);
  const containerRef = useRef(null);

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
    console.log('[PreviewScreen] Setting up onSubAppReady listener');
    const unsubscribe = SubAppLauncherService.addSubAppReadyListener(() => {
      console.log('[PreviewScreen] onSubAppReady event received');
      setSubAppReady(true);
      console.log('[PreviewScreen] Sub-app ready, root view should be attached automatically');
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 自动加载子 App
  useEffect(() => {
    if (manifestUrl) {
      loadSubApp();
    }
  }, [manifestUrl]);

  const loadSubApp = async () => {
    try {
      const normalizedUrl = normalizeExpUrlToHttp(manifestUrl);
      setIsLoading(true);
      setLoadingProgress({ status: '开始加载...', done: 0, total: 1, progress: 0 });
      setSubAppReady(false);
      
      await SubAppLauncherService.openSubApp(normalizedUrl, moduleName || 'main', initialProps || {});
      
      setIsLoading(false);
      setLoadingProgress(null);
    } catch (error) {
      setIsLoading(false);
      setLoadingProgress(null);
      Alert.alert('错误', `无法加载子 App: ${error}`);
      console.error('Failed to load sub app:', error);
    }
  };

  const handleReload = async () => {
    try {
      console.log('[PreviewScreen] Refreshing preview...');
      setIsLoading(true);
      setLoadingProgress({ status: '正在刷新预览...', done: 0, total: 1, progress: 0 });
      setSubAppReady(false);
      
      // If reload fails, try to reopen the sub app with the same URL
      try {
        await SubAppLauncherService.reloadSubApp();
      } catch (reloadError) {
        console.log('[PreviewScreen] Reload failed, trying to reopen sub app:', reloadError);
        // Fallback: reopen the sub app
        const normalizedUrl = normalizeExpUrlToHttp(manifestUrl);
        await SubAppLauncherService.openSubApp(normalizedUrl, moduleName || 'main', initialProps || {});
      }
      
      setIsLoading(false);
      setLoadingProgress(null);
      console.log('[PreviewScreen] Preview refreshed successfully');
    } catch (error) {
      setIsLoading(false);
      setLoadingProgress(null);
      Alert.alert('错误', `刷新预览失败: ${error}`);
      console.error('[PreviewScreen] Failed to reload sub app:', error);
    }
  };

  const handleCheckUpdate = async () => {
    try {
      await SubAppLauncherService.checkForUpdate();
      Alert.alert('成功', '更新检查完成');
    } catch (error) {
      Alert.alert('错误', `更新检查失败: ${error}`);
      console.error('Failed to check update:', error);
    }
  };

  const handleClose = () => {
    SubAppLauncherService.closeSubApp();
    if (onClose) {
      onClose();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* 顶部工具栏 */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>← 返回</Text>
        </TouchableOpacity>
        
        <View style={styles.toolbarRight}>
          <TouchableOpacity 
            style={[styles.toolbarButton, isLoading && styles.toolbarButtonDisabled]} 
            onPress={handleReload}
            disabled={isLoading}
          >
            <Text style={styles.toolbarButtonText}>
              {isLoading ? '⏳' : '🔄'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toolbarButton, isLoading && styles.toolbarButtonDisabled]} 
            onPress={handleCheckUpdate}
            disabled={isLoading}
          >
            <Text style={styles.toolbarButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 加载进度条 */}
      {loadingProgress && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>{loadingProgress.status}</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${loadingProgress.progress * 100}%` }]} />
          </View>
          <Text style={styles.progressPercent}>
            {loadingProgress.total > 0 
              ? `${Math.round(loadingProgress.progress * 100)}% (${loadingProgress.done}/${loadingProgress.total})`
              : `${Math.round(loadingProgress.progress * 100)}%`}
          </Text>
        </View>
      )}

      {/* 子 App 容器 - 全屏 */}
      <View style={styles.subAppContainer}>
        <SubAppContainerView 
          ref={containerRef}
          style={styles.subAppView}
        />
        
        {/* 加载指示器覆盖层 */}
        {isLoading && !subAppReady && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toolbarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  toolbarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbarButtonDisabled: {
    opacity: 0.5,
  },
  toolbarButtonText: {
    fontSize: 18,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  progressText: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 4,
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressPercent: {
    fontSize: 10,
    color: '#999',
    textAlign: 'right',
  },
  subAppContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  subAppView: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#fff',
    fontSize: 14,
  },
});

