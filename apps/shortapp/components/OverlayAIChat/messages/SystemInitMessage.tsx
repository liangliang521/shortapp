import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChatMessage } from '@vibecoding/ai-chat-core';

interface SystemInitMessageProps {
  message: ChatMessage;
  onPress?: () => void;
}

export default function SystemInitMessage({ message, onPress }: SystemInitMessageProps) {
  const content = message.content || '';

  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <View style={styles.textContainer}>
        <Text style={styles.text}>{content}</Text>
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

