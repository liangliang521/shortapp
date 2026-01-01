import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Markdown from 'react-native-markdown-display';
import Icon from '../../icons/SvgIcons';
import { ChatMessage } from '@vibecoding/ai-chat-core';

interface UserInputMessageProps {
  message: ChatMessage;
  onPress?: () => void;
}

export default function UserInputMessage({ message, onPress }: UserInputMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 长消息折叠设置
  const MAX_LENGTH = 300; // 最多显示300字符
  const content = message.content || '';
  const isLongMessage = content.length > MAX_LENGTH;
  const displayContent = isExpanded || !isLongMessage 
    ? content 
    : content.substring(0, MAX_LENGTH) + '...';

  return (
    <TouchableOpacity
      style={[styles.messageContainer, styles.assistantMessage]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Message Header */}
      <View style={styles.messageHeader}>
        <View style={styles.titleContainer}>
          <Icon 
            name="Person" 
            size={18} 
            color="#007AFF" 
          />
          <Text style={[styles.messageTitle, { color: '#007AFF' }]}>
            User Input
          </Text>
        </View>
        {message.status && (
          <View style={styles.statusContainer}>
            <Icon
              name={message.status === 'sending' ? 'Time' : 
                   message.status === 'sent' ? 'CheckmarkCircle' : 
                   'CloseCircle'}
              size={12}
              color={message.status === 'failed' ? '#FF3B30' : '#8E8E93'}
            />
          </View>
        )}
      </View>

      {/* Message Content */}
      <Markdown style={markdownStyles}>
        {displayContent}
      </Markdown>

      {/* 展开/折叠按钮 */}
      {isLongMessage && (
        <TouchableOpacity 
          onPress={() => setIsExpanded(!isExpanded)}
          style={styles.expandButton}
        >
          <Text style={styles.expandButtonText}>
            {isExpanded ? 'Show less' : 'Show more'}
          </Text>
          <Icon 
            name={isExpanded ? "ChevronUp" : "ChevronDown"} 
            size={14} 
            color="#007AFF"
          />
        </TouchableOpacity>
      )}

      {/* Message Metadata */}
      {message.metadata && (
        <View style={styles.metadataContainer}>
          {message.metadata.model && (
            <Text style={styles.metadataText}>
              {`Model: ${message.metadata.model}`}
            </Text>
          )}
          {message.metadata.tokens && (
            <Text style={styles.metadataText}>
              {`Tokens: ${message.metadata.tokens}`}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    maxWidth: '85%',
    borderRadius: 12,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2F2F7',
    borderBottomLeftRadius: 4,
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
    gap: 4,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusContainer: {
    opacity: 0.7,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 8, // 添加底部间距
    gap: 4,
  },
  expandButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#007AFF',
  },
  metadataContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(142, 142, 147, 0.2)',
  },
  metadataText: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 2,
  },
});

// Markdown 样式配置 - AI 助手消息
const markdownStyles = {
  body: {
    fontSize: 17,
    lineHeight: 21,
    color: '#000000',
  },
  heading1: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#000000',
    marginTop: 12,
    marginBottom: 8,
  },
  heading2: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#000000',
    marginTop: 10,
    marginBottom: 6,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#000000',
    marginTop: 8,
    marginBottom: 4,
  },
  paragraph: {
    marginTop: 6,
    marginBottom: 6,
    color: '#000000',
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
    fontSize: 14,
  },
  code_block: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    color: '#000000',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
  },
  fence: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    color: '#000000',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
  },
  list_item: {
    color: '#000000',
    marginTop: 4,
    marginBottom: 4,
  },
  bullet_list: {
    marginTop: 6,
    marginBottom: 6,
  },
  ordered_list: {
    marginTop: 6,
    marginBottom: 6,
  },
  link: {
    color: '#007AFF',
    textDecorationLine: 'underline' as const,
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(0, 0, 0, 0.2)',
    paddingLeft: 12,
    marginTop: 8,
    marginBottom: 8,
    color: '#000000',
  },
};

