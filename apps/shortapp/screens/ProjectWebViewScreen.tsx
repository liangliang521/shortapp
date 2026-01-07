/**
 * ProjectWebViewScreen - 项目 WebView 页面
 * 显示项目的 preview_url
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Platform,
  Share,
  Keyboard,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Project } from '@vibecoding/api-client/src/types';
import { useAuth } from '../hooks/useAuth';
import { httpClient } from '@vibecoding/api-client';
import { ensurePublishedAndShare } from '../utils/shareUtils';
import OverlayAIChat from '../components/OverlayAIChat';
import { AIChatIcon, ShareIcon, StopCircleIcon, RefreshIcon } from '../components/icons/SvgIcons';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { BlurView } from '@react-native-community/blur';
import { websocketClient } from '@vibecoding/ai-chat-core/src/websocketClient';
import { WebSocketMessageType, WebSocketMessage } from '@vibecoding/api-client';
import {
  ACTIONS,
  openSystemSettings,
  CameraPermissionModal,
  ScripePayWebView,
} from '@vibecoding/web-rn-bridge';
import { WebPreview, WebPreviewRef, MobilePreview, MobilePreviewRef } from '../components/ProjectPreview';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
type ProjectWebViewRouteParams = {
  ProjectWebView: {
    projectId: string;
  };
};

type TopActionsContentProps = {
  handleShare: () => void;
  handleGoHome: () => void;
  handleRefresh: () => void;
};

// 提取 Top Actions 内容组件，方便在 LiquidGlass 和 View 中复用
const TopActionsContent = ({ handleShare, handleGoHome, handleRefresh }: TopActionsContentProps) => (
  <View style={styles.topActionsContent}>
    <Pressable 
      style={({ pressed }) => [
        styles.topActionButton, 
        styles.topActionButtonLeft,
        pressed && styles.topActionButtonPressed
      ]}
      onPress={handleShare}
    >
      <ShareIcon size={16} color="#737373" />
    </Pressable>
    <View style={styles.topActionDivider} />
    <Pressable 
      style={({ pressed }) => [
        styles.topActionButton, 
        styles.topActionButtonRight,
        pressed && styles.topActionButtonPressed
      ]}
      onPress={handleGoHome}
    >
      <StopCircleIcon size={18} color="#737373" />
    </Pressable>
  </View>
);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUTTON_SIZE = 56; // 按钮大小

export default function ProjectWebViewScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ProjectWebViewRouteParams, 'ProjectWebView'>>();
  const insets = useSafeAreaInsets();
  const { projectId } = route.params;
  const { user } = useAuth();

  // 项目数据状态
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAIChat, setShowAIChat] = useState(false); // 默认显示
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const webPreviewRef = useRef<WebPreviewRef>(null);
  const mobilePreviewRef = useRef<MobilePreviewRef>(null);
  
  // Stripe 支付弹窗相关状态
  const [stripePaymentUrl, setStripePaymentUrl] = useState<string | null>(null);
  const [stripeSuccessUrl, setStripeSuccessUrl] = useState<string | null>(null);
  const [stripeCancelUrl, setStripeCancelUrl] = useState<string | null>(null);
  const [stripeRequestId, setStripeRequestId] = useState<string | null>(null);
  
  // 相机权限弹窗状态
  const [showCameraPermissionModal, setShowCameraPermissionModal] = useState(false);

  // 获取项目数据
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('📡 [ProjectWebViewScreen] Fetching project:', projectId);
        const response = await httpClient.getProject(projectId);
        console.log('📡 [ProjectWebViewScreen] API response:', response.data);
        
        if (response.code === 0 && response.data) {
          setProject(response.data);
          console.log('✅ [ProjectWebViewScreen] Project fetched successfully:', response.data.project_id);
        } else {
          const errorMessage = response.info || 'Failed to load project';
          setError(errorMessage);
          console.error('❌ [ProjectWebViewScreen] Failed to fetch project:', errorMessage);
          Alert.alert('Error', errorMessage, [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('❌ [ProjectWebViewScreen] Error fetching project:', err);
        Alert.alert('Error', errorMessage, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId, navigation]);

  // 判断是否是本人的项目
  const isOwnProject = user && project && project.user_id === user.user_id;

  // 动画值：顶部按钮的透明度和位移
  const topActionsOpacity = useSharedValue(1);
  const topActionsTranslateY = useSharedValue(0);

  // 顶部按钮的动画样式
  const topActionsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: topActionsOpacity.value,
    transform: [{ translateY: topActionsTranslateY.value }],
  }));

  // 浮动按钮的位置（相对于屏幕左上角的绝对位置）
  // 初始位置：右下角，距离右边 20px，距离底部 tabbar + 20px
  const getInitialPosition = useCallback(() => {
    const initialRight = 20;
    const initialBottom = 70 + 20; // tabbar 高度约 70px + 原有 20px 间距
    return {
      x: SCREEN_WIDTH - initialRight - BUTTON_SIZE,
      y: SCREEN_HEIGHT - initialBottom - BUTTON_SIZE,
    };
  }, []);
  
  const initialPos = getInitialPosition();
  const floatingButtonX = useSharedValue(initialPos.x);
  const floatingButtonY = useSharedValue(initialPos.y);
  const startX = useSharedValue(initialPos.x);
  const startY = useSharedValue(initialPos.y);
  
  // 拖动手势（同时支持点击和拖动）
  const panGesture = Gesture.Pan()
    .minDistance(5) // 最小拖动距离，小于此值视为点击
    .onStart(() => {
      // 记录拖动开始时的位置
      startX.value = floatingButtonX.value;
      startY.value = floatingButtonY.value;
    })
    .onUpdate((event) => {
      // 计算新位置（初始位置 + 拖动偏移量）
      const newX = startX.value + event.translationX;
      const newY = startY.value + event.translationY;
      
      // 限制在屏幕范围内
      const clampedX = Math.max(
        0,
        Math.min(SCREEN_WIDTH - BUTTON_SIZE, newX)
      );
      const clampedY = Math.max(
        0,
        Math.min(SCREEN_HEIGHT - BUTTON_SIZE, newY)
      );
      
      floatingButtonX.value = clampedX;
      floatingButtonY.value = clampedY;
    })
    .onEnd((event) => {
      // 如果拖动距离很小，视为点击
      const dragDistance = Math.sqrt(
        event.translationX * event.translationX + 
        event.translationY * event.translationY
      );
      
      if (dragDistance < 5) {
        // 点击事件
        runOnJS(setShowAIChat)(!showAIChat);
      }
      // 拖动结束时的处理（可以添加吸附到边缘的逻辑）
      // 暂时不做处理，让按钮停留在拖动位置
    });

  // 点击手势（作为备用，处理没有拖动的情况）
  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      runOnJS(setShowAIChat)(!showAIChat);
    });

  // 组合手势：点击和拖动同时支持
  const composedGesture = Gesture.Simultaneous(tapGesture, panGesture);

  // 浮动按钮的动画样式
  const floatingButtonAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: floatingButtonX.value,
    top: floatingButtonY.value,
  }));

  // 获取预览 URL（优先使用 web_preview_url）
  const previewUrl = project?.startup_info?.web_preview_url || project?.startup_info?.preview_url || '';
  
  // 调试：打印项目信息
  useEffect(() => {
    if (project) {
      console.log('🔍 [ProjectWebViewScreen] Project data:', {
        project_id: project.project_id,
        type: project.type,
        startup_info: project.startup_info,
        bundle_url: (project.startup_info as any)?.bundle_url,
        web_preview_url: project.startup_info?.web_preview_url,
        preview_url: project.startup_info?.preview_url,
      });
    }
  }, [project]);

  // 判断项目是否已发布
  const isPublic = project?.app?.isPublic ?? project?.isPublic ?? false;

  // 分享功能（统一封装逻辑）
  const handleShare = async () => {
    if (!project) return;
    try {
      await ensurePublishedAndShare({
        project,
        isPublic,
        currentUserId: user?.user_id ?? null,
        publish: async () => {
          await httpClient.configureMiniapp(project.project_id, { isPublic: true });
        },
      });
    } catch (error) {
      console.error('❌ [ProjectWebViewScreen] Error sharing project:', error);
      Alert.alert('Error', 'Failed to share project');
    }
  };

  // 返回首页功能
  const handleGoHome = useCallback(() => {
    // 先断开 WebSocket 连接
    disconnectWebSocket();
    // 如果有弹窗则关闭
    setShowAIChat(false);
    // 返回
    navigation.goBack();
  }, [navigation]);

  // 刷新预览的函数 - 根据项目类型刷新对应的预览组件
  const handleRefreshPreview = useCallback(() => {
    if (!project) return;
    const projectType = project.type || 'miniapp';
    console.log('🔄 [ProjectWebViewScreen] Refreshing preview...', { projectType });
    
    if (projectType === 'web' && webPreviewRef.current) {
      webPreviewRef.current.refresh();
      console.log('✅ [ProjectWebViewScreen] Web preview refresh triggered');
    } else if (projectType === 'nativeapp' && mobilePreviewRef.current) {
      mobilePreviewRef.current.refresh();
      console.log('✅ [ProjectWebViewScreen] Mobile preview refresh triggered');
    } else {
      console.warn('⚠️ [ProjectWebViewScreen] Preview ref is not available', { projectType });
    }
  }, [project]);

  // 保持向后兼容的别名
  const handleRefreshWebView = handleRefreshPreview;

  // 处理 Stripe 支付结果 -> 发送到 WebView 并清理状态
  const handleStripePaymentResult = useCallback((status: 'success' | 'cancel' | 'error', message?: string) => {
    console.log('💳 [ProjectWebViewScreen] Payment result:', { requestId: stripeRequestId, status, message });
    
    // 发送支付结果到 WebView
    if (stripeRequestId && webPreviewRef.current) {
      webPreviewRef.current.sendStripeResult(stripeRequestId, status, message);
    }
    
    // 清理状态
    if (status === 'success' || status === 'cancel' || status === 'error') {
      setStripePaymentUrl(null);
      setStripeSuccessUrl(null);
      setStripeCancelUrl(null);
      setStripeRequestId(null);
    }
  }, [stripeRequestId]);

 
  // 监听沙盒启动成功，自动刷新 WebView
  useEffect(() => {
    if (!project?.project_id) {
      return;
    }

    console.log('🎧 [ProjectWebViewScreen] Setting up sandbox status listener');
    
    const unsubscribe = websocketClient.onMessage((message: WebSocketMessage) => {
      // 只处理沙盒状态消息
      if (message.type !== WebSocketMessageType.SANDBOX_STATUS) {
        return;
      }

      const sandboxMessage = message as any;
      const { status } = sandboxMessage.data;
      
      console.log('🏗️ [ProjectWebViewScreen] Received sandbox status:', status);

      // 当沙盒启动成功时，刷新 WebView
      if (status === 'success') {
        console.log('✅ [ProjectWebViewScreen] Sandbox started successfully, refreshing WebView...');
        // 延迟一小段时间，确保沙盒完全启动
        setTimeout(() => {
          handleRefreshWebView();
        }, 500);
      }
    });

    return () => {
      console.log('🔌 [ProjectWebViewScreen] Cleaning up sandbox status listener');
      unsubscribe();
    };
  }, [project?.project_id, handleRefreshWebView]);

  // 断开 WebSocket 连接的函数
  const disconnectWebSocket = useCallback(() => {
    console.log('🔌 [ProjectWebViewScreen] Disconnecting WebSocket...');
    try {
      websocketClient.disconnect();
      console.log('✅ [ProjectWebViewScreen] WebSocket disconnected');
    } catch (error) {
      console.error('❌ [ProjectWebViewScreen] Error disconnecting WebSocket:', error);
    }
  }, []);


  // 键盘监听
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
      // 动画：淡出并向上移动
      topActionsOpacity.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
      topActionsTranslateY.value = withTiming(-20, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      // 动画：淡入并恢复位置
      topActionsOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
      topActionsTranslateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // // 当页面失去焦点时（返回时）断开 WebSocket 连接
  // useFocusEffect(
  //   useCallback(() => {
  //     // 页面获得焦点时不做任何操作
  //     return () => {
  //       // 页面失去焦点时（返回时）断开 WebSocket 连接
  //       disconnectWebSocket();
  //     };
  //   }, [disconnectWebSocket])
  // );

  // // 组件卸载时也断开连接（双重保险）
  // useEffect(() => {
  //   return () => {
  //     disconnectWebSocket();
  //   };
  // }, [disconnectWebSocket]);

  // 监听导航返回事件（包括系统返回按钮和手势返回）
  // useEffect(() => {
  //   const unsubscribe = navigation.addListener('beforeRemove', () => {
  //     // 在页面被移除前断开 WebSocket 连接
  //     disconnectWebSocket();
  //   });

  //   return unsubscribe;
  // }, [navigation, disconnectWebSocket]);

  // 根据项目类型决定使用哪个预览组件
  const projectType = project?.type || 'miniapp';

  // 显示加载状态
  if (loading) {
    return (
      <View style={styles.outerContainer}>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      </View>
    );
  }

  // 显示错误状态
  if (error || !project) {
    return (
      <View style={styles.outerContainer}>
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error || 'Project not found'}</Text>
            <Text style={styles.errorSubtext}>
              Please try again later.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>

      {/* 根据项目类型选择预览组件 */}
      {projectType === 'web' || projectType === 'miniapp' ? (
        <WebPreview
          ref={webPreviewRef}
          previewUrl={previewUrl}
          projectId={project.project_id}
          onShowCameraPermissionModal={() => setShowCameraPermissionModal(true)}
          onPushStripe={({ url, successUrl, cancelUrl, requestId }) => {
            const rid = requestId || `stripe_${Date.now()}`;
            setStripeRequestId(rid);
            setStripePaymentUrl(url || null);
            setStripeSuccessUrl(successUrl || null);
            setStripeCancelUrl(cancelUrl || null);
          }}
        />
      ) : projectType === 'nativeapp' ? (
        <MobilePreview
          ref={mobilePreviewRef}
          previewUrl={(() => {
            // 对于 nativeapp，优先使用 bundle_url，如果没有则使用 preview_url
            const bundleUrl = (project.startup_info as any)?.bundle_url || project.startup_info?.preview_url;
            const finalUrl = bundleUrl ? bundleUrl + '/metadata.json' : '';
            console.log('🔍 [ProjectWebViewScreen] NativeApp preview URL calculation:', {
              bundle_url: (project.startup_info as any)?.bundle_url,
              preview_url: project.startup_info?.preview_url,
              used_url: bundleUrl,
              final_preview_url: finalUrl,
              startup_info: project.startup_info,
            });
            return finalUrl;
          })()}
          projectId={project.project_id}
          onBack={() => navigation.goBack()}
        />
      ) : (
        // TODO: 未来添加 nativeapp 预览组件
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Preview not available</Text>
            <Text style={styles.errorSubtext}>
              Native app preview is not yet supported.
            </Text>
          </View>
        </View>
      )}
      </View>

      {/* Top Right Actions (Share & Home) - 使用动画 - 定位在外层容器上 */}
      <Animated.View 
        style={[
          styles.topActionsContainer, 
          { top: insets.top + 10 },
          topActionsAnimatedStyle,
        ]}
        pointerEvents={isKeyboardVisible ? 'none' : 'auto'}
      >
        <View style={styles.topActionsPillWrapper}>
          {isLiquidGlassSupported && Platform.OS === 'ios' ? (
            <LiquidGlassView
              style={styles.topActionsLiquidGlass}
              interactive
              effect="clear"
            >
              <TopActionsContent 
                handleShare={handleShare} 
                handleGoHome={handleGoHome}
                handleRefresh={handleRefreshPreview}
              />
            </LiquidGlassView>
          ) : (
            <View style={[styles.topActionsPill, styles.topActionsPillFallback]}>
              <BlurView
                blurType="light"
                blurAmount={40}
                reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.9)"
                style={StyleSheet.absoluteFillObject}
              />
              <TopActionsContent 
                handleShare={handleShare} 
                handleGoHome={handleGoHome}
                handleRefresh={handleRefreshPreview}
              />
            </View>
          )}
        </View>
      </Animated.View>

      {/* AI Chat Overlay - 仅本人的项目显示 */}
      {isOwnProject && (
        <OverlayAIChat
          isVisible={showAIChat}
          onClose={() => setShowAIChat(false)}
          onGoHome={() => {
            // 先断开 WebSocket 连接
            disconnectWebSocket();
            // 先关闭弹窗
            setShowAIChat(false);
            // 等待关闭动画完成后再返回
            setTimeout(() => {
              navigation.goBack();
            }, 300); // 300ms 足够让关闭动画完成
          }}
          projectId={project.project_id}
          projectUrl={previewUrl}
          onRefreshWebView={handleRefreshWebView}
        />
      )}

      {/* Floating AI Chat Toggle Button - 可拖动（仅本人的项目显示） */}
      {isOwnProject && (
        <GestureDetector gesture={composedGesture}>
          <Animated.View
            style={[styles.floatingButtonContainer, floatingButtonAnimatedStyle]}
            pointerEvents="box-none"
          >
            <View
              style={styles.floatingButtonPressable}
              accessibilityRole="button"
              accessibilityLabel={showAIChat ? 'Hide AI Chat' : 'Show AI Chat'}
            >
              <AIChatToggleButton isVisible={showAIChat} />
            </View>
          </Animated.View>
        </GestureDetector>
      )}

      {/* Stripe 支付弹窗（封装组件） */}
      <ScripePayWebView
        visible={!!stripePaymentUrl}
        paymentUrl={stripePaymentUrl}
        successUrl={stripeSuccessUrl}
        cancelUrl={stripeCancelUrl}
        onResult={(status, message) => handleStripePaymentResult(status as any, message)}
        onClose={() => {
          setStripePaymentUrl(null);
          setStripeSuccessUrl(null);
          setStripeCancelUrl(null);
          setStripeRequestId(null);
        }}
      />

      {/* 相机权限引导弹窗 */}
      <CameraPermissionModal
        visible={showCameraPermissionModal}
        onClose={() => setShowCameraPermissionModal(false)}
        onOpenSettings={openSystemSettings}
      />
    </View>
  );
}

// AI Chat Toggle Button Component (Liquid Glass Effect)
const AIChatToggleButton = ({ isVisible }: { isVisible: boolean }) => {
  const isIOS = Platform.OS === 'ios';

  const ButtonContainer = ({ children }: { children: React.ReactNode }) =>
    isIOS && isLiquidGlassSupported ? (
      <LiquidGlassView
        style={styles.toggleButton}
        interactive
        effect="clear"
      >
        {children}
      </LiquidGlassView>
    ) : (
      <View style={[styles.toggleButton, styles.toggleButtonFallback]}>
        <BlurView
          blurType="light"
          blurAmount={40}
          reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.9)"
          style={StyleSheet.absoluteFillObject}
        />
        {children}
      </View>
    );

  return (
    <ButtonContainer>
      <View style={styles.toggleButtonContent}>
        <AIChatIcon size={32} />
      </View>
    </ButtonContainer>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#000000', // 外层黑色背景，安全区域外显示
  },
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF', // 内容区域白色背景
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  floatingButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  floatingButtonPressable: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActionsContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 1000,
  },
  topActionsPillWrapper: {
    borderRadius: 20, // Pill shape
    overflow: 'hidden',
    backgroundColor: 'transparent', // 使用 LiquidGlass 时背景透明
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  topActionsPill: {
    flexDirection: 'row',
    borderRadius: 20, // Pill shape
    height: 40,
    alignItems: 'center',
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  topActionsPillFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  topActionsLiquidGlass: {
    borderRadius: 20,
    height: 40,
    width: 90, // 44 + 1 + 44 roughly
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  topActionsContent: {
    flexDirection: 'row',
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActionButton: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActionButtonLeft: {
    paddingLeft: 2,
  },
  topActionButtonRight: {
    paddingRight: 2,
  },
  topActionButtonPressed: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  topActionDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#A0A0A0', // Darker gray for divider
  },
  toggleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  toggleButtonFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  toggleButtonContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Stripe 支付弹窗样式
  stripeBottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  stripeBottomSheetView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  stripeHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  stripeCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  stripeCloseButtonPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  stripeWebView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  stripeLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  stripeLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
});

