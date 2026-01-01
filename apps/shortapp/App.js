import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, TextInput, ActivityIndicator, NativeModules, requireNativeComponent } from 'react-native';
import SubAppLauncherService, { LoadingProgress } from './src/services/SubAppLauncher';
import { normalizeExpUrlToHttp } from './src/utils/url';

const { SubAppLauncher } = NativeModules;

// Native view component for sub-app container
const SubAppContainerView = requireNativeComponent('SubAppContainerView');

export default function App() {
  const [inputUrl, setInputUrl] = useState('');
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
    console.log('[App] Setting up onSubAppReady listener');
    const unsubscribe = SubAppLauncherService.addSubAppReadyListener(() => {
      console.log('[App] onSubAppReady event received');
      setSubAppReady(true);
      console.log('[App] Sub-app ready, root view should be attached automatically');
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleOpenSubApp = async () => {
    try {
      // 默认 manifest URL（示例）
      const defaultManifestUrl = 'http://127.0.0.1:8081/apps/text-sample/manifest.json';
      const rawUrl = inputUrl.trim() || defaultManifestUrl;
      const manifestUrl = normalizeExpUrlToHttp(rawUrl);
      const moduleName = 'main'; // 替换为实际的模块名

      setIsLoading(true);
      setLoadingProgress({ status: '开始加载...', done: 0, total: 1, progress: 0 });
      
      await SubAppLauncherService.openSubApp(manifestUrl, moduleName, {
        // 初始属性
        projectId: 'test-project',
      });
      
      setIsLoading(false);
      setLoadingProgress(null);
      setSubAppReady(false); // Reset, will be set to true when onSubAppReady fires
    } catch (error) {
      setIsLoading(false);
      setLoadingProgress(null);
      Alert.alert('错误', `无法打开子 App: ${error}`);
      console.error('Failed to open sub app:', error);
    }
  };

  const handleReload = async () => {
    try {
      console.log('[App] Refreshing preview...');
      setIsLoading(true);
      setLoadingProgress({ status: '正在刷新预览...', done: 0, total: 1, progress: 0 });
      setSubAppReady(false);
      
      // If reload fails, try to reopen the sub app with the same URL
      try {
        await SubAppLauncherService.reloadSubApp();
      } catch (reloadError) {
        console.log('[App] Reload failed, trying to reopen sub app:', reloadError);
        // Fallback: reopen the sub app
        const defaultManifestUrl = 'http://127.0.0.1:8081/apps/text-sample/manifest.json';
        const rawUrl = inputUrl.trim() || defaultManifestUrl;
        const manifestUrl = normalizeExpUrlToHttp(rawUrl);
        await SubAppLauncherService.openSubApp(manifestUrl, 'main', {
          projectId: 'test-project',
        });
      }
      
      setIsLoading(false);
      setLoadingProgress(null);
      console.log('[App] Preview refreshed successfully');
    } catch (error) {
      setIsLoading(false);
      setLoadingProgress(null);
      Alert.alert('错误', `刷新预览失败: ${error}`);
      console.error('[App] Failed to reload sub app:', error);
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

  return (
    <View style={styles.container}>
      {/* 控制面板 */}
      <View style={styles.controlPanel}>
        <Text style={styles.title}>子 App 预览测试</Text>
        <Text style={styles.description}>
          点击下面的按钮来测试子 App 预览功能
        </Text>

        <TextInput
          style={styles.input}
          placeholder="输入 manifest URL（留空则用默认）"
          value={inputUrl}
          onChangeText={setInputUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={handleOpenSubApp}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>打开子 App</Text>
          )}
        </TouchableOpacity>
        
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
        
        {/* 调试信息 */}
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>调试信息:</Text>
          <Text style={styles.debugText}>- subAppReady: {subAppReady ? 'true' : 'false'}</Text>
          <Text style={styles.debugText}>- isLoading: {isLoading ? 'true' : 'false'}</Text>
          <Text style={styles.debugText}>- progress: {loadingProgress ? `${Math.round(loadingProgress.progress * 100)}%` : 'N/A'}</Text>
        </View>
      </View>

      {/* 子 App 容器 */}
      <View style={styles.subAppContainer}>
        <SubAppContainerView 
          ref={containerRef}
          style={styles.subAppView}
        />
        
        {/* 覆盖按钮层 - 显示刷新和更新按钮 */}
        <View style={styles.overlayButtons}>
          <TouchableOpacity 
            style={styles.overlayButton} 
            onPress={handleReload}
            disabled={isLoading}
          >
            <Text style={styles.overlayButtonText}>
              {isLoading ? '⏳ 加载中...' : '🔄 刷新预览'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.overlayButton, isLoading && styles.overlayButtonDisabled]} 
            onPress={handleCheckUpdate}
            disabled={isLoading}
          >
            <Text style={styles.overlayButtonText}>🔍 检查更新</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE5E5', // 红色 - 最外层容器
  },
  controlPanel: {
    padding: 20,
    backgroundColor: '#E5F3FF', // 蓝色 - 控制面板
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  subAppContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E5FFE5', // 绿色 - 子 App 容器外层
    borderWidth: 2,
    borderColor: '#28a745',
  },
  subAppView: {
    flex: 1,
    backgroundColor: '#FFF5E5', // 橙色 - SubAppContainerView Native View
    borderWidth: 2,
    borderColor: '#ff9800',
  },
  overlayButtons: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 1000,
  },
  overlayButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  overlayButtonDisabled: {
    backgroundColor: 'rgba(128, 128, 128, 0.6)',
    opacity: 0.6,
  },
  overlayButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  buttonSecondary: {
    backgroundColor: '#6c757d',
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  progressContainer: {
    width: '100%',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  debugInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#fff3cd',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  debugText: {
    fontSize: 11,
    color: '#856404',
    fontFamily: 'monospace',
  },
});
