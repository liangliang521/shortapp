/**
 * 项目聊天 Hook
 * 使用真实的 API 服务和 WebSocket 服务
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
    httpClient,
    apiConfig,
    WebSocketMessage,
    WebSocketMessageType,
    ModelResponseMessage,
    SandboxStatusMessage,
    Project,
    User,
} from '@vibecoding/api-client';
import { websocketClient } from './websocketClient';

/**
 * 项目聊天消息
 */
export interface ProjectChatMessage {
    id: string;
    content: string;
    role: 'user' | 'assistant' | 'system';
    timestamp: number;
    isStreaming?: boolean;
    error?: string;
}

/**
 * 项目聊天状态
 */
export interface ProjectChatState {
    // 连接状态
    isConnected: boolean;
    isConnecting: boolean;

    // 项目信息
    project: Project | null;
    user: User | null;

    // 消息
    messages: ProjectChatMessage[];

    // 沙盒状态
    sandboxStatus: string | null;

    // 发送状态
    isSending: boolean;
    isTyping: boolean;

    // 错误
    error: string | null;
}

/**
 * 项目聊天 Hook 返回值
 */
export interface UseProjectChatReturn {
    // 状态
    state: ProjectChatState;

    // 初始化
    initialize: (projectId: string, userId: string, accessToken: string) => Promise<void>;

    // 连接管理
    connect: () => Promise<void>;
    disconnect: () => void;

    // 消息管理
    sendMessage: (prompt: string) => Promise<void>;
    clearMessages: () => void;

    // 项目管理
    createProject: () => Promise<string | null>;
    getProjects: () => Promise<Project[]>;
    startProject: () => Promise<boolean>;
    stopProject: () => Promise<boolean>;

    // 错误处理
    clearError: () => void;
}

/**
 * 项目聊天 Hook
 */
export function useProjectChat(): UseProjectChatReturn {
    const [state, setState] = useState<ProjectChatState>({
        isConnected: false,
        isConnecting: false,
        project: null,
        user: null,
        messages: [],
        sandboxStatus: null,
        isSending: false,
        isTyping: false,
        error: null,
    });

    const projectIdRef = useRef<string | null>(null);
    const userIdRef = useRef<string | null>(null);
    const streamingMessageRef = useRef<ProjectChatMessage | null>(null);

    /**
     * 初始化
     */
    const initialize = useCallback(async (projectId: string, userId: string, accessToken: string) => {
        try {
            // 设置 API 配置
            apiConfig.setAccessToken(accessToken);

            projectIdRef.current = projectId;
            userIdRef.current = userId;

            // 获取项目信息
            const projectResponse = await httpClient.getProject(projectId);
            if (projectResponse.code === 0 && projectResponse.data) {
                setState(prev => ({ ...prev, project: projectResponse.data || null }));
            }

            // 获取当前登录用户信息（从JWT获取，不需要传 userId）
            const userResponse = await httpClient.getUserProfile();
            if (userResponse.code === 0 && userResponse.data) {
                setState(prev => ({ ...prev, user: userResponse.data || null }));
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
            setState(prev => ({ ...prev, error: errorMessage }));
        }
    }, []);

    /**
     * 连接 WebSocket
     */
    const connect = useCallback(async () => {
        if (!projectIdRef.current || !userIdRef.current) {
            setState(prev => ({ ...prev, error: 'Project ID and User ID are required' }));
            return;
        }

        try {
            setState(prev => ({ ...prev, isConnecting: true, error: null }));

            await websocketClient.connect(projectIdRef.current, userIdRef.current);

            setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Connection failed';
            setState(prev => ({
                ...prev,
                isConnected: false,
                isConnecting: false,
                error: errorMessage
            }));
        }
    }, []);

    /**
     * 断开连接
     */
    const disconnect = useCallback(() => {
        websocketClient.disconnect();
        setState(prev => ({ ...prev, isConnected: false, isConnecting: false }));
    }, []);

    /**
     * 发送消息
     */
    const sendMessage = useCallback(async (prompt: string) => {
        if (!projectIdRef.current || !userIdRef.current) {
            setState(prev => ({ ...prev, error: 'Project ID and User ID are required' }));
            return;
        }

        if (!prompt.trim()) {
            return;
        }

        try {
            setState(prev => ({ ...prev, isSending: true, error: null }));

            // 添加用户消息
            const userMessage: ProjectChatMessage = {
                id: `msg_${Date.now()}_user`,
                content: prompt.trim(),
                role: 'user',
                timestamp: Date.now(),
            };

            setState(prev => ({
                ...prev,
                messages: [...prev.messages, userMessage],
            }));

            // 发送到 WebSocket（当前 Hook 不支持图片和模型选择，images 传空数组，model 省略）
            websocketClient.sendUserPrompt(
                prompt.trim(),
                projectIdRef.current,
                userIdRef.current,
                []
            );

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
            setState(prev => ({ ...prev, error: errorMessage }));
        } finally {
            setState(prev => ({ ...prev, isSending: false }));
        }
    }, []);

    /**
     * 清空消息
     */
    const clearMessages = useCallback(() => {
        setState(prev => ({ ...prev, messages: [] }));
        streamingMessageRef.current = null;
    }, []);

    /**
     * 创建项目
     */
    const createProject = useCallback(async (): Promise<string | null> => {
        try {
            const response = await httpClient.createProject();
            if (response.code === 0 && response.data) {
                return response.data.project_id;
            }
            setState(prev => ({ ...prev, error: response.info || 'Failed to create project' }));
            return null;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create project';
            setState(prev => ({ ...prev, error: errorMessage }));
            return null;
        }
    }, []);

    /**
     * 获取项目列表
     */
    const getProjects = useCallback(async (): Promise<Project[]> => {
        try {
            const response = await httpClient.getProjects();
            if (response.code === 0 && response.data) {
                return response.data.projects || [];
            }
            return [];
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to get projects';
            setState(prev => ({ ...prev, error: errorMessage }));
            return [];
        }
    }, []);

    /**
     * 启动项目
     */
    const startProject = useCallback(async (): Promise<boolean> => {
        if (!projectIdRef.current) {
            setState(prev => ({ ...prev, error: 'Project ID is required' }));
            return false;
        }

        try {
            const response = await httpClient.startProject(projectIdRef.current);
            if (response.code === 0) {
                return true;
            }
            setState(prev => ({ ...prev, error: response.info || 'Failed to start project' }));
            return false;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to start project';
            setState(prev => ({ ...prev, error: errorMessage }));
            return false;
        }
    }, []);

    /**
     * 停止项目
     */
    const stopProject = useCallback(async (): Promise<boolean> => {
        if (!projectIdRef.current) {
            setState(prev => ({ ...prev, error: 'Project ID is required' }));
            return false;
        }

        try {
            const response = await httpClient.stopProject(projectIdRef.current);
            if (response.code === 0) {
                return true;
            }
            setState(prev => ({ ...prev, error: response.info || 'Failed to stop project' }));
            return false;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to stop project';
            setState(prev => ({ ...prev, error: errorMessage }));
            return false;
        }
    }, []);

    /**
     * 清除错误
     */
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    /**
     * 处理 WebSocket 消息
     */
    const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
        console.log('Received WebSocket message:', message.type);

        switch (message.type) {
            case WebSocketMessageType.MODEL_RESPONSE: {
                const modelResponse = message as ModelResponseMessage;

                // 检查错误
                if (modelResponse.data.error) {
                    setState(prev => ({
                        ...prev,
                        error: modelResponse.data.error,
                        isTyping: false,
                    }));
                    streamingMessageRef.current = null;
                    return;
                }

                // 处理内容
                if (modelResponse.data.content) {
                    const assistantMessage: ProjectChatMessage = {
                        id: message.msg_id,
                        content: modelResponse.data.content,
                        role: 'assistant',
                        timestamp: new Date(message.timestamp).getTime(),
                    };

                    setState(prev => ({
                        ...prev,
                        messages: [...prev.messages, assistantMessage],
                        isTyping: false,
                    }));

                    streamingMessageRef.current = null;
                }
                break;
            }

            case WebSocketMessageType.SANDBOX_STATUS: {
                const sandboxStatus = message as SandboxStatusMessage;
                setState(prev => ({
                    ...prev,
                    sandboxStatus: sandboxStatus.data.status,
                }));
                break;
            }

            default:
                console.log('Unknown message type:', message.type);
        }
    }, []);

    /**
     * 处理连接状态变化
     */
    const handleConnectionChange = useCallback((status: 'connected' | 'disconnected' | 'reconnecting') => {
        setState(prev => ({
            ...prev,
            isConnected: status === 'connected',
            isConnecting: status === 'reconnecting',
        }));
    }, []);

    /**
     * 处理 WebSocket 错误
     */
    const handleWebSocketError = useCallback((error: Error) => {
        setState(prev => ({
            ...prev,
            error: error.message,
        }));
    }, []);

    /**
     * 设置 WebSocket 监听器
     */
    useEffect(() => {
        const unsubscribeMessage = websocketClient.onMessage(handleWebSocketMessage);
        const unsubscribeConnection = websocketClient.onConnection(handleConnectionChange);
        const unsubscribeError = websocketClient.onError(handleWebSocketError);

        return () => {
            unsubscribeMessage();
            unsubscribeConnection();
            unsubscribeError();
        };
    }, [handleWebSocketMessage, handleConnectionChange, handleWebSocketError]);

    return {
        state,
        initialize,
        connect,
        disconnect,
        sendMessage,
        clearMessages,
        createProject,
        getProjects,
        startProject,
        stopProject,
        clearError,
    };
}

