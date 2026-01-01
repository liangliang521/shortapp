import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Markdown from 'react-native-markdown-display';
import Icon from '../../icons/SvgIcons';
import { ChatMessage } from '@vibecoding/ai-chat-core';

interface ResultMessageProps {
  message: ChatMessage;
  onPress?: () => void;
}

export default function ResultMessage({ message, onPress }: ResultMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // 检查是否是错误状态
  const isError = message.status === 'failed';

  if(!message.content){
    return null;
  }

  return (
    <TouchableOpacity
      style={[
        styles.messageContainer,
        isError ? styles.errorContainer : styles.successContainer
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Message Header */}
      <View style={styles.messageHeader}>
        <View style={styles.titleContainer}>
          <Icon 
            name={isError ? "AlertCircle" : "CheckmarkCircle"} 
            size={16} 
            color={isError ? "#FF3B30" : "#AF52DE"} 
          />
          <Text style={[
            styles.messageTitle,
            { color: isError ? "#FF3B30" : "#AF52DE" }
          ]}>
            {isError ? 'Session Failed' : 'Coding Complete'}
          </Text>
        </View>
        <TouchableOpacity onPress={toggleExpanded} style={styles.expandButton}>
          <Icon 
            name={isExpanded ? "ChevronUp" : "ChevronDown"} 
            size={16} 
            color={isError ? "#FF3B30" : "#AF52DE"} 
          />
        </TouchableOpacity>
      </View>

      {/* Result Content */}
      <View style={styles.resultContainer}>
        {!isExpanded ? (
          <View style={styles.resultPreviewContainer}>
            <Markdown style={markdownStylesResult}>
              {message.content ? (message.content.length > 200 ? message.content.substring(0, 200) + '...' : message.content) : ''}
            </Markdown>
          </View>
        ) : (
          <View style={styles.fullResultContainer}>
            <Markdown style={markdownStylesResult}>
              {message.content || ''}
            </Markdown>
          </View>
        )}
      </View>

      {/* Metadata */}
      {/* {message.metadata && (
        <View style={styles.metadataContainer}>
          {message.metadata.sessionId && (
            <Text style={styles.metadataText}>
              {`Session: ${message.metadata.sessionId.slice(0, 8)}...`}
            </Text>
          )}
          {message.metadata.tokens && (
            <Text style={styles.metadataText}>
              {`Tokens Used: ${message.metadata.tokens}`}
            </Text>
          )}
        </View>
      )} */}

      {/* Expand Indicator */}
      {message.content && message.content.length > 100 && (
        <View style={styles.expandIndicator}>
          <Text style={styles.expandText}>
            {isExpanded ? 'Tap to collapse' : 'Tap to expand'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    alignSelf: 'center',
    borderRadius: 16,
    maxWidth: '90%',
    borderWidth: 2,
  },
  successContainer: {
    backgroundColor: '#F8F5FF',
    borderColor: '#AF52DE',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FF3B30',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  expandButton: {
    padding: 4,
  },
  resultContainer: {
    marginBottom: 12,
  },
  resultPreview: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 20,
    textAlign: 'center',
  },
  fullResultContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  fullResultText: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 20,
  },
  metadataContainer: {
    marginBottom: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  metadataText: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
    textAlign: 'center',
  },
  expandIndicator: {
    alignItems: 'center',
  },
  expandText: {
    fontSize: 11,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  resultPreviewContainer: {
    maxHeight: 80,
    overflow: 'hidden',
  },
});

// Markdown 样式配置 - Result 消息
const markdownStylesResult = {
  body: {
    fontSize: 16,
    lineHeight: 21,
    color: '#333333',
  },
  heading1: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#333333',
    marginTop: 10,
    marginBottom: 6,
  },
  heading2: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#333333',
    marginTop: 8,
    marginBottom: 4,
  },
  heading3: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#333333',
    marginTop: 6,
    marginBottom: 4,
  },
  paragraph: {
    marginTop: 4,
    marginBottom: 4,
    color: '#333333',
  },
  strong: {
    fontWeight: '700' as const,
    color: '#333333',
  },
  em: {
    fontStyle: 'italic' as const,
    color: '#333333',
  },
  code_inline: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    color: '#333333',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 13,
  },
  code_block: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    color: '#333333',
    padding: 10,
    borderRadius: 6,
    marginTop: 6,
    marginBottom: 6,
    fontSize: 13,
  },
  fence: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    color: '#333333',
    padding: 10,
    borderRadius: 6,
    marginTop: 6,
    marginBottom: 6,
    fontSize: 13,
  },
  list_item: {
    color: '#333333',
    marginTop: 2,
    marginBottom: 2,
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
    color: '#333333',
  },
};
