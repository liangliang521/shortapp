import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Markdown from 'react-native-markdown-display';
import Icon from '../../icons/SvgIcons';
import { ChatMessage } from '@vibecoding/ai-chat-core';

interface AssistantMessageProps {
  message: ChatMessage;
  onPress?: () => void;
}

export default function AssistantMessage({ message, onPress }: AssistantMessageProps) {
  const content = message.content || '';

  return (
    <TouchableOpacity
      style={styles.messageContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Message Header */}
      <View style={styles.messageHeader}>
        <View style={styles.titleContainer}>
          <Icon 
            name="Assistant" 
            size={12} 
          />
          <Text style={styles.title}>
            Assistant
          </Text>
        </View>
      </View>

      {/* Message Content */}
      <Markdown style={markdownStyles}>
        {content}
      </Markdown>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    fontFamily: 'System',
  },
});

// Markdown 样式配置 - Assistant 消息（无背景，小字体）
const markdownStyles = {
  body: {
    fontSize: 15,
    lineHeight: 21,
    color: '#000000',
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
    color: '#000000',
  },
  heading1: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#000000',
    marginTop: 10,
    marginBottom: 6,
  },
  heading2: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#000000',
    marginTop: 8,
    marginBottom: 4,
  },
  heading3: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#000000',
    marginTop: 6,
    marginBottom: 4,
  },
  text_group: {
    fontSize: 15,
    lineHeight: 21,
    color: '#000000',
  },
  paragraph: {
    marginTop: 4,
    marginBottom: 4,
    color: '#000000',
    fontSize: 15,
    lineHeight: 21,
  },
  strong: {
    fontWeight: '700' as const,
    color: '#000000',
  },
  em: {
    fontStyle: 'italic' as const,
    color: '#000000',
  },
  code_inline: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    color: '#000000',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
  },
  code_block: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    color: '#000000',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 6,
    fontSize: 12,
  },
  fence: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    color: '#000000',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 6,
    fontSize: 12,
  },
  list_item: {
    color: '#000000',
    marginTop: 3,
    marginBottom: 3,
  },
  bullet_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  ordered_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  link: {
    color: '#007AFF',
    textDecorationLine: 'underline' as const,
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(0, 0, 0, 0.2)',
    paddingLeft: 10,
    marginTop: 6,
    marginBottom: 6,
    color: '#000000',
  },
};

