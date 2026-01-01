import React, { useContext, useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Linking } from 'react-native';
import OverlayAIChat from '../../components/OverlayAIChat';
import * as DevMenu from './DevMenuModule';
import DevMenuBottomSheetContext from './DevMenuBottomSheetContext';
import { httpClient, WebSocketMessage, WebSocketMessageType, SandboxStatusMessage } from '@vibecoding/api-client';
import { websocketClient } from '@vibecoding/ai-chat-core/src/websocketClient';
import { useAuthStoreData } from '../../stores/authStore';
import { SharedDataService } from '../../services/SharedDataService';

export function DevMenuView(props: {
  task: { manifestUrl: string; manifestString: string };
  uuid: string;
}) {
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [restartMessage, setRestartMessage] = useState('Sandbox is restarting...');
  const context = useContext(DevMenuBottomSheetContext);
  const { user, accessToken } = useAuthStoreData();

  // ✨ 初始化：从共享存储加载数据
  useEffect(() => {
    loadSharedContext();
  }, []);

  const loadSharedContext = async () => {
    try {
      console.log('\n========== Loading Shared Context ==========');
      
      const sharedContext = await SharedDataService.getContext();
      
      if (sharedContext) {
        console.log('✅ Loaded shared context:', {
          projectId: sharedContext.projectId,
          projectName: sharedContext.projectName,
          userId: sharedContext.userId,
        });

        // 设置 projectId
        setProjectId(sharedContext.projectId);

        // 如果当前没有认证信息，使用共享的认证信息
        // if (!user || !accessToken) {
        //   console.log('📥 Restoring auth from shared context');
        //   setAuthState({
        //     isAuthenticated: true,
        //     accessToken: sharedContext.accessToken,
        //     user: {
        //       user_id: sharedContext.userId,
        //       name: sharedContext.userName,
        //       email: sharedContext.userEmail,
        //     },
        //     loginType: sharedContext.loginType,
        //   });
        // }

        console.log('==========================================\n');
      } else {
        console.log('ℹ️ No shared context found, using fallback method');
        console.log('==========================================\n');
        // 回退到原来的方法：从 manifestUrl 解析
        const fallbackProjectId = getProjectIdFromManifest();
        setProjectId(fallbackProjectId);
      }
    } catch (error) {
      console.error('❌ Failed to load shared context:', error);
      // 回退到原来的方法
      const fallbackProjectId = getProjectIdFromManifest();
      setProjectId(fallbackProjectId);
    }
  };

  // 回退方法：从 manifestUrl 中解析 projectId
  const getProjectIdFromManifest = (): string | null => {
    try {
      const url = new URL(props.task.manifestUrl);
      const projectId = url.searchParams.get('projectId');
      console.log('📋 Parsed projectId from manifestUrl:', projectId);
      return projectId;
    } catch (error) {
      console.error('❌ Failed to parse manifestUrl:', error);
      return null;
    }
  };

  // WebSocket 连接管理
  useEffect(() => {
    console.log('\n========== WebSocket Connection ==========');
    console.log('📋 projectId:', projectId);
    console.log('📋 userId:', user?.user_id);
    console.log('📋 accessToken:', accessToken ? 'present' : 'missing');
    console.log('📋 isChatVisible:', isChatVisible);
    
    if (!projectId || !user?.user_id || !isChatVisible) {
      console.log('⚠️ Skipping WebSocket connection - missing required data');
      console.log('==========================================\n');
      return;
    }

    const connectWebSocket = async () => {
      try {
        console.log('🔌 Step 1: Getting WebSocket key from API...');
        
        // 第一步：获取 WebSocket 连接密钥
        const response = await httpClient.getWebSocketConnection(projectId);
        
        console.log('📦 API Response:', { code: response.code, hasData: !!response.data, info: response.info });
        
        if (response.code !== 0 || !response.data?.path) {
          throw new Error(response.info || 'Failed to get WebSocket key');
        }

        const wsKey = response.data.path;
        console.log('🔑 Step 2: Got WebSocket key:', wsKey);

        // 第二步：建立 WebSocket 连接（使用格式：/ws/projects/{key}）
        console.log('🔌 Step 3: Connecting to WebSocket with key...');
        await websocketClient.connect(projectId, user.user_id, wsKey);
        
        console.log('✅ WebSocket connected successfully!');
        console.log('==========================================\n');
      } catch (error) {
        console.error('❌ WebSocket connection failed!');
        console.error('Error details:', error);
        console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.log('==========================================\n');
      }
    };

    connectWebSocket();

    // 清理：断开 WebSocket
    return () => {
      console.log('🔌 Disconnecting WebSocket...');
      websocketClient.disconnect();
      console.log('✅ WebSocket disconnected');
    };
  }, [projectId, user?.user_id, accessToken, isChatVisible]);

  // 监听 WebSocket 沙盒状态消息
  useEffect(() => {
    if (!projectId || !isChatVisible) {
      console.log('⚠️ [DevMenuView] Skipping sandbox status listener - chat not visible or missing projectId');
      return;
    }

    console.log('🎧 [DevMenuView] Setting up sandbox status listener');
    
    const unsubscribe = websocketClient.onMessage((message: WebSocketMessage) => {
      // 只处理沙盒状态消息
      if (message.type !== WebSocketMessageType.SANDBOX_STATUS) {
        return;
      }

      const sandboxMessage = message as SandboxStatusMessage;
      console.log('🏗️ [DevMenuView] Received sandbox status:', sandboxMessage.data);

      const { status, startup_info } = sandboxMessage.data;

      if (status === 'killed') {
        console.log('⚠️ [DevMenuView] Sandbox killed, starting restart process...');
        handleSandboxKilled();
      } else if (status === 'success') {
        console.log('✅ [DevMenuView] Sandbox restarted successfully');
        // 立即隐藏加载提示
        setIsRestarting(false);
        // 然后进行跳转（优先使用 web_preview_url）
        const previewUrl = startup_info?.web_preview_url || startup_info?.preview_url;
        handleSandboxRestarted(previewUrl);
      } else if (status === 'failed') {
        console.log('❌ [DevMenuView] Sandbox restart failed');
        // 显示失败消息
        setRestartMessage('Failed to restart sandbox');
        // 3秒后隐藏
        setTimeout(() => {
          setIsRestarting(false);
        }, 3000);
      }
    });

    return () => {
      console.log('🔌 [DevMenuView] Cleaning up sandbox status listener');
      unsubscribe();
    };
  }, [projectId, isChatVisible]);

  // 处理沙盒被杀死的情况
  const handleSandboxKilled = async () => {
    if (!projectId) {
      console.error('❌ [DevMenuView] Cannot restart: projectId is missing');
      return;
    }

    try {
      setIsRestarting(true);
      setRestartMessage('Sandbox stopped. Restarting...');
      
      console.log('📡 [DevMenuView] Calling startProject API for:', projectId);
      const response = await httpClient.startProject(projectId);
      
      if (response.code !== 0) {
        throw new Error(response.info || 'Failed to start project');
      }

      console.log('✅ [DevMenuView] Start project command sent successfully');
      setRestartMessage('Starting sandbox... Please wait...');
    } catch (error) {
      console.error('❌ [DevMenuView] Failed to restart sandbox:', error);
      setRestartMessage('Failed to restart sandbox');
      // 显示失败消息 3 秒后隐藏
      setTimeout(() => {
        setIsRestarting(false);
      }, 3000);
    }
  };

  // 处理沙盒重启成功后的平滑重新加载
  const handleSandboxRestarted = async (previewUrl?: string) => {
    if (!previewUrl) {
      console.error('❌ [DevMenuView] No preview URL in success message');
      return;
    }

    try {
      console.log('🚀 [DevMenuView] Sandbox restarted, reloading with new URL:', previewUrl);
      
      // 方案1: 优先使用原生模块方法平滑重新加载（无缝过渡）
      try {
        console.log('📱 [DevMenuView] Attempting smooth reload with native method...');
        await DevMenu.reloadAppWithNewUrl(previewUrl);
        console.log('✅ [DevMenuView] Successfully reloaded with new manifest URL (smooth transition)');
        return;
      } catch (reloadError) {
        console.warn('⚠️ [DevMenuView] Native reload failed, falling back to Linking:', reloadError);
      }
      
      // 方案2: 降级方案 - 使用 Linking.openURL（会重新打开应用）
      console.log('🔗 [DevMenuView] Using Linking fallback...');
      const canOpen = await Linking.canOpenURL(previewUrl);
      if (canOpen) {
        await Linking.openURL(previewUrl);
        console.log('✅ [DevMenuView] Successfully redirected to new sandbox (with app restart)');
      } else {
        throw new Error('Cannot open preview URL');
      }
    } catch (error) {
      console.error('❌ [DevMenuView] Failed to redirect:', error);
    }
  };

  // 监听 BottomSheet 关闭，同步关闭 AI Chat
  React.useEffect(() => {
    const closeSubscription = DevMenu.listenForCloseRequests(() => {
      console.log('BottomSheet closing, hiding AI Chat');
      setIsChatVisible(false);
      return Promise.resolve();
    });
    return () => {
      closeSubscription?.remove?.();
    };
  }, []);

  const handleClose = async () => {
    console.log('OverlayAIChat close requested');
    // 关闭会触发 useEffect 清理，自动断开 WebSocket
    setIsChatVisible(false);
    // 同时关闭 BottomSheet
    if (context) {
      await context.collapse();
    }
  };

  const handleGoHome = async () => {
    console.log('OverlayAIChat go home requested');
    try {
      // 先关闭 AI Chat（会触发 WebSocket 断开）
      setIsChatVisible(false);
      // 关闭 BottomSheet
      if (context) {
        await context.collapse();
      }
      // 然后返回首页
      await DevMenu.goToHomeAsync();
      console.log('✅ Returned to home successfully');
    } catch (error) {
      console.error('❌ Failed to go home:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* AI Chat 悬浮窗 */}
      {isChatVisible && (
        <OverlayAIChat
          isVisible={true}
          onClose={handleClose}
          onGoHome={handleGoHome}
          projectId={projectId}
          projectUrl={props.task.manifestUrl}
        />
      )}
      
      {/* 沙盒重启提示 */}
      {isRestarting && (
        <View style={styles.restartOverlay}>
          <View style={styles.restartBanner}>
            <ActivityIndicator size="small" color="#FFFFFF" style={styles.restartSpinner} />
            <Text style={styles.restartText}>{restartMessage}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8fa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // 沙盒重启提示样式
  restartOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  restartBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  restartSpinner: {
    marginRight: 12,
  },
  restartText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

