import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  ActivityIndicator,
} from 'react-native';
import Icon from '../icons/SvgIcons';
import { ChatMessage } from '@vibecoding/ai-chat-core';
import MessageRenderer from './messages/MessageRenderer';
import IdeaStarterEmptyState from '../IdeaStarterEmptyState';

interface ChatContentProps {
  messages: ChatMessage[];
  isTyping: boolean;
  error: string | null;
  onChatAreaPress: () => void;
  onClearError: () => void;
  onSuggestedPrompt: (prompt: string) => void;
  // 加载更多历史记录（从顶部开始，向上滚动接近顶部时自动触发）
  onRefresh?: () => void;
  // 历史记录是否正在加载中（由父组件传入）
  refreshing?: boolean;
  onUpgrade?: () => void;
  onContinue?: () => void;
  onSkip?: () => void;
  isInitialLoadComplete: boolean;
  contentPaddingBottom?: number; // 可选的底部 padding，用于不同页面自定义
  isCodingComplete?: boolean; // 编码完成状态
  isSandboxReady?: boolean; // 沙盒启动成功状态
  projectId?: string; // 项目ID，用于某些消息组件（如 StripeActionMessage）
}


// Typing indicator with animation
function TypingIndicator({ isCodingComplete = false, isSandboxReady = false }: { isCodingComplete?: boolean; isSandboxReady?: boolean }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dotValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dotValue, {
            toValue: -8,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dotValue, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation = Animated.parallel([
      animateDot(dot1, 0),
      animateDot(dot2, 150),
      animateDot(dot3, 300),
    ]);

    animation.start();

    return () => animation.stop();
  }, []);

  return (
    <View style={styles.typingIndicator}>
      <Icon name="Thinking" size={20} />
      <Text style={styles.typingText}>
        {isCodingComplete
          ? 'Refreshing mini app' 
          : 'AI is thinking'}
      </Text>
      <View style={styles.typingDotsContainer}>
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1 }] }]} />
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2 }] }]} />
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3 }] }]} />
      </View>
    </View>
  );
}

export default function ChatContent({
  messages,
  isTyping,
  error,
  onChatAreaPress,
  onClearError,
  onSuggestedPrompt,
  onRefresh,
  refreshing = false,
  onUpgrade,
  onContinue,
  onSkip,
  isInitialLoadComplete,
  contentPaddingBottom = 0, // 默认值 200px，用于 OverlayAIChat
  isCodingComplete = false,
  isSandboxReady = false,
  projectId,
}: ChatContentProps) {
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [hasScrolledOnce, setHasScrolledOnce] = useState(false);

  // 记录是否在底部（inverted 模式下，offset 0 是底部），用于控制新消息是否自动滚动
  const [isAtBottom, setIsAtBottom] = useState(true);

  const handleListScroll = useCallback((event: any) => {
    // const { contentOffset } = event.nativeEvent;
    // // inverted 模式下，offset 0 表示在底部（最新消息）
    // const paddingToBottom = 20;
    // const isBottom = contentOffset.y <= paddingToBottom;
    // setIsAtBottom(isBottom);
  }, []);

  // 初始加载完成后自动滚动到 offset 0（inverted 模式下，0 是最新消息的位置）
  // useEffect(() => {
  //   if (isInitialLoadComplete && messages.length > 0 && !hasScrolledOnce) {
  //     setTimeout(() => {
  //       listRef.current?.scrollToOffset({ offset: 0, animated: false });
  //       setHasScrolledOnce(true);
  //       setIsAtBottom(true);
  //     }, 100);
  //   }
  // }, [isInitialLoadComplete, messages.length, hasScrolledOnce]);

  // 新消息到来时，如果用户在底部，则自动滚动到 offset 0
  useEffect(() => {
    if ((messages.length > 0 || isTyping) && isAtBottom && hasScrolledOnce) {
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 80);
    }
  }, [messages.length, isTyping, isAtBottom, hasScrolledOnce]);

  // 加载历史消息（inverted 模式下，onEndReached 在滚动到"顶部"时触发）
  const handleEndReached = useCallback(() => {
    if (onRefresh && !refreshing) {
      onRefresh();
    }
  }, [onRefresh, refreshing]);

  // 渲染单条消息
  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageRenderer
        key={item.id}
        message={item}
        onPress={onChatAreaPress}
        onUpgrade={onUpgrade}
        onContinue={onContinue}
        onSkip={onSkip}
        projectId={projectId}
      />
    ),
    [onChatAreaPress, onUpgrade, onContinue, onSkip, projectId],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  return (
    <View style={styles.chatContent}>
      {/* 初始加载历史记录时的全屏 loading */}
      {!isInitialLoadComplete && messages.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading chat history...</Text>
        </View>
      ) : null}

      {/* 欢迎空状态 */}
      {isInitialLoadComplete && messages.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <IdeaStarterEmptyState onBannerPress={onSuggestedPrompt} />
        </View>
      ) : null}

      {messages.length > 0 && (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.chatContentContainer,
            { paddingTop: contentPaddingBottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // 🔥 使用 inverted 模式：数据按时间正序，视觉上倒过来
          // 新消息在数组尾部，历史消息在数组头部
          // 因为 inverted，视觉上历史消息是在"底部"追加，天然不跳
          inverted
          onScroll={handleListScroll}
          scrollEventThrottle={16}
          // inverted 模式下，onEndReached 在滚动到"顶部"（实际是旧消息）时触发
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          // inverted 模式下，ListHeaderComponent 显示在底部（最新消息下方）
          ListHeaderComponent={
            <>
              {/* AI input indicator */}
              {isTyping && (
                <View style={styles.typingContainer}>
                  <TypingIndicator
                    isCodingComplete={isCodingComplete}
                    isSandboxReady={isSandboxReady}
                  />
                </View>
              )}
              {/* Error message */}
              {error && (
                <View style={[styles.messageContainer, styles.errorMessage]}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity onPress={onClearError} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyStateContainer: {
    paddingHorizontal: 20,
  },
  chatContent: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  chatContentContainer: {
    paddingTop: 20,
    paddingBottom: 0, // 通过 props 动态覆盖
    flexGrow: 1,
    // inverted 模式下，justifyContent: 'flex-end' 让少量消息贴到底部
    justifyContent: 'flex-end',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  typingContainer: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    marginLeft: 16, // 添加左边距
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    color: '#454545',
    fontWeight: '500',
  },
  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B20', // 主题色
    marginHorizontal: 2,
  },
  errorMessage: {
    backgroundColor: '#FFE6E6',
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF3B30',
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
