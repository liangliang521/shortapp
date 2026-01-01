/**
 * ModalScreenWrapper - Modal 页面安全区域包装组件
 * 为 modal 页面提供正确的安全区域上下文
 */

import React from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';

interface ModalScreenWrapperProps {
  children: React.ReactNode;
  /**
   * 安全区域边缘，默认为 ['top', 'bottom']
   */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  /**
   * 容器样式
   */
  style?: any;
}

export const ModalScreenWrapper: React.FC<ModalScreenWrapperProps> = ({
  children,
  edges = ['top', 'bottom'],
  style,
}) => {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, style]} edges={edges}>
        {children}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

