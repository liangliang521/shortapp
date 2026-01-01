import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ChatMessage } from '@vibecoding/ai-chat-core';
import {
  BaseMessage,
  UserMessage,
  AssistantMessage,
  UserInputMessage,
  SystemInitMessage,
  ToolUseMessage,
  ToolResultMessage,
  ResultMessage,
  SandboxMessage,
  TodoWriteMessage,
  StripeActionMessage,
  VersionRestoreMessage,
} from './index';

interface MessageRendererProps {
  message: ChatMessage;
  onPress?: () => void;
  onUpgrade?: () => void;
  onContinue?: () => void;
  onSkip?: () => void;
  projectId?: string;
}

export default function MessageRenderer({ message, onPress, onUpgrade, onContinue, onSkip, projectId }: MessageRendererProps) {
  // 根据消息类型渲染不同的组件
  let messageComponent;
  
  switch (message.type) {
    case 'model_assistant_tool_use':
      // 特殊处理 TodoWrite 工具
      if (message.metadata?.toolName === 'TodoWrite') {
        messageComponent = <TodoWriteMessage message={message} onPress={onPress} />;
        break;
      }
      
      messageComponent = <ToolUseMessage message={message} onPress={onPress} />;
      // 如果 ToolUseMessage 返回 null，整个组件不渲染
      if (!messageComponent) {
        return null;
      }
      break;
    
    case 'model_assistant_tool_result':
      // 🚫 过滤掉 tool result 消息，不显示
      return null;
    
    case 'model_result':
      // 🚫 过滤掉 "CODING COMPLETE" 消息，不显示
      return null;
    
    case 'sandbox':
      messageComponent = (
        <View style={styles.sandboxWrapper}>
          <SandboxMessage message={message} onPress={onPress} />
        </View>
      );
      break;
    
    case 'model_assistant_text':
      messageComponent = <AssistantMessage message={message} onPress={onPress} />;
      break;
    
    case 'model_user':
      messageComponent = <UserInputMessage message={message} onPress={onPress} />;
      break;
    
    case 'model_system_init':
      messageComponent = <SystemInitMessage message={message} onPress={onPress} />;
      break;
    
    case 'user':
      // 检查是否是版本回滚消息
      if (message.metadata?.revertVersion) {
        messageComponent = <VersionRestoreMessage message={message} onPress={onPress} />;
        break;
      }
      // 如果 content 为空或 null，不显示该消息
      if (!message.content || message.content.trim() === '') {
        return null;
      }
      messageComponent = <UserMessage message={message} onPress={onPress} onUpgrade={onUpgrade} onContinue={onContinue} />;
      break;
    
    case 'action':
      // 处理 action 类型的消息
      if (message.metadata?.subtype === 'stripe') {
        messageComponent = <StripeActionMessage message={message} onPress={onPress} onContinue={onContinue} onSkip={onSkip} projectId={projectId} />;
        break;
      }
      // 其他 action 类型可以在这里添加
      messageComponent = <BaseMessage message={message} onPress={onPress} onUpgrade={onUpgrade} onContinue={onContinue} />;
      break;
    
    // 默认使用BaseMessage渲染其他类型
    default:
      messageComponent = <BaseMessage message={message} onPress={onPress} onUpgrade={onUpgrade} onContinue={onContinue} />;
      break;
  }

  return (
    <View style={styles.messageWrapper}>
      {messageComponent}
    </View>
  );
}

const styles = StyleSheet.create({
  messageWrapper: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sandboxWrapper: {
    marginHorizontal: -1, 
    marginBottom: 10,
  },
});
