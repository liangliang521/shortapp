/**
 * WebSocket 客户端
 * 基于原生 WebSocket 实现的通信服务
 */

import { apiConfig } from '@vibecoding/api-client';
import {
    WebSocketMessage,
    WebSocketMessageType,
    UserPrompt,
    ModelResponse,
    SandboxStatus,
    UserPromptMessage,
    ModelResponseMessage,
    SandboxStatusMessage,
} from '@vibecoding/api-client';

/**
 * WebSocket 事件回调类型
 */
export type MessageCallback = (message: WebSocketMessage) => void;
export type ErrorCallback = (error: Error) => void;
export type ConnectionCallback = (status: 'connected' | 'disconnected' | 'reconnecting') => void;

/**
 * WebSocket 客户端类（使用原生 WebSocket）
 */
export class WebSocketClient {
    private ws: WebSocket | null = null;
    private messageCallbacks: Set<MessageCallback> = new Set();
    private errorCallbacks: Set<ErrorCallback> = new Set();
    private connectionCallbacks: Set<ConnectionCallback> = new Set();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private projectId: string = '';
    private userId: string = '';
    private wsKey: string = '';
    private shouldReconnect = true;
    private pingInterval: NodeJS.Timeout | null = null;

    /**
     * 连接 WebSocket
     * @param projectId 项目ID
     * @param userId 用户ID
     * @param wsKey WebSocket密钥（从 /api/v1/ws 获取的 path）
     */
    async connect(projectId: string, userId: string, wsKey?: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                // 检查是否已经连接到同一个项目
                if (this.ws &&
                    this.ws.readyState === WebSocket.OPEN &&
                    this.projectId === projectId &&
                    this.userId === userId &&
                    this.wsKey === (wsKey || '')) {
                    console.log('✅ [WebSocket] Already connected to this project, reusing connection');
                    resolve();
                    return;
                }

                // 如果已经有连接但是不同的项目，先断开
                if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
                    console.log('⚠️ [WebSocket] Closing existing connection before creating new one');
                    console.log('⚠️ [WebSocket] Old project:', this.projectId, '→ New project:', projectId);
                    console.log('⚠️ [WebSocket] Old connection state:', this.ws.readyState);
                    this.shouldReconnect = false; // 禁用自动重连
                    this.ws.close(1000, 'Reconnecting to different project');
                    this.ws = null;
                }

                this.projectId = projectId;
                this.userId = userId;
                this.wsKey = wsKey || '';
                this.shouldReconnect = true;

                const wsURL = apiConfig.getWsURL();
                const accessToken = apiConfig.getAccessToken();

                console.log('🔌 [WebSocket] Base URL:', wsURL);
                console.log('🔌 [WebSocket] WS Key:', wsKey || '(not provided)');
                console.log('🔌 [WebSocket] Auth:', { projectId, userId, hasToken: !!accessToken });

                // 构建WebSocket URL
                // 格式：ws://host:port/ws/projects/{key}?token=xxx&origin=xxx
                // React Native 的 URL 构造函数可能不支持 wss:// 协议，先转换为 https:// 来解析
                const httpURL = wsURL.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
                const baseUrl = new URL(httpURL);
                const wsProtocol = wsURL.startsWith('wss') ? 'wss' : 'ws';
                let fullURL: string;

                // 获取 origin（用于服务端 CORS 验证）
                // React Native WebSocket 不支持自定义头，所以将 origin 作为 URL 参数传递
                const origin = `${baseUrl.protocol === 'https:' ? 'https:' : 'http:'}//${baseUrl.host}`;

                if (wsKey) {
                    // 使用正确的路径格式：/ws/projects/{key}
                    const wsPath = `/ws/projects/${wsKey}`;
                    const wsUrl = new URL(wsPath, `${baseUrl.protocol}//${baseUrl.host}`);

                    // 添加认证token作为query参数
                    if (accessToken) {
                        wsUrl.searchParams.append('token', accessToken);
                    }
                    wsUrl.searchParams.append('project_id', projectId);
                    wsUrl.searchParams.append('user_id', userId);
                    wsUrl.searchParams.append('origin', origin); // 添加 origin 参数

                    // 将协议转换回 ws:// 或 wss://
                    fullURL = wsUrl.toString().replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
                } else {
                    // 兼容旧方式（如果没有提供wsKey）
                    const url = new URL(httpURL);
                    url.searchParams.append('token', accessToken || '');
                    url.searchParams.append('project_id', projectId);
                    url.searchParams.append('user_id', userId);
                    url.searchParams.append('origin', origin); // 添加 origin 参数
                    
                    // 将协议转换回 ws:// 或 wss://
                    fullURL = url.toString().replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
                }

                console.log('🔌 [WebSocket] Full URL:', fullURL);
                console.log('🔌 [WebSocket] Origin:', origin);

                // 创建WebSocket连接（token已在query参数中）
                console.log('🔑 [WebSocket] Creating WebSocket connection...');
                this.ws = new WebSocket(fullURL);

                // 设置二进制类型
                this.ws.binaryType = 'arraybuffer';

                console.log('🔌 [WebSocket] WebSocket object created, waiting for connection...');

                // 连接成功
                this.ws.onopen = () => {
                    console.log('✅✅✅ [WebSocket] CONNECTED SUCCESSFULLY ✅✅✅');
                    console.log('🔌 [WebSocket] Connection State:', {
                        readyState: this.ws?.readyState,
                        isConnected: this.isConnected,
                    });
                    this.reconnectAttempts = 0;
                    this.notifyConnection('connected');
                    this.startPing();
                    resolve();
                };

                // 接收消息
                this.ws.onmessage = (event) => {
                    try {
                        console.log('\n========================================');
                        console.log('📨📨📨 [WebSocket] MESSAGE RECEIVED 📨📨📨');
                        console.log('========================================');
                        console.log('📨 [WebSocket] Raw data type:', typeof event.data);
                        console.log('📨 [WebSocket] Raw data:', event.data);
                        console.log('----------------------------------------');

                        const message = JSON.parse(event.data as string) as WebSocketMessage;
                        console.log('📨 [WebSocket] Parsed message:', {
                            type: message.type,
                            msg_id: message.msg_id,
                            timestamp: message.timestamp,
                        });
                        console.log('========================================\n');

                        this.handleMessage(message);
                    } catch (error) {
                        console.error('\n========================================');
                        console.error('❌❌❌ [WebSocket] FAILED TO PARSE MESSAGE ❌❌❌');
                        console.error('========================================');
                        console.error('❌ [WebSocket] Error:', error);
                        console.error('❌ [WebSocket] Raw data was:', event.data);
                        console.error('========================================\n');
                        this.notifyError(new Error('Failed to parse WebSocket message'));
                    }
                };

                // 连接错误
                this.ws.onerror = (error) => {
                    console.error('❌❌❌ [WebSocket] CONNECTION ERROR ❌❌❌');
                    console.error('❌ [WebSocket] Error details:', error);
                    console.error('❌ [WebSocket] Current state:', {
                        readyState: this.ws?.readyState,
                        url: this.ws?.url,
                    });
                    const wsError = new Error('WebSocket connection error');
                    this.notifyError(wsError);
                    reject(wsError);
                };

                // 连接关闭
                this.ws.onclose = (event) => {
                    console.log('🔌🔌🔌 [WebSocket] CONNECTION CLOSED 🔌🔌🔌');
                    // React Native WebSocket 可能没有 wasClean 属性，使用 code === 1000 判断正常关闭
                    const wasClean = (event as any).wasClean !== false && event.code === 1000;
                    console.log('🔌 [WebSocket] Close details:', {
                        code: event.code,
                        reason: event.reason,
                        wasClean: wasClean
                    });
                    this.stopPing();
                    this.notifyConnection('disconnected');

                    // 自动重连（如果不是正常关闭）
                    // 正常关闭的 code 通常是 1000
                    const isNormalClose = event.code === 1000;
                    if (this.shouldReconnect && !isNormalClose) {
                        console.log('🔄 [WebSocket] Connection was not clean, will attempt reconnect');
                        this.handleReconnect();
                    } else {
                        console.log('ℹ️ [WebSocket] Clean close or reconnect disabled, not reconnecting');
                    }
                };

            } catch (error) {
                console.error('❌ [WebSocket] Failed to create connection:', error);
                reject(error);
            }
        });
    }

    /**
     * 断开连接
     */
    disconnect(): void {
        console.log('🔌 [WebSocket] Disconnecting...');
        this.shouldReconnect = false;
        this.stopPing();

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
    }

    /**
     * 发送用户提示消息
     */
    sendUserPrompt(prompt: string, projectId: string, userId: string, images: string[] = [], model?: string): void {
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║  📤 SENDING MESSAGE                   ║');
        console.log('╚════════════════════════════════════════╝');
        console.log('📤 [WebSocket] Connection state:', {
            readyState: this.ws?.readyState,
            isConnected: this.isConnected,
            hasWebSocket: !!this.ws,
        });
        console.log('📤 [WebSocket] Images count:', images.length);
        console.log('📤 [WebSocket] Model:', model || '(default)');

        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('❌❌❌ [WebSocket] CANNOT SEND - NOT CONNECTED ❌❌❌');
            console.error('❌ [WebSocket] readyState:', this.ws?.readyState);
            throw new Error('WebSocket not connected');
        }

        const messageData: any = {
            prompt,
            images, // 支持图片URL数组
        };

        // 如果提供了 model 参数，按照后端规范放到 data.options.model 中
        if (model) {
            messageData.options = {
                ...(messageData.options || {}),
                model,
            };
        }

        const message: UserPromptMessage = {
            type: WebSocketMessageType.USER_PROMPT,
            msg_id: this.generateMessageId(),
            timestamp: new Date().toISOString(),
            user_id: userId,
            project_id: projectId,
            data: messageData,
        };

        console.log('📤 [WebSocket] Message details:', {
            type: message.type,
            msg_id: message.msg_id,
            user_id: message.user_id,
            project_id: message.project_id,
            prompt: prompt.substring(0, 50) + '...',
            images_count: images.length,
            model: model || '(default)',
            images_urls: images.map(img => img.substring(0, 100) + '...'),
        });

        const messageJson = JSON.stringify(message);
        console.log('📤 [WebSocket] Sending JSON (first 500 chars):', messageJson.substring(0, 500));
        console.log('📤 [WebSocket] Full message data:', JSON.stringify(message.data, null, 2));

        try {
            this.ws.send(messageJson);
            console.log('✅ [WebSocket] MESSAGE SENT SUCCESSFULLY');
            console.log('========================================\n');
        } catch (error) {
            console.error('❌ [WebSocket] SEND FAILED');
            console.error('❌ [WebSocket] Error:', error);
            console.error('========================================\n');
            throw error;
        }
    }

    /**
     * 监听消息
     */
    onMessage(callback: MessageCallback): () => void {
        this.messageCallbacks.add(callback);
        return () => this.messageCallbacks.delete(callback);
    }

    /**
     * 监听错误
     */
    onError(callback: ErrorCallback): () => void {
        this.errorCallbacks.add(callback);
        return () => this.errorCallbacks.delete(callback);
    }

    /**
     * 监听连接状态
     */
    onConnection(callback: ConnectionCallback): () => void {
        this.connectionCallbacks.add(callback);
        return () => this.connectionCallbacks.delete(callback);
    }

    /**
     * 获取连接状态
     */
    get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * 获取 Socket ID（原生 WebSocket 没有ID，返回连接状态）
     */
    get socketId(): string | undefined {
        return this.isConnected ? 'native-websocket' : undefined;
    }

    /**
     * 处理接收到的消息
     */
    private handleMessage(message: WebSocketMessage): void {
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║  🎯 HANDLING MESSAGE                  ║');
        console.log('╚════════════════════════════════════════╝');
        console.log('🎯 [WebSocket] Message type:', message.type);
        console.log('🎯 [WebSocket] Full message:', message);

        // 检查是否是错误消息
        // 根据文档：'200' = MODEL_RESPONSE
        if (message.type === WebSocketMessageType.MODEL_RESPONSE) {
            const modelResponse = message as ModelResponseMessage;
            console.log('🤖 [WebSocket] Model response - content preview:',
                modelResponse.data.content?.substring(0, 100) || '(no content)');
            console.log('🤖 [WebSocket] Model response - has error?', !!modelResponse.data.error);

            if (modelResponse.data.error) {
                console.error('❌ [WebSocket] Model response contains error:', modelResponse.data.error);
                const error = new Error(modelResponse.data.error);
                this.notifyError(error);
            }
        } else if (message.type === WebSocketMessageType.SANDBOX_STATUS) {
            console.log('🏗️ [WebSocket] Sandbox status message');
            const sandboxMessage = message as SandboxStatusMessage;
            console.log('🏗️ [WebSocket] Sandbox status:', sandboxMessage.data.status);
        } else if (message.type === WebSocketMessageType.USER_PROMPT) {
            console.log('👤 [WebSocket] User prompt echo (unusual, server echoing back?)');
        }

        // 通知所有回调
        console.log('----------------------------------------');
        console.log('📢 [WebSocket] Notifying', this.messageCallbacks.size, 'callback(s)');
        let callbackIndex = 0;
        this.messageCallbacks.forEach((callback) => {
            callbackIndex++;
            try {
                console.log(`📢 [WebSocket] Calling callback #${callbackIndex}`);
                callback(message);
                console.log(`✅ [WebSocket] Callback #${callbackIndex} completed`);
            } catch (error) {
                console.error(`❌ [WebSocket] Error in callback #${callbackIndex}:`, error);
            }
        });
        console.log('✅ [WebSocket] All callbacks notified');
        console.log('========================================\n');
    }

    /**
     * 通知连接状态变化
     */
    private notifyConnection(status: 'connected' | 'disconnected' | 'reconnecting'): void {
        this.connectionCallbacks.forEach(callback => {
            try {
                callback(status);
            } catch (error) {
                console.error('Error in connection callback:', error);
            }
        });
    }

    /**
     * 通知错误
     */
    private notifyError(error: Error): void {
        this.errorCallbacks.forEach(callback => {
            try {
                callback(error);
            } catch (error) {
                console.error('Error in error callback:', error);
            }
        });
    }

    /**
     * 处理重连逻辑
     */
    private handleReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.notifyConnection('reconnecting');

            const delay = this.reconnectDelay * this.reconnectAttempts;
            console.log(`🔄 [WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

            this.reconnectTimer = setTimeout(() => {
                console.log(`🔄 [WebSocket] Reconnecting now...`);
                this.connect(this.projectId, this.userId, this.wsKey).catch((error) => {
                    console.error('❌ [WebSocket] Reconnection failed:', error);
                });
            }, delay);
        } else {
            console.error('❌ [WebSocket] Max reconnection attempts reached');
            this.notifyConnection('disconnected');
        }
    }

    /**
     * 启动心跳检测
     * 根据文档：客户端发送文本消息 "ping"，服务端回复Pong帧
     */
    private startPing(): void {
        this.stopPing();

        console.log('💓 [WebSocket] Starting heartbeat (every 30s) - sending text "ping"');

        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                console.log('💓 [WebSocket] Sending ping... (state: OPEN)');
                try {
                    // 发送纯文本 "ping"（不是JSON格式）
                    this.ws.send('ping');
                    console.log('✅ [WebSocket] Ping sent (text: "ping")');
                } catch (error) {
                    console.error('❌ [WebSocket] Failed to send ping:', error);
                }
            } else {
                console.warn('⚠️ [WebSocket] Skipping ping - connection not open. State:', this.ws?.readyState);
            }
        }, 30000); // 每30秒发送一次心跳
    }

    /**
     * 停止心跳检测
     */
    private stopPing(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    /**
     * 生成消息 ID
     */
    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// 导出单例实例
export const websocketClient = new WebSocketClient();
