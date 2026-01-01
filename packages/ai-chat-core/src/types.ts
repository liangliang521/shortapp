// WebSocket基础消息结构
export interface BaseWebSocketMessage {
    type: string;
    msg_id: string;
    timestamp: string;
    user_id: string;
    project_id: string;
    data: UserPromptData | ModelResponseData | SandboxStatusData;
}

// 用户输入数据
export interface UserPromptData {
    prompt: string;
}

// 模型响应数据
export interface ModelResponseData {
    error?: string | null;
    content?: string | null; // JSON字符串，包含event-message-structure.md中的消息
}

// Sandbox状态数据
export interface SandboxStatusData {
    status: string;
}

// Event Message Structure中的基础结构
export interface EventMessage {
    _id: string;
    project_id: string;
    user_id: string;
    timestamp: string;
    agent_message: AgentMessageContent;
}

// Agent Message类型
export type AgentMessageContent =
    | UserAgentMessage
    | SystemInitAgentMessage
    | AssistantTextAgentMessage
    | AssistantToolUseAgentMessage
    | AssistantToolResultAgentMessage
    | ResultAgentMessage;

// 1. User Message (用户输入)
export interface UserAgentMessage {
    type: 'user';
    message: {
        role: 'user';
        content: string;
    };
}

// 2. System Message - Init (系统初始化)
export interface SystemInitAgentMessage {
    type: 'system';
    subtype: 'init';
    cwd: string;
    session_id: string;
    tools: string[];
    mcp_servers: string[];
    model: string;
    permissionMode: string;
    slash_commands: string[];
    apiKeySource: string;
    output_style: string;
    agents: string[];
    uuid: string;
}

// 3. Assistant Message - Text (助手文本回复)
export interface AssistantTextAgentMessage {
    type: 'assistant';
    message: {
        model: string;
        id: string;
        type: 'message';
        role: 'assistant';
        content: Array<{
            type: 'text';
            text: string;
        }>;
        stop_reason: string | null;
        stop_sequence: string | null;
        usage: {
            input_tokens: number;
            cache_creation_input_tokens: number;
            cache_read_input_tokens: number;
            cache_creation: {
                ephemeral_5m_input_tokens: number;
                ephemeral_1h_input_tokens: number;
            };
            output_tokens: number;
            service_tier: string;
        };
    };
    parent_tool_use_id: string | null;
    session_id: string;
    uuid: string;
}

// 4. Assistant Message - Tool Use (助手工具使用)
export interface AssistantToolUseAgentMessage {
    type: 'assistant';
    message: {
        model: string;
        id: string;
        type: 'message';
        role: 'assistant';
        content: Array<{
            type: 'tool_use';
            id: string;
            name: string;
            input: Record<string, any>;
        }>;
        stop_reason: string | null;
        stop_sequence: string | null;
        usage: {
            input_tokens: number;
            cache_creation_input_tokens: number;
            cache_read_input_tokens: number;
            cache_creation: {
                ephemeral_5m_input_tokens: number;
                ephemeral_1h_input_tokens: number;
            };
            output_tokens: number;
            service_tier: string;
        };
    };
    parent_tool_use_id: string | null;
    session_id: string;
    uuid: string;
}

// 5. Assistant Message - Tool Result (工具执行结果)
export interface AssistantToolResultAgentMessage {
    type: 'assistant';
    message: {
        role: 'assistant';
        content: Array<{
            tool_use_id: string;
            type: 'tool_result';
            content: string;
        }>;
    };
    parent_tool_use_id: string | null;
    session_id: string;
    uuid: string;
}

// 6. Result Message (会话结果)
export interface ResultAgentMessage {
    type: 'result';
    subtype: 'success' | 'error';
    is_error: boolean;
    duration_ms: number;
    duration_api_ms: number;
    num_turns: number;
    result: string;
    session_id: string;
    total_cost_usd: number;
    usage: {
        input_tokens: number;
        cache_creation_input_tokens: number;
        cache_read_input_tokens: number;
        output_tokens: number;
        server_tool_use: {
            web_search_requests: number;
        };
        service_tier: string;
        cache_creation: {
            ephemeral_1h_input_tokens: number;
            ephemeral_5m_input_tokens: number;
        };
    };
    modelUsage: Record<string, {
        inputTokens: number;
        outputTokens: number;
        cacheReadInputTokens: number;
        cacheCreationInputTokens: number;
        webSearchRequests: number;
        costUSD: number;
        contextWindow: number;
    }>;
    permission_denials: any[];
    uuid: string;
}

// 聊天消息类型 - 统一的UI渲染消息
export interface ChatMessage {
    id: string;
    type: 'user' | 'model_user' | 'model_system_init' | 'model_assistant_text' | 'model_assistant_tool_use' | 'model_assistant_tool_result' | 'model_result' | 'sandbox' | 'action';
    content: string;
    role: 'user' | 'assistant' | 'system';
    timestamp: number;
    status?: 'sending' | 'sent' | 'failed';

    // 原始数据（可选）
    originalData?: BaseWebSocketMessage | AgentMessageContent;

    // 元数据
    metadata?: {
        tokens?: number;
        model?: string;
        finishReason?: string;
        sessionId?: string;
        toolName?: string;
        toolId?: string;
        sandboxStatus?: string;
        sandboxId?: string;
        previewUrl?: string;
        expUrl?: string;
        jobId?: string;
        projectId?: string; // 项目ID，用于ServerImage组件拼接完整URL
        images?: string[]; // 图片路径数组（服务器返回的相对路径）
        localImages?: string[]; // 本地图片数据（base64），用于即时显示
        contentArray?: Array<{ // 服务端返回的完整content结构
            type: 'text' | 'image_url';
            text?: string;
            image_url?: string[];
        }>;
        isUpgradeHint?: boolean; // 标记这是一个升级提示消息
        requiredCredits?: number; // 所需点数金额（美元）
        isContinueHint?: boolean; // 标记这是一个继续提示消息（达到最大轮次限制）
        needsContinue?: boolean; // 是否需要用户确认继续
        subtype?: string; // action 消息的子类型，如 'stripe'
        revertVersion?: boolean; // 标记这是版本回滚消息
        isSubmitted?: boolean; // action 消息是否已提交（用于 Stripe 等需要用户操作的 action）
        actionId?: string; // action 消息的 ID（来自 data._id，用于 Stripe 等操作）
    };
}

// 聊天会话类型
export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: number;
    updatedAt: number;
    settings: ChatSettings;
}

// 聊天设置
export interface ChatSettings {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt?: string;
}

// Socket 事件类型
export interface SocketEvents {
    // 客户端发送的事件
    'message:send': {
        content: string;
        sessionId: string;
        settings?: Partial<ChatSettings>;
    };
    'session:create': {
        title: string;
        settings?: Partial<ChatSettings>;
    };
    'session:update': {
        sessionId: string;
        updates: Partial<ChatSession>;
    };
    'session:delete': {
        sessionId: string;
    };

    // 服务端发送的事件
    'message:receive': {
        message: ChatMessage;
        sessionId: string;
    };
    'message:partial': {
        content: string;
        sessionId: string;
        messageId: string;
    };
    'session:created': {
        session: ChatSession;
    };
    'session:updated': {
        session: ChatSession;
    };
    'session:deleted': {
        sessionId: string;
    };
    'error': {
        code: string;
        message: string;
        sessionId?: string;
    };
    'connection:status': {
        status: 'connected' | 'disconnected' | 'reconnecting';
    };
}

// API 响应类型
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
    metadata?: {
        timestamp: number;
        requestId: string;
    };
}

// 聊天状态
export interface ChatState {
    // 连接状态
    connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

    // 会话管理
    sessions: ChatSession[];
    currentSessionId: string | null;

    // 当前会话消息
    messages: ChatMessage[];

    // 发送状态
    isSending: boolean;
    isTyping: boolean;

    // 设置
    settings: ChatSettings;

    // 错误状态
    error: string | null;
}

// Hook 返回值类型
export interface UseChatReturn {
    // 状态
    state: ChatState;

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
    clearMessages: () => void;

    // 设置管理
    updateSettings: (settings: Partial<ChatSettings>) => void;

    // 错误处理
    clearError: () => void;
}
