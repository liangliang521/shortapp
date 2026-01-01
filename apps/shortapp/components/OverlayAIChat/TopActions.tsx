import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from '../icons/SvgIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

interface TopActionsProps {
  onClearContext: () => void;
  isKeyboardVisible: boolean;
  onShare: () => void;
  onVersionHistoryPress?: () => void;
}

export default function TopActions({ onClearContext, isKeyboardVisible ,onShare=()=>{}, onVersionHistoryPress}: TopActionsProps) {
  const insets = useSafeAreaInsets();
  
  // 动画值：paddingTop 从 16 过渡到 insets.top + 4
  const paddingTopValue = useSharedValue(16);
  
  useEffect(() => {
    if (isKeyboardVisible) {
      // 键盘弹起时，减少顶部留白
      paddingTopValue.value = withTiming(insets.top+1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    } else {
      // 键盘收起时，恢复默认值
      paddingTopValue.value = withTiming(16, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [isKeyboardVisible, insets.top]);

  const animatedStyle = useAnimatedStyle(() => ({
    paddingTop: paddingTopValue.value,
  }));

  return (
    <Animated.View style={[
      styles.topActionsBar,
      animatedStyle
    ]}>
      <TouchableOpacity style={styles.topActionButton} onPress={onClearContext}>
        <Icon name="Broom" size={16} color="#8E8E93" />
      </TouchableOpacity>
      
      <Text style={styles.editAppTitle}>Edit app</Text>
      
      {/* 版本控制按钮 */}
      {onVersionHistoryPress ? (
        <TouchableOpacity 
          style={styles.topActionButton} 
          onPress={onVersionHistoryPress}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Icon name="VersionHistory" size={16} color="#8E8E93" />
        </TouchableOpacity>
      ) : (
        <View style={[styles.topActionButton, { backgroundColor: 'transparent' }]} />
      )}
      
      {/* <TouchableOpacity style={styles.topActionButton} onPress={onShare}>
        <Icon name="Share" size={16} color="#8E8E93" />
      </TouchableOpacity> */}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  topActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  topActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAppTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
});
