/**
 * VersionRestoreMessage - 版本回滚消息组件
 * 显示为一条横线，中间有文案 "Version restored"
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChatMessage } from '@vibecoding/ai-chat-core';

interface VersionRestoreMessageProps {
  message: ChatMessage;
  onPress?: () => void;
}

export default function VersionRestoreMessage({ message, onPress }: VersionRestoreMessageProps) {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <View style={styles.textContainer}>
        <Text style={styles.text}>Version restored</Text>
      </View>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  textContainer: {
    paddingHorizontal: 12,
  },
  text: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
});

