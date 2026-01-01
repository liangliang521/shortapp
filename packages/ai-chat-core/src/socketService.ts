import { io, Socket } from 'socket.io-client';
import { SocketEvents, ApiResponse, ChatMessage } from './types';
import { JsonProcessor } from './jsonProcessor';

export class SocketService {
    private socket: Socket | null = null;
    private url: string;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    constructor(url: string = 'ws://localhost:3001') {
        this.url = url;
    }

    // 连接 Socket
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io(this.url, {
                    transports: ['websocket'],
                    timeout: 10000,
                    forceNew: true,
                });

                this.socket.on('connect', () => {
                    console.log('Socket connected:', this.socket?.id);
                    this.reconnectAttempts = 0;
                    this.emit('connection:status', { status: 'connected' });
                    resolve();
                });

                // 监听WebSocket消息
                this.socket.on('message', (data: any) => {
                    console.log('Received WebSocket message:', data);
                    this.handleWebSocketMessage(data);
                });

                this.socket.on('disconnect', (reason) => {
                    console.log('Socket disconnected:', reason);
                    this.emit('connection:status', { status: 'disconnected' });
                });

                this.socket.on('connect_error', (error) => {
                    console.error('Socket connection error:', error);
                    this.handleReconnect();
                    reject(error);
                });

                this.socket.on('reconnect', (attemptNumber) => {
                    console.log('Socket reconnected after', attemptNumber, 'attempts');
                    this.reconnectAttempts = 0;
                    this.emit('connection:status', { status: 'connected' });
                });

                this.socket.on('reconnect_attempt', (attemptNumber) => {
                    console.log('Socket reconnect attempt:', attemptNumber);
                    this.emit('connection:status', { status: 'reconnecting' });
                });

                this.socket.on('reconnect_error', (error) => {
                    console.error('Socket reconnect error:', error);
                    this.handleReconnect();
                });

                this.socket.on('reconnect_failed', () => {
                    console.error('Socket reconnection failed');
                    this.emit('connection:status', { status: 'disconnected' });
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    // 处理WebSocket消息（基础实现）
    handleWebSocketMessage(data: any): void {
        try {
            const message = JsonProcessor.processWebSocketMessage(data);
            if (message) {
                this.emit('message:receive', {
                    message,
                    sessionId: data.project_id, // 使用project_id作为sessionId
                });
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
            this.emit('error', {
                code: 'MESSAGE_PROCESSING_ERROR',
                message: 'Failed to process WebSocket message',
            });
        }
    }

    // 断开连接
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // 发送事件
    emit<K extends keyof SocketEvents>(event: K, data: SocketEvents[K]): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit(event, data);
        } else {
            console.warn('Socket not connected, cannot emit event:', event);
        }
    }

    // 监听事件
    on<K extends keyof SocketEvents>(
        event: K,
        callback: (data: SocketEvents[K]) => void
    ): void {
        if (this.socket) {
            this.socket.on(event as any, callback);
        }
    }

    // 移除事件监听
    off<K extends keyof SocketEvents>(event: K): void {
        if (this.socket) {
            this.socket.off(event);
        }
    }

    // 获取连接状态
    get isConnected(): boolean {
        return this.socket?.connected || false;
    }

    // 获取 Socket ID
    get socketId(): string | undefined {
        return this.socket?.id;
    }

    // 处理重连逻辑
    private handleReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.emit('connection:status', { status: 'reconnecting' });

            setTimeout(() => {
                if (this.socket) {
                    this.socket.connect();
                }
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('Max reconnection attempts reached');
            this.emit('connection:status', { status: 'disconnected' });
        }
    }

    // 模拟服务端响应（用于开发测试）
    simulateServerResponse(event: string, data: any, delay: number = 1000): void {
        setTimeout(() => {
            this.emit(event as keyof SocketEvents, data);
        }, delay);
    }
}

// 创建单例实例
export const socketService = new SocketService();

// 模拟 Socket 服务（当没有真实服务端时使用）
export class MockSocketService extends SocketService {
    private messageId = 0;
    private sessionId = 1;

    constructor() {
        super('mock://localhost');
    }

    async connect(): Promise<void> {
        // 模拟连接成功
        setTimeout(() => {
            this.emit('connection:status', { status: 'connected' });
        }, 500);
        return Promise.resolve();
    }

    // 模拟发送消息
    simulateMessageSend(data: { content: string; sessionId: string }) {
        const messageId = `msg_${++this.messageId}`;

        // 模拟 AI 响应
        setTimeout(() => {
            // 发送部分响应（流式）
            let response = '我将为您创建一个功能完整的应用。让我开始构建...';
            let currentText = '';

            const interval = setInterval(() => {
                if (currentText.length < response.length) {
                    currentText += response[currentText.length];
                    this.emit('message:partial', {
                        content: currentText,
                        sessionId: data.sessionId,
                        messageId: messageId,
                    });
                } else {
                    clearInterval(interval);

                    // 发送完整消息
                    this.emit('message:receive', {
                        message: {
                            id: messageId,
                            type: 'model_assistant_text',
                            content: response,
                            role: 'assistant',
                            timestamp: Date.now(),
                            status: 'sent',
                            metadata: {
                                tokens: response.length,
                                model: 'claude-sonnet-4',
                                finishReason: 'stop',
                            },
                        },
                        sessionId: data.sessionId,
                    });
                }
            }, 50);
        }, 1000);
    }

    // 模拟创建会话
    simulateSessionCreate(data: { title: string; settings?: any }) {
        const session = {
            id: `session_${++this.sessionId}`,
            title: data.title,
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            settings: {
                model: 'claude-sonnet-4',
                temperature: 0.7,
                maxTokens: 2000,
                ...data.settings,
            },
        };

        setTimeout(() => {
            this.emit('session:created', { session });
        }, 500);
    }
}

// 创建模拟服务实例
export const mockSocketService = new MockSocketService();
