import { ChatMessage, ChatSession, ApiResponse, BaseWebSocketMessage } from './types';
import { MessageParser } from './messageParser';

export class JsonProcessor {
    // 处理接收到的WebSocket消息
    static processIncomingMessage(rawData: any): ChatMessage | null {
        try {
            // 首先尝试解析为BaseWebSocketMessage
            if (this.isValidWebSocketMessage(rawData)) {
                return MessageParser.parseWebSocketMessage(rawData as BaseWebSocketMessage);
            }

            // 如果不是WebSocket消息格式，尝试处理为旧格式的ChatMessage
            if (this.isValidMessage(rawData)) {
                console.warn('Received legacy message format, converting...');
                return this.convertLegacyMessage(rawData);
            }

            console.warn('Invalid message format:', rawData);
            return null;
        } catch (error) {
            console.error('Error processing incoming message:', error);
            return null;
        }
    }

    // 处理WebSocket消息（新格式）
    static processWebSocketMessage(rawData: any): ChatMessage | null {
        try {
            if (!this.isValidWebSocketMessage(rawData)) {
                console.warn('Invalid WebSocket message format:', rawData);
                return null;
            }

            return MessageParser.parseWebSocketMessage(rawData as BaseWebSocketMessage);
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
            return null;
        }
    }

    // 处理接收到的会话
    static processIncomingSession(rawData: any): ChatSession | null {
        try {
            if (!this.isValidSession(rawData)) {
                console.warn('Invalid session format:', rawData);
                return null;
            }

            const session: ChatSession = {
                id: rawData.id || this.generateId(),
                title: this.sanitizeContent(rawData.title || 'Untitled'),
                messages: this.processMessages(rawData.messages || []),
                createdAt: rawData.createdAt || Date.now(),
                updatedAt: rawData.updatedAt || Date.now(),
                settings: this.processSettings(rawData.settings || {}),
            };

            return session;
        } catch (error) {
            console.error('Error processing incoming session:', error);
            return null;
        }
    }

    // 处理 API 响应
    static processApiResponse<T>(rawResponse: any): ApiResponse<T> {
        try {
            const response: ApiResponse<T> = {
                success: Boolean(rawResponse.success),
                data: rawResponse.data,
                error: rawResponse.error ? {
                    code: rawResponse.error.code || 'UNKNOWN_ERROR',
                    message: rawResponse.error.message || 'An unknown error occurred',
                } : undefined,
                metadata: rawResponse.metadata ? {
                    timestamp: rawResponse.metadata.timestamp || Date.now(),
                    requestId: rawResponse.metadata.requestId || this.generateId(),
                } : undefined,
            };

            return response;
        } catch (error) {
            console.error('Error processing API response:', error);
            return {
                success: false,
                error: {
                    code: 'PROCESSING_ERROR',
                    message: 'Failed to process API response',
                },
            };
        }
    }

    // 准备发送的消息数据
    static prepareOutgoingMessage(content: string, sessionId: string, settings?: any) {
        return {
            content: this.sanitizeContent(content),
            sessionId,
            settings: settings ? this.processSettings(settings) : undefined,
            timestamp: Date.now(),
            requestId: this.generateId(),
        };
    }

    // 准备发送的会话数据
    static prepareOutgoingSession(title: string, settings?: any) {
        return {
            title: this.sanitizeContent(title),
            settings: settings ? this.processSettings(settings) : undefined,
            timestamp: Date.now(),
            requestId: this.generateId(),
        };
    }

    // 验证WebSocket消息格式
    private static isValidWebSocketMessage(data: any): boolean {
        return (
            data &&
            typeof data === 'object' &&
            typeof data.type === 'string' &&
            typeof data.msg_id === 'string' &&
            typeof data.timestamp === 'string' &&
            typeof data.user_id === 'string' &&
            typeof data.project_id === 'string' &&
            typeof data.data === 'object'
        );
    }

    // 验证旧格式消息
    private static isValidMessage(data: any): boolean {
        return (
            data &&
            typeof data === 'object' &&
            (typeof data.content === 'string' || typeof data.message === 'string') &&
            typeof data.role === 'string'
        );
    }

    // 验证会话格式
    private static isValidSession(data: any): boolean {
        return (
            data &&
            typeof data === 'object' &&
            typeof data.title === 'string'
        );
    }

    // 验证角色
    private static validateRole(role: any): 'user' | 'assistant' | 'system' {
        const validRoles = ['user', 'assistant', 'system'];
        return validRoles.includes(role) ? role : 'assistant';
    }

    // 处理元数据
    private static processMetadata(metadata: any) {
        if (!metadata || typeof metadata !== 'object') {
            return undefined;
        }

        return {
            tokens: typeof metadata.tokens === 'number' ? metadata.tokens : undefined,
            model: typeof metadata.model === 'string' ? metadata.model : undefined,
            finishReason: typeof metadata.finishReason === 'string' ? metadata.finishReason : undefined,
        };
    }

    // 处理设置
    private static processSettings(settings: any) {
        if (!settings || typeof settings !== 'object') {
            return {
                model: 'claude-sonnet-4',
                temperature: 0.7,
                maxTokens: 2000,
            };
        }

        return {
            model: typeof settings.model === 'string' ? settings.model : 'claude-sonnet-4',
            temperature: typeof settings.temperature === 'number' ? Math.max(0, Math.min(2, settings.temperature)) : 0.7,
            maxTokens: typeof settings.maxTokens === 'number' ? Math.max(1, Math.min(4000, settings.maxTokens)) : 2000,
            systemPrompt: typeof settings.systemPrompt === 'string' ? settings.systemPrompt : undefined,
        };
    }

    // 处理消息列表
    private static processMessages(messages: any[]): ChatMessage[] {
        if (!Array.isArray(messages)) {
            return [];
        }

        return messages
            .map(msg => this.processIncomingMessage(msg))
            .filter((msg): msg is ChatMessage => msg !== null);
    }

    // 清理内容
    private static sanitizeContent(content: string): string {
        if (typeof content !== 'string') {
            return '';
        }

        return content
            .trim()
            .replace(/\0/g, '') // 移除空字符
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 移除控制字符
            .substring(0, 10000); // 限制长度
    }

    // 生成 ID
    private static generateId(): string {
        return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 格式化错误响应
    static formatErrorResponse(code: string, message: string, sessionId?: string): ApiResponse {
        return {
            success: false,
            error: { code, message },
            metadata: {
                timestamp: Date.now(),
                requestId: this.generateId(),
            },
        };
    }

    // 格式化成功响应
    static formatSuccessResponse<T>(data: T, requestId?: string): ApiResponse<T> {
        return {
            success: true,
            data,
            metadata: {
                timestamp: Date.now(),
                requestId: requestId || this.generateId(),
            },
        };
    }

    // 解析流式响应
    static parseStreamingResponse(chunk: string): { type: string; data: any } | null {
        try {
            // 处理 Server-Sent Events 格式
            if (chunk.includes('data: ')) {
                const data = chunk.replace('data: ', '').trim();
                if (data === '[DONE]') {
                    return { type: 'done', data: null };
                }
                return { type: 'data', data: JSON.parse(data) };
            }

            // 处理普通 JSON 格式
            const parsed = JSON.parse(chunk);
            return { type: 'json', data: parsed };
        } catch (error) {
            console.warn('Failed to parse streaming response:', error);
            return null;
        }
    }

    // 转换旧格式消息为新格式
    private static convertLegacyMessage(rawData: any): ChatMessage {
        return {
            id: rawData.id || this.generateId(),
            type: 'user', // 默认为用户消息，因为旧格式没有type字段
            content: this.sanitizeContent(rawData.content || rawData.message || ''),
            role: this.validateRole(rawData.role),
            timestamp: rawData.timestamp || Date.now(),
            status: rawData.status || 'sent',
            metadata: this.processMetadata(rawData.metadata),
        };
    }

    // 合并部分消息
    static mergePartialMessages(partialMessages: { [messageId: string]: string }): ChatMessage[] {
        return Object.entries(partialMessages).map(([id, content]) => ({
            id,
            type: 'user' as const,
            content,
            role: 'assistant' as const,
            timestamp: Date.now(),
            status: 'sent' as const,
        }));
    }
}
