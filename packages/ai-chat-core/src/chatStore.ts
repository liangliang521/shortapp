import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatState, ChatMessage, ChatSession, ChatSettings } from './types';
import { JsonProcessor } from './jsonProcessor';
import { mockSocketService } from './socketService';

interface ChatStore extends ChatState {
    // 连接管理
    connect: () => Promise<void>;
    disconnect: () => void;

    // 会话管理
    createSession: (title: string, settings?: Partial<ChatSettings>) => Promise<string>;
    switchSession: (sessionId: string) => void;
    deleteSession: (sessionId: string) => Promise<void>;
    updateSession: (sessionId: string, updates: Partial<ChatSession>) => Promise<void>;

    // 消息管理
    sendMessage: (content: string) => Promise<void>;
    addMessage: (message: ChatMessage) => void;
    updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
    clearMessages: () => void;

    // 设置管理
    updateSettings: (settings: Partial<ChatSettings>) => void;

    // 错误处理
    setError: (error: string | null) => void;
    clearError: () => void;

    // 内部方法
    _setConnectionStatus: (status: ChatState['connectionStatus']) => void;
    _setSendingStatus: (isSending: boolean) => void;
    _setTypingStatus: (isTyping: boolean) => void;

    // 演示/调试：加载模拟历史数据
    loadMockHistory: () => void;
}

const defaultSettings: ChatSettings = {
    model: 'claude-sonnet-4',
    temperature: 0.7,
    maxTokens: 2000,
};

const defaultSession: ChatSession = {
    id: 'default',
    title: 'New Chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settings: defaultSettings,
};

export const useChatStore = create<ChatStore>()(
    persist(
        (set, get) => ({
            // 初始状态
            connectionStatus: 'disconnected',
            sessions: [defaultSession],
            currentSessionId: 'default',
            messages: [],
            isSending: false,
            isTyping: false,
            settings: defaultSettings,
            error: null,

            // 连接管理
            connect: async () => {
                const { _setConnectionStatus, setError } = get();

                try {
                    _setConnectionStatus('connecting');
                    await mockSocketService.connect();

                    // 设置事件监听
                    mockSocketService.on('connection:status', (data) => {
                        _setConnectionStatus(data.status);
                    });

                    mockSocketService.on('message:receive', (data) => {
                        const message = JsonProcessor.processIncomingMessage(data.message);
                        if (message) {
                            get().addMessage(message);
                            get()._setTypingStatus(false);
                        }
                    });

                    mockSocketService.on('message:partial', (data) => {
                        get()._setTypingStatus(true);
                        // 这里可以处理流式响应的部分消息
                    });

                    mockSocketService.on('session:created', (data) => {
                        const session = JsonProcessor.processIncomingSession(data.session);
                        if (session) {
                            set((state) => ({
                                sessions: [...state.sessions, session],
                                currentSessionId: session.id,
                            }));
                        }
                    });

                    mockSocketService.on('error', (data) => {
                        setError(data.message);
                    });

                    // 如果当前无消息，自动加载一组演示历史数据
                    if (get().messages.length === 0) {
                        get().loadMockHistory();
                    }

                } catch (error) {
                    setError(error instanceof Error ? error.message : 'Connection failed');
                    _setConnectionStatus('disconnected');
                }
            },

            disconnect: () => {
                mockSocketService.disconnect();
                get()._setConnectionStatus('disconnected');
            },

            // 会话管理
            createSession: async (title: string, settings?: Partial<ChatSettings>) => {
                const { sessions } = get();

                const newSession: ChatSession = {
                    id: `session_${Date.now()}`,
                    title,
                    messages: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    settings: { ...defaultSettings, ...settings },
                };

                set((state) => ({
                    sessions: [...state.sessions, newSession],
                    currentSessionId: newSession.id,
                    messages: [],
                }));

                // 模拟服务端创建会话
                mockSocketService.simulateSessionCreate({ title, settings });

                return newSession.id;
            },

            switchSession: (sessionId: string) => {
                const { sessions } = get();
                const session = sessions.find(s => s.id === sessionId);

                if (session) {
                    set({
                        currentSessionId: sessionId,
                        messages: session.messages,
                    });
                }
            },

            deleteSession: async (sessionId: string) => {
                if (sessionId === 'default') {
                    return; // 不能删除默认会话
                }

                set((state) => {
                    const newSessions = state.sessions.filter(s => s.id !== sessionId);
                    const newCurrentSessionId = state.currentSessionId === sessionId
                        ? (newSessions[0]?.id || 'default')
                        : state.currentSessionId;

                    const currentSession = newSessions.find(s => s.id === newCurrentSessionId);

                    return {
                        sessions: newSessions,
                        currentSessionId: newCurrentSessionId,
                        messages: currentSession?.messages || [],
                    };
                });
            },

            updateSession: async (sessionId: string, updates: Partial<ChatSession>) => {
                set((state) => ({
                    sessions: state.sessions.map(session =>
                        session.id === sessionId
                            ? { ...session, ...updates, updatedAt: Date.now() }
                            : session
                    ),
                }));

                // 如果更新的是当前会话，同步更新消息
                if (sessionId === get().currentSessionId && updates.messages) {
                    set({ messages: updates.messages });
                }
            },

            // 消息管理
            sendMessage: async (content: string) => {
                const { currentSessionId, _setSendingStatus, addMessage, setError } = get();

                if (!content.trim()) return;

                try {
                    _setSendingStatus(true);
                    setError(null);

                    // 添加用户消息
                    const userMessage: ChatMessage = {
                        id: `msg_${Date.now()}`,
                        type: 'user',
                        content: content.trim(),
                        role: 'user',
                        timestamp: Date.now(),
                        status: 'sent',
                    };

                    addMessage(userMessage);

                    // 模拟发送消息到服务端
                    mockSocketService.simulateMessageSend({
                        content: content.trim(),
                        sessionId: currentSessionId || 'default',
                    });

                } catch (error) {
                    setError(error instanceof Error ? error.message : 'Failed to send message');
                } finally {
                    _setSendingStatus(false);
                }
            },

            addMessage: (message: ChatMessage) => {
                set((state) => {
                    const newMessages = [...state.messages, message];

                    // 更新当前会话的消息
                    const updatedSessions = state.sessions.map(session =>
                        session.id === state.currentSessionId
                            ? { ...session, messages: newMessages, updatedAt: Date.now() }
                            : session
                    );

                    return {
                        messages: newMessages,
                        sessions: updatedSessions,
                    };
                });
            },

            updateMessage: (messageId: string, updates: Partial<ChatMessage>) => {
                set((state) => {
                    const updatedMessages = state.messages.map(msg =>
                        msg.id === messageId ? { ...msg, ...updates } : msg
                    );

                    // 更新当前会话的消息
                    const updatedSessions = state.sessions.map(session =>
                        session.id === state.currentSessionId
                            ? { ...session, messages: updatedMessages, updatedAt: Date.now() }
                            : session
                    );

                    return {
                        messages: updatedMessages,
                        sessions: updatedSessions,
                    };
                });
            },

            clearMessages: () => {
                set((state) => {
                    const updatedSessions = state.sessions.map(session =>
                        session.id === state.currentSessionId
                            ? { ...session, messages: [], updatedAt: Date.now() }
                            : session
                    );

                    return {
                        messages: [],
                        sessions: updatedSessions,
                    };
                });
            },

            // 加载模拟的历史消息（包含8种消息类型）
            loadMockHistory: () => {
                const now = Date.now();
                const mockMessages: ChatMessage[] = [
                    {
                        id: `msg_${now - 8000}`,
                        type: 'user',
                        content: 'Create a simple todo app with add/delete.',
                        role: 'user',
                        timestamp: now - 8000,
                        status: 'sent',
                    },
                    {
                        id: `msg_${now - 7000}`,
                        type: 'model_user',
                        content: '创建python文件打印你好',
                        role: 'user',
                        timestamp: now - 7000,
                        status: 'sent',
                    },
                    {
                        id: `msg_${now - 6500}`,
                        type: 'model_system_init',
                        content: 'System initialized with model: claude-sonnet-4-5-20250929',
                        role: 'system',
                        timestamp: now - 6500,
                        status: 'sent',
                        metadata: {
                            model: 'claude-sonnet-4-5-20250929',
                            sessionId: 'session_demo_1',
                        },
                    },
                    {
                        id: `msg_${now - 6000}`,
                        type: 'model_assistant_text',
                        content: 'I will create the project structure and set up the core screens.',
                        role: 'assistant',
                        timestamp: now - 6000,
                        status: 'sent',
                        metadata: {
                            model: 'claude-sonnet-4-5-20250929',
                            tokens: 42,
                            sessionId: 'session_demo_1',
                        },
                    },
                    {
                        id: `msg_${now - 5000}`,
                        type: 'model_assistant_tool_use',
                        content: 'Using tool: Write\n\nInput:\n{\n  "file_path": "src/App.tsx",\n  "content": "// app content"\n}',
                        role: 'assistant',
                        timestamp: now - 5000,
                        status: 'sent',
                        metadata: {
                            model: 'claude-sonnet-4-5-20250929',
                            toolName: 'Write',
                            toolId: 'toolu_abc123',
                            sessionId: 'session_demo_1',
                        },
                    },
                    {
                        id: `msg_${now - 4500}`,
                        type: 'model_assistant_tool_result',
                        content: 'File created successfully at: src/App.tsx',
                        role: 'assistant',
                        timestamp: now - 4500,
                        status: 'sent',
                        metadata: {
                            toolId: 'toolu_abc123',
                            sessionId: 'session_demo_1',
                        },
                    },
                    {
                        id: `msg_${now - 3500}`,
                        type: 'sandbox',
                        content: 'Sandbox Status: ACTIVE',
                        role: 'system',
                        timestamp: now - 3500,
                        status: 'sent',
                        metadata: {
                            sandboxStatus: 'ACTIVE',
                        },
                    },
                    {
                        id: `msg_${now - 2000}`,
                        type: 'model_result',
                        content: 'The project has been scaffolded and initial screens are ready.',
                        role: 'system',
                        timestamp: now - 2000,
                        status: 'sent',
                        metadata: {
                            tokens: 128,
                            sessionId: 'session_demo_1',
                        },
                    },
                ];

                set((state) => {
                    const updatedSessions = state.sessions.map(session =>
                        session.id === state.currentSessionId
                            ? { ...session, messages: mockMessages, updatedAt: Date.now() }
                            : session
                    );

                    return {
                        messages: mockMessages,
                        sessions: updatedSessions,
                    };
                });
            },

            // 设置管理
            updateSettings: (settings: Partial<ChatSettings>) => {
                set((state) => ({
                    settings: { ...state.settings, ...settings },
                }));

                // 更新当前会话的设置
                const { currentSessionId } = get();
                if (currentSessionId) {
                    get().updateSession(currentSessionId, {
                        settings: { ...get().settings, ...settings },
                    });
                }
            },

            // 错误处理
            setError: (error: string | null) => {
                set({ error });
            },

            clearError: () => {
                set({ error: null });
            },

            // 内部方法
            _setConnectionStatus: (status: ChatState['connectionStatus']) => {
                set({ connectionStatus: status });
            },

            _setSendingStatus: (isSending: boolean) => {
                set({ isSending });
            },

            _setTypingStatus: (isTyping: boolean) => {
                set({ isTyping });
            },
        }),
        {
            name: 'chat-storage',
            partialize: (state) => ({
                sessions: state.sessions,
                currentSessionId: state.currentSessionId,
                settings: state.settings,
            }),
        }
    )
);
