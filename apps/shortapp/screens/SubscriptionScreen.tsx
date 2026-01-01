/**
 * SubscriptionScreen - 订阅页面
 * 使用底部弹窗（BottomSheet）形式，带流动玻璃效果
 */

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import BottomSheet, {
  BottomSheetScrollView,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SubscriptionScreenComponent from '../components/SubscriptionScreen';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { BlurView } from '@react-native-community/blur';

export const SubscriptionScreen = () => {
  const navigation = useNavigation();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';

  // 优化动画配置以减少卡顿 - 使用更流畅的配置，减少抖动
  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 20,
    mass: 0.6,
    stiffness: 250,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.5,
  });

  const handleBack = useCallback(() => {
    bottomSheetRef.current?.close();
    // 等待关闭动画完成后再导航返回
    setTimeout(() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    }, 300);
  }, [navigation]);

  const handleUpgrade = useCallback(() => {
    // 升级成功后关闭底部弹窗并返回
    bottomSheetRef.current?.close();
    setTimeout(() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    }, 300);
  }, [navigation]);

  const handleSheetChange = useCallback((index: number) => {
    if (index === -1) {
      // 底部弹窗关闭时，导航返回（检查是否可以返回）
      setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 100);
    }
  }, [navigation]);

  // 使用百分比字符串作为 snapPoints，性能更好 - 调整为 92% 高度
  const snapPoints = useMemo(() => ['92%'], []);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <BottomSheet
        ref={bottomSheetRef}
        index={0} // 初始状态为展开
        snapPoints={snapPoints}
        enablePanDownToClose
        onChange={handleSheetChange}
        animationConfigs={animationConfigs}
        handleComponent={null}
        backgroundStyle={styles.bottomSheetBackground}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        enableDynamicSizing={false}
        animateOnMount={true}
      >
        {/* 流动玻璃效果背景 - clear 效果，带圆角 */}
        {isIOS && isLiquidGlassSupported ? (
          <LiquidGlassView
            style={styles.liquidGlassContainer}
            interactive
            effect="clear"
          >
            <View style={styles.glassContent}>
              <BottomSheetScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <SubscriptionScreenComponent
                  onBack={handleBack}
                  onUpgrade={handleUpgrade}
                />
              </BottomSheetScrollView>
            </View>
          </LiquidGlassView>
        ) : (
          <View style={styles.fallbackContainer}>
            <BlurView
              blurType="light"
              blurAmount={40}
              reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.95)"
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.glassContent}>
              <BottomSheetScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <SubscriptionScreenComponent
                  onBack={handleBack}
                  onUpgrade={handleUpgrade}
                />
              </BottomSheetScrollView>
            </View>
          </View>
        )}
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // 确保容器透明，不影响底层页面
  },
  bottomSheetBackground: {
    backgroundColor: 'transparent',
    // 圆角在 LiquidGlassView 上，这里保持透明
  },
  liquidGlassContainer: {
    flex: 1,
    borderTopLeftRadius: 28, // 圆角在这里
    borderTopRightRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  fallbackContainer: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  glassContent: {
    flex: 1,
    backgroundColor: 'transparent', // 透明，让流动玻璃效果显示
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});

