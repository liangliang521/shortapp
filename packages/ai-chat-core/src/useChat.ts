import { useEffect } from 'react';
import { useChatStore } from './chatStore';
import { UseChatReturn } from './types';

/**
 * AI 聊天 Hook
 * 提供完整的聊天功能，包括连接管理、会话管理、消息发送等
 */
export function useChat(): UseChatReturn {
    const store = useChatStore();

    // 自动连接
    useEffect(() => {
        if (store.connectionStatus === 'disconnected') {
            store.connect().catch(console.error);
        }

        // 清理函数
        return () => {
            store.disconnect();
        };
    }, []);

    return {
        // 状态
        state: {
            connectionStatus: store.connectionStatus,
            sessions: store.sessions,
            currentSessionId: store.currentSessionId,
            messages: store.messages,
            isSending: store.isSending,
            isTyping: store.isTyping,
            settings: store.settings,
            error: store.error,
        },

        // 连接管理
        connect: store.connect,
        disconnect: store.disconnect,

        // 会话管理
        createSession: store.createSession,
        switchSession: store.switchSession,
        deleteSession: store.deleteSession,
        updateSession: store.updateSession,

        // 消息管理
        sendMessage: store.sendMessage,
        clearMessages: store.clearMessages,

        // 设置管理
        updateSettings: store.updateSettings,

        // 错误处理
        clearError: store.clearError,
    };
}

/**
 * 轻量级聊天 Hook（仅消息功能）
 * 适用于只需要发送和接收消息的场景
 */
export function useChatMessages() {
    const chat = useChat();

    return {
        messages: chat.state.messages,
        sendMessage: chat.sendMessage,
        isSending: chat.state.isSending,
        isTyping: chat.state.isTyping,
        error: chat.state.error,
        clearError: chat.clearError,
        clearMessages: chat.clearMessages,
    };
}

/**
 * 会话管理 Hook
 * 专门用于管理聊天会话
 */
export function useChatSessions() {
    const chat = useChat();
    const currentSession = chat.state.sessions.find(s => s.id === chat.state.currentSessionId);

    return {
        sessions: chat.state.sessions,
        currentSession,
        currentSessionId: chat.state.currentSessionId,
        createSession: chat.createSession,
        switchSession: chat.switchSession,
        deleteSession: chat.deleteSession,
        updateSession: chat.updateSession,
    };
}

/**
 * 连接状态 Hook
 * 专门用于监控连接状态
 */
export function useChatConnection() {
    const chat = useChat();

    return {
        connectionStatus: chat.state.connectionStatus,
        isConnected: chat.state.connectionStatus === 'connected',
        isConnecting: chat.state.connectionStatus === 'connecting',
        isReconnecting: chat.state.connectionStatus === 'reconnecting',
        connect: chat.connect,
        disconnect: chat.disconnect,
    };
}
