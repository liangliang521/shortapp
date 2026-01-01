/**
 * WebPreview - Web 项目预览组件
 * 用于显示 web 类型项目的预览
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  NativeBridge,
  ACTIONS,
  isAllowedAction,
  handleWebViewMessage,
  PushStripePayload,
} from '@vibecoding/web-rn-bridge';

export interface WebPreviewProps {
  previewUrl: string;
  projectId: string;
  onMessage?: (data: string) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: string) => void;
  onShowCameraPermissionModal?: () => void;
  onPushStripe?: (payload: PushStripePayload) => void;
}

export interface WebPreviewRef {
  refresh: () => void;
  sendStripeResult: (requestId: string, status: 'success' | 'cancel' | 'error', message?: string) => void;
}

const WebPreview = React.forwardRef<WebPreviewRef, WebPreviewProps>(({
  previewUrl,
  projectId,
  onMessage,
  onLoadStart: onLoadStartProp,
  onLoadEnd: onLoadEndProp,
  onError: onErrorProp,
  onShowCameraPermissionModal,
  onPushStripe,
}, ref) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  // 发送消息到 Web（统一出口，白名单协议）
  const sendToWeb = useCallback((payload: any) => {
    const action = payload?.action || payload?.event;
    if (!isAllowedAction(action)) return;
    NativeBridge.send(webViewRef, payload);
  }, []);

  // 处理来自 Web 的消息（相机权限 / pushScripe）
  const handleWebMessage = useCallback(async (data: string) => {
    if (!projectId) {
      console.warn('⚠️ [WebPreview] No projectId, skip message handling');
      return;
    }

    const handled = await handleWebViewMessage(data, {
      projectId,
      sendToWeb,
      onShowCameraPermissionModal: onShowCameraPermissionModal || (() => {}),
      onPushStripe: onPushStripe || (() => {}),
    });

    // 已在 handler 处理（相机权限/Stripe），直接返回
    if (handled) return;

    // 其他消息类型传递给父组件处理
    if (onMessage) {
      onMessage(data);
    }
  }, [projectId, sendToWeb, onMessage, onShowCameraPermissionModal, onPushStripe]);

  // 刷新 WebView 的函数
  const handleRefreshWebView = useCallback(() => {
    console.log('🔄 [WebPreview] Refreshing WebView...');
    if (webViewRef.current) {
      webViewRef.current.reload();
      console.log('✅ [WebPreview] WebView reload triggered');
    } else {
      console.warn('⚠️ [WebPreview] WebView ref is not available');
    }
  }, []);

  // 发送 Stripe 支付结果到 WebView
  const sendStripeResult = useCallback((requestId: string, status: 'success' | 'cancel' | 'error', message?: string) => {
    console.log('💳 [WebPreview] Sending Stripe payment result:', { requestId, status, message });
    sendToWeb({
      type: 'event',
      action: ACTIONS.STRIPE_RESULT,
      requestId,
      status,
      message,
    });
  }, [sendToWeb]);

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    refresh: handleRefreshWebView,
    sendStripeResult,
  }), [handleRefreshWebView, sendStripeResult]);

  // 初始化 WebView Bridge
  useEffect(() => {
    if (!webViewRef.current) {
      return;
    }

    console.log('🌉 [WebPreview] Initializing WebView Bridge...');

    // 发送应用就绪事件
    setTimeout(() => {
      webViewRef.current?.injectJavaScript(`
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'notification',
          event: 'app.ready',
          data: {
            version: '1.0.0',
            platform: '${Platform.OS}',
          },
        }));
      `);
    }, 1000);

    return () => {
      console.log('🔌 [WebPreview] Destroying WebView Bridge...');
    };
  }, []);

  const handleWebViewLoadStart = () => {
    setLoading(true);
    setError(null);
    onLoadStartProp?.();
  };

  const handleWebViewLoadEnd = () => {
    setLoading(false);
    onLoadEndProp?.();
    
    // 注入测试代码：页面加载完成后发送测试消息
    if (webViewRef.current) {
      const testScript = `
        (function() {
          console.log('[Test] Page loaded, sending test message...');
          if (window.ReactNativeWebView) {
            const testMessage = {
              type: 'test',
              action: 'test.message',
              data: {
                message: 'Hello from WebView!',
                timestamp: Date.now()
              }
            };
            console.log('[Test] Sending message:', testMessage);
            window.ReactNativeWebView.postMessage(JSON.stringify(testMessage));
            console.log('[Test] Message sent successfully');
          } else {
            console.error('[Test] window.ReactNativeWebView is not available!');
          }
        })();
        true; // 必须返回 true
      `;
      
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(testScript);
        console.log('✅ [WebPreview] Test message script injected');
      }, 500); // 延迟 500ms 确保页面完全加载
    }
  };

  const handleWebViewError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    const errorMessage = nativeEvent.description || 'Failed to load page';
    setError(errorMessage);
    setLoading(false);
    onErrorProp?.(errorMessage);
  };

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

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: previewUrl }}
        style={styles.webview}
        onLoadStart={handleWebViewLoadStart}
        onLoadEnd={handleWebViewLoadEnd}
        onError={handleWebViewError}
        onMessage={(event) => {
          const messageData = event.nativeEvent.data;
          console.log('🔍 [WebPreview] Received message:', messageData);
          console.log('🔍 [WebPreview] Message type:', typeof messageData);
          console.log('🔍 [WebPreview] Message length:', messageData?.length);
          if (messageData) {
            handleWebMessage(messageData);
          } else {
            console.warn('⚠️ [WebPreview] Received empty message');
          }
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsBackForwardNavigationGestures={true}
        mediaCapturePermissionGrantType="prompt"
        allowsFullscreenVideo={true}
        allowsPictureInPictureMediaPlayback={true}
        allowsInlineMediaPlayback={true}
        allowsAirPlayForMediaPlayback={true}
        // 关闭 Apple Pay，否则 injectJavaScript 会被阻止（"Cannot run javascript when apple pay is enabled"）
        enableApplePay={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
});

WebPreview.displayName = 'WebPreview';

export default WebPreview;
