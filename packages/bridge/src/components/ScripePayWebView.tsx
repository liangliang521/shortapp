/**
 * ScripePayWebView - Stripe 支付弹窗组件（使用 BottomSheet + WebView）
 * 处理支付加载、成功/取消回调
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import BottomSheet, { BottomSheetView, useBottomSheetSpringConfigs } from '@gorhom/bottom-sheet';
import { WebView } from 'react-native-webview';
import { StopCircleIcon } from './icons'; // export an alias icon in this folder

type ScripeStatus = 'success' | 'cancel' | 'error';

interface ScripePayWebViewProps {
  visible: boolean;
  paymentUrl: string | null;
  successUrl?: string | null;
  cancelUrl?: string | null;
  onResult: (status: ScripeStatus, message?: string) => void;
  onClose: () => void;
}

export default function ScripePayWebView({
  visible,
  paymentUrl,
  successUrl,
  cancelUrl,
  onResult,
  onClose,
}: ScripePayWebViewProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['90%'], []);
  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 20,
    mass: 0.6,
    stiffness: 250,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.5,
  });

  useEffect(() => {
    if (visible && paymentUrl) {
      setTimeout(() => sheetRef.current?.expand(), 50);
    }
  }, [visible, paymentUrl]);

  if (!visible || !paymentUrl) return null;

  const handleClose = () => {
    onResult('cancel', 'Payment cancelled by user');
    onClose();
  };

  const handleNavigation = (url: string) => {
    if (successUrl && url.includes(successUrl)) {
      onResult('success');
      onClose();
      return false;
    }
    if (cancelUrl && url.includes(cancelUrl)) {
      onResult('cancel', 'Payment cancelled');
      onClose();
      return false;
    }
    return true;
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={(index) => {
        if (index === -1) {
          onResult('cancel', 'Payment cancelled by user');
          onClose();
        }
      }}
      animationConfigs={animationConfigs}
      handleComponent={null}
      backgroundStyle={styles.sheetBackground}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      enableDynamicSizing={false}
      animateOnMount={true}
    >
      <BottomSheetView style={styles.sheetView}>
        {/* 关闭按钮 */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}
            onPress={handleClose}
          >
            <StopCircleIcon size={20} color="#737373" />
          </Pressable>
        </View>

        {/* 支付 WebView */}
        <WebView
          source={{ uri: paymentUrl }}
          style={styles.webView}
          onNavigationStateChange={(navState) => {
            handleNavigation(navState.url);
          }}
          onShouldStartLoadWithRequest={(request) => {
            return handleNavigation(request.url);
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('💳 [ScripePayWebView] WebView error:', nativeEvent);
            onResult('error', nativeEvent.description || 'Payment error occurred');
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('💳 [ScripePayWebView] WebView HTTP error:', nativeEvent);
          }}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF5C00" />
              <Text style={styles.loadingText}>Loading payment...</Text>
            </View>
          )}
        />
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closeButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  closeButtonPressed: {
    opacity: 0.7,
  },
  webView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
});

