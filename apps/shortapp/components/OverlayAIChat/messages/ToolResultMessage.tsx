import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from '../../icons/SvgIcons';
import { ChatMessage } from '@vibecoding/ai-chat-core';

interface ToolResultMessageProps {
  message: ChatMessage;
  onPress?: () => void;
}

export default function ToolResultMessage({ message, onPress }: ToolResultMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // 检查是否是成功的结果
  const content = message.content || '';
  const isSuccess = !content.toLowerCase().includes('error') && 
                   !content.toLowerCase().includes('failed');

  return (
    <TouchableOpacity
      style={[
        styles.messageContainer,
        isSuccess ? styles.successContainer : styles.errorContainer
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Message Header */}
      <View style={styles.messageHeader}>
        <View style={styles.titleContainer}>
          <Icon 
            name={isSuccess ? "CheckmarkCircle" : "CloseCircle"} 
            size={16} 
            color={isSuccess ? "#30D158" : "#FF3B30"} 
          />
          <Text style={[
            styles.messageTitle,
            { color: isSuccess ? "#30D158" : "#FF3B30" }
          ]}>
            Tool Result
          </Text>
        </View>
        <TouchableOpacity onPress={toggleExpanded} style={styles.expandButton}>
          <Icon 
            name={isExpanded ? "ChevronUp" : "ChevronDown"} 
            size={16} 
            color={isSuccess ? "#30D158" : "#FF3B30"} 
          />
        </TouchableOpacity>
      </View>

      {/* Result Content */}
      <View style={styles.resultContainer}>
        {!isExpanded ? (
          <Text style={styles.resultPreview} numberOfLines={2}>
            {content}
          </Text>
        ) : (
          <View style={styles.fullResultContainer}>
            <Text style={styles.fullResultText}>{content}</Text>
          </View>
        )}
      </View>

      {/* Metadata */}
      {message.metadata && (
        <View style={styles.metadataContainer}>
          {message.metadata.toolId && (
            <Text style={styles.metadataText}>
              {`Tool ID: ${message.metadata.toolId}`}
            </Text>
          )}
          {message.metadata.sessionId && (
            <Text style={styles.metadataText}>
              {`Session: ${message.metadata.sessionId.slice(0, 8)}...`}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    maxWidth: '85%',
    borderLeftWidth: 4,
  },
  successContainer: {
    backgroundColor: '#F0F9F4',
    borderLeftColor: '#30D158',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderLeftColor: '#FF3B30',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  expandButton: {
    padding: 4,
  },
  resultContainer: {
    marginBottom: 8,
  },
  resultPreview: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 18,
  },
  fullResultContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  fullResultText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  metadataContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  metadataText: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 2,
  },
});
