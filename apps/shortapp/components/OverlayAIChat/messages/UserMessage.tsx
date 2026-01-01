import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import Markdown from 'react-native-markdown-display';
import Icon from '../../icons/SvgIcons';
import { ChatMessage } from '@vibecoding/ai-chat-core';
import ServerImage from '../../ServerImage';
import Clipboard from '@react-native-clipboard/clipboard';

interface UserMessageProps {
  message: ChatMessage;
  onPress?: () => void;
  onUpgrade?: () => void;
  onContinue?: () => void;
}

export default function UserMessage({ message, onPress, onUpgrade, onContinue }: UserMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 长消息折叠设置
  const MAX_LENGTH = 300; // 最多显示300字符
  const content = message.content || '';
  
  // 如果 content 为空或 null，不显示该消息
  if (!content || content.trim() === '') {
    return null;
  }
  
  const isLongMessage = content.length > MAX_LENGTH;
  const displayContent = isExpanded || !isLongMessage 
    ? content 
    : content.substring(0, MAX_LENGTH) + '...';

  const handleCopy = () => {
    if (!content) return;
    Clipboard.setString(content);
    Alert.alert('已复制', '消息内容已复制到剪贴板');
  };

  return (
    <View style={styles.messageContainer}>
      {/* 灰色背景包裹文字内容 */}
      <View style={styles.userMessage}>
        <View style={styles.contentWrapper}>
          <Markdown style={markdownStyles}>
            {displayContent}
          </Markdown>
        </View>

      {/* 图片缩略图网格 */}
      {(message.metadata?.localImages || message.metadata?.images) && (
        <View style={styles.imageGrid}>
          {/* 优先显示本地图片（base64），如果不存在则显示服务器图片 */}
          {(message.metadata?.localImages || message.metadata?.images)?.map((imageUrl: string, index: number) => (
            <View key={index} style={styles.imageThumbnailContainer}>
              {message.metadata?.localImages?.[index] ? (
                // 显示本地base64图片（无需网络请求）
                <Image
                  source={{ uri: message.metadata.localImages[index] }}
                  style={styles.imageThumbnail}
                  resizeMode="cover"
                />
              ) : message.metadata?.projectId ? (
                // 显示服务器图片（需要授权和projectId）
                <ServerImage
                  projectId={message.metadata.projectId}
                  imagePath={imageUrl}
                  style={styles.imageThumbnail}
                  resizeMode="cover"
                />
              ) : (
                // 缺少projectId，显示占位符
                <View style={[styles.imageThumbnail, { backgroundColor: 'rgba(142, 142, 147, 0.2)' }]} />
              )}
            </View>
          ))}
        </View>
      )}

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
      </View>

      {/* 复制按钮 - 在灰色框外部，底部右侧 */}
      <View style={styles.copyButtonContainer}>
        <TouchableOpacity 
          style={styles.copyButton}
          onPress={handleCopy}
          activeOpacity={0.8}
        >
          <Icon name="Copy" size={15} color="#CBCBCB" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    width: '100%',
  },
  userMessage: {
    width: '100%',
    backgroundColor: '#F2F2F7', // 浅灰色背景
    borderRadius: 12,
  },
  contentWrapper: {
    paddingHorizontal: 12, // 文字内容的内边距
    paddingVertical: 6,
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
    color: '#000000',
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
    marginHorizontal: 12, // 与 contentWrapper 的 padding 对齐
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
    marginHorizontal: 12, // 与 contentWrapper 的 padding 对齐
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
    marginHorizontal: 12, // 与 contentWrapper 的 padding 对齐
    gap: 4,
  },
  expandButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#007AFF',
  },
  // 图片缩略图网格
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -4, // 减小与文字的间距
    paddingHorizontal: 12, // 与 contentWrapper 的 padding 对齐
    marginHorizontal: -4, // 负边距来抵消item的margin
  },
  imageThumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.2)',
    margin: 4, // 替代gap
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
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
    paddingHorizontal: 12, // 与 contentWrapper 的 padding 对齐
  },
  metadataText: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 2,
  },
  copyButtonContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  copyButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Markdown 样式配置 - 用户消息
const markdownStyles = {
  body: {
    fontSize: 15,
    lineHeight: 21,
    color: '#000000',
  },
  heading1: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#000000',
    marginTop: 10,
    marginBottom: 6,
  },
  heading2: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#000000',
    marginTop: 8,
    marginBottom: 4,
  },
  heading3: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#000000',
    marginTop: 6,
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

