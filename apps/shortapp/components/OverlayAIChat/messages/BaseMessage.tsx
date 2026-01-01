import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Markdown from 'react-native-markdown-display';
import Icon from '../../icons/SvgIcons';
import { ChatMessage } from '@vibecoding/ai-chat-core';

interface BaseMessageProps {
  message: ChatMessage;
  onPress?: () => void;
  onUpgrade?: () => void;
  onContinue?: () => void;
}

export default function BaseMessage({ message, onPress, onUpgrade, onContinue }: BaseMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 长消息折叠设置
  const MAX_LENGTH = 300; // 最多显示300字符
  const content = message.content || '';
  const isLongMessage = content.length > MAX_LENGTH;
  const displayContent = isExpanded || !isLongMessage 
    ? content 
    : content.substring(0, MAX_LENGTH) + '...';
  const getMessageIcon = () => {
    switch (message.type) {
      case 'model_assistant_tool_use':
        return 'construct-outline';
      case 'model_assistant_tool_result':
        return 'checkmark-circle-outline';
      case 'model_result':
        return 'flag-outline';
      case 'sandbox':
        return 'cube-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getMessageColor = () => {
    switch (message.type) {
      case 'model_assistant_tool_use':
        return '#FF9500';
      case 'model_assistant_tool_result':
        return '#30D158';
      case 'model_result':
        return '#AF52DE';
      case 'sandbox':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getMessageTitle = () => {
    switch (message.type) {
      case 'model_assistant_tool_use':
        return 'Using Tool';
      case 'model_assistant_tool_result':
        return 'Tool Result';
      case 'model_result':
        return 'Coding Complete';
      case 'sandbox':
        return 'Sandbox Status';
      default:
        return 'Unknown';
    }
  };

  const iconName = getMessageIcon();
  const iconColor = getMessageColor();
  const title = getMessageTitle();

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
            color={iconColor} 
          />
          <Text style={[styles.messageTitle, { color: iconColor }]}>
            {title}
          </Text>
          {/* 图片数量显示 - 放在标题旁边 */}
          {message.metadata?.images && message.metadata.images.length > 0 && (
            <View style={styles.imageCountInline}>
              <Icon 
                name="Image" 
                size={14} 
                color="#8E8E93" 
              />
              <Text style={styles.imageCountText}>
                {message.metadata.images.length}
              </Text>
            </View>
          )}
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
      <Markdown style={markdownStylesAssistant}>
        {displayContent}
      </Markdown>

      {/* 升级按钮 - 只在升级提示消息中显示 */}
      {message.metadata?.isUpgradeHint && onUpgrade && (
        <TouchableOpacity 
          style={styles.upgradeButton}
          onPress={(e) => {
            e.stopPropagation();
            onUpgrade();
          }}
          activeOpacity={0.8}
        >
          <Icon name="Diamond" size={16} color="#FFFFFF" />
          <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
        </TouchableOpacity>
      )}

      {/* 继续按钮 - 只在达到最大轮次限制时显示 */}
      {message.metadata?.isContinueHint && onContinue && (
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={(e) => {
            e.stopPropagation();
            onContinue();
          }}
          activeOpacity={0.8}
        >
          <Icon name="ArrowForward" size={16} color="#FFFFFF" />
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      )}

      {/* 展开/折叠按钮 */}
      {isLongMessage && (
        <TouchableOpacity 
          onPress={() => setIsExpanded(!isExpanded)}
          style={styles.expandButton}
        >
          <Text style={styles.expandButtonTextAssistant}>
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
          {message.metadata.toolName && (
            <Text style={styles.metadataText}>
              {`Tool: ${message.metadata.toolName}`}
            </Text>
          )}
          {message.metadata.sandboxStatus && (
            <Text style={styles.metadataText}>
              {`Status: ${message.metadata.sandboxStatus}`}
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
    gap: 6,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusContainer: {
    opacity: 0.7,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#FF6B35', // 主题色橘色（与 home 按钮一致）
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
    justifyContent: 'center',
  },
  upgradeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#34C759', // 绿色表示可以继续
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 8, // 添加底部间距
    gap: 4,
  },
  expandButtonTextAssistant: {
    fontSize: 13,
    fontWeight: '500',
    color: '#007AFF',
  },
  // 图片数量 - 内联显示在标题旁边
  imageCountInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
  },
  imageCountText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
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
const markdownStylesAssistant = {
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
