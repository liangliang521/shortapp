# AI Chat Core Service

一个功能完整的 AI 聊天服务包，提供 Socket 长连接、JSON 处理中间层和 React Hook 接口。

## 🚀 功能特性

- **WebSocket 实时通信**: 支持实时双向通信（User Prompt、Model Response、Sandbox Status）
- **AI 聊天核心**: 专注于 AI 对话和实时响应
- **HTTP API 集成**: 通过 `@turbo-app/api-client` 提供完整的 REST API 支持
- **JSON 处理中间层**: 安全的数据验证和转换
- **状态管理**: 基于 Zustand 的响应式状态管理
- **React Hooks**: 简单易用的 Hook 接口
- **类型安全**: 完整的 TypeScript 类型定义
- **错误处理**: 完善的错误处理和重试机制
- **模拟服务**: 内置模拟服务用于开发测试

## 📦 安装

```bash
npm install @turbo-app/ai-chat-core @turbo-app/api-client
```

> **注意**: `ai-chat-core` 现在依赖 `@turbo-app/api-client`，所有 API 和 WebSocket 功能都已移至该 package。

## 🔧 使用方法

> **📖 完整文档**:
> - [迁移指南](./MIGRATION_GUIDE.md) - 从旧版 API 迁移到新架构
> - [API Client 文档](../api-client/README.md) - HTTP 和 WebSocket API 详细文档

### 快速开始 - 项目聊天（推荐）

使用 `useProjectChat` Hook 集成完整的 API 和 WebSocket 功能：

```tsx
import React, { useEffect } from 'react';
import { useProjectChat } from '@turbo-app/ai-chat-core';

function ProjectChatScreen() {
  const {
    state,
    initialize,
    connect,
    disconnect,
    sendMessage,
    createProject,
    startProject,
  } = useProjectChat();

  useEffect(() => {
    // 初始化
    initialize('project-id', 'user-id', 'access-token');
    
    // 连接 WebSocket
    connect();
    
    return () => disconnect();
  }, []);

  const handleSend = async () => {
    await sendMessage('创建一个待办事项应用');
  };

  return (
    <div>
      {/* 连接状态 */}
      <div>状态: {state.isConnected ? '已连接' : '未连接'}</div>
      
      {/* 消息列表 */}
      {state.messages.map((msg) => (
        <div key={msg.id}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}
      
      {/* 发送按钮 */}
      <button onClick={handleSend} disabled={state.isSending}>
        发送消息
      </button>
      
      {/* 项目控制 */}
      <button onClick={startProject}>启动项目</button>
    </div>
  );
}
```

### HTTP API 使用

```tsx
import { httpClient, apiConfig } from '@turbo-app/ai-chat-core';
// 或者直接从 api-client 导入
// import { httpClient, apiConfig } from '@turbo-app/api-client';

// 配置 API
apiConfig.setBaseURL('https://api.example.com');
apiConfig.setAccessToken('your-access-token');

// Google 登录
const loginResponse = await httpClient.loginWithGoogle('google-token');
if (loginResponse.code === 0) {
  apiConfig.setAccessToken(loginResponse.data.access_token);
}

// 创建项目
const projectResponse = await httpClient.createProject();
if (projectResponse.code === 0) {
  const projectId = projectResponse.data.project_id;
}

// 获取项目列表
const projectsResponse = await httpClient.getProjects();
if (projectsResponse.code === 0) {
  const projects = projectsResponse.data;
}
```

### WebSocket 使用

```tsx
import { websocketClient, WebSocketMessageType } from '@turbo-app/ai-chat-core';

// 连接
await websocketClient.connect('project-id', 'user-id');

// 监听消息
websocketClient.onMessage((message) => {
  if (message.type === WebSocketMessageType.MODEL_RESPONSE) {
    console.log('AI 响应:', message.data.content);
  }
});

// 发送消息
websocketClient.sendUserPrompt('创建应用', 'project-id', 'user-id');
```

### 基础用法（原有功能）

```tsx
import { useChatMessages } from '@turbo-app/ai-chat-core';

function ChatComponent() {
  const { messages, sendMessage, isSending, isTyping, error, clearError } = useChatMessages();

  const handleSend = async (content: string) => {
    await sendMessage(content);
  };

  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>
          <strong>{message.role}:</strong> {message.content}
        </div>
      ))}
      
      {isTyping && <div>AI is typing...</div>}
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

### 完整功能用法

```tsx
import { useChat } from '@turbo-app/ai-chat-core';

function FullChatApp() {
  const {
    state,
    connect,
    disconnect,
    createSession,
    switchSession,
    sendMessage,
    updateSettings,
    clearError,
  } = useChat();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  return (
    <div>
      <h2>Chat Sessions</h2>
      {state.sessions.map(session => (
        <button 
          key={session.id}
          onClick={() => switchSession(session.id)}
        >
          {session.title}
        </button>
      ))}
      
      <h3>Messages</h3>
      {state.messages.map(message => (
        <div key={message.id}>
          <strong>{message.role}:</strong> {message.content}
        </div>
      ))}
      
      <button 
        onClick={() => sendMessage("Hello AI!")}
        disabled={state.isSending}
      >
        {state.isSending ? 'Sending...' : 'Send Message'}
      </button>
    </div>
  );
}
```

## 🏗️ 架构设计

### 核心组件

#### ai-chat-core (本 package)
1. **websocketClient**: WebSocket 客户端（AI 聊天专用实时通信）
2. **SocketService**: 原有 Socket 服务（向后兼容）
3. **JsonProcessor**: 数据验证和转换
4. **ChatStore**: Zustand 状态管理
5. **useProjectChat**: 项目聊天 Hook（推荐，集成 API 和 WebSocket）
6. **useChat**: 原有聊天 Hook（向后兼容）

#### api-client (依赖 package)
1. **httpClient**: HTTP REST API 客户端
2. **apiConfig**: API 配置管理（URL、Token 等）
3. **类型定义**: 所有 API 相关的 TypeScript 类型

> **架构说明**: 
> - `api-client` 提供通用的 HTTP REST API 功能
> - `ai-chat-core` 专注于 AI 聊天和 WebSocket 实时通信

### 数据流

#### 新的架构（推荐）
```
用户输入 → useProjectChat → WebSocketService → 服务端
                ↓
        ApiService (HTTP APIs)
                ↓
            状态更新 → UI 重新渲染
```

#### 原有架构（向后兼容）
```
用户输入 → useChat → ChatStore → SocketService → 服务端
                ↓
            状态更新 → UI 重新渲染
```

## 📡 API 接口

### HTTP API 端点

#### 认证相关
- `GET /api/v1/auth/login/google` - Google 登录
- `POST /api/v1/auth/refresh` - 刷新 Token
- `GET /api/v1/user/logout` - 登出

#### 用户相关
- `GET /api/v1/user/{user_id}` - 获取用户信息

#### 项目相关
- `POST /api/v1/projects` - 创建项目
- `GET /api/v1/projects` - 获取项目列表
- `GET /api/v1/projects/{project_id}` - 获取项目详情
- `PUT /api/v1/projects/{project_id}/rename` - 重命名项目
- `POST /api/v1/projects/{project_id}/start` - 启动项目
- `POST /api/v1/projects/{project_id}/stop` - 停止项目
- `DELETE /api/v1/projects/{project_id}` - 删除项目
- `GET /api/v1/projects/{project_id}/download` - 下载源代码

#### 发布相关
- `GET /api/v1/publish` - 发布应用

### WebSocket 消息类型

#### 客户端发送
- **user_prompt**: 用户提示消息
  ```typescript
  {
    type: 'user_prompt',
    msg_id: string,
    timestamp: string,
    user_id: string,
    project_id: string,
    data: { prompt: string }
  }
  ```

#### 服务端发送
- **model_response**: AI 模型响应
  ```typescript
  {
    type: 'model_response',
    msg_id: string,
    timestamp: string,
    user_id: string,
    project_id: string,
    data: {
      error: string | null,
      content: string | null  // JSON 字符串
    }
  }
  ```

- **sandbox_status**: 沙盒状态更新
  ```typescript
  {
    type: 'sandbox_status',
    msg_id: string,
    timestamp: string,
    user_id: string,
    project_id: string,
    data: { status: string }
  }
  ```

### 原有 Socket 事件（向后兼容）

#### 客户端发送事件
- `message:send`: 发送消息
- `session:create`: 创建会话
- `session:update`: 更新会话
- `session:delete`: 删除会话

#### 服务端发送事件
- `message:receive`: 接收消息
- `message:partial`: 流式消息部分
- `session:created`: 会话已创建
- `session:updated`: 会话已更新
- `session:deleted`: 会话已删除
- `error`: 错误信息
- `connection:status`: 连接状态

## 🔄 模拟服务

当没有真实服务端时，可以使用内置的模拟服务：

```tsx
import { mockSocketService } from '@turbo-app/ai-chat-core';

// 模拟服务会自动响应消息发送
mockSocketService.simulateMessageSend({
  content: "Hello AI",
  sessionId: "session_123"
});
```

## 🛠️ 配置

### 连接配置

```tsx
import { socketService } from '@turbo-app/ai-chat-core';

// 自定义连接 URL
const customSocketService = new SocketService('ws://your-server.com:3001');
```

### 默认设置

```tsx
import { defaultChatSettings } from '@turbo-app/ai-chat-core';

const customSettings = {
  ...defaultChatSettings,
  model: 'gpt-4',
  temperature: 0.5,
  maxTokens: 4000,
};
```

## 📝 类型定义

### ChatMessage

```typescript
interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
  status?: 'sending' | 'sent' | 'failed';
  metadata?: {
    tokens?: number;
    model?: string;
    finishReason?: string;
  };
}
```

### ChatSession

```typescript
interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  settings: ChatSettings;
}
```

## 🎯 工具函数

```tsx
import { chatUtils } from '@turbo-app/ai-chat-core';

// 生成消息 ID
const messageId = chatUtils.generateMessageId();

// 格式化时间戳
const formattedTime = chatUtils.formatTimestamp(Date.now());

// 估算 token 数量
const tokenCount = chatUtils.estimateTokens("Hello world");

// 验证消息
const validation = chatUtils.validateMessage("Hello");
if (validation.valid) {
  // 发送消息
}

// 提取代码块
const codeBlocks = chatUtils.extractCodeBlocks("```js\nconsole.log('hello');\n```");
```

## 🔒 安全特性

- **输入验证**: 自动清理和验证用户输入
- **长度限制**: 防止超长消息
- **控制字符过滤**: 移除潜在的危险字符
- **类型检查**: 完整的 TypeScript 类型安全

## 🚨 错误处理

```tsx
const { error, clearError } = useChatMessages();

if (error) {
  return (
    <div className="error">
      <p>Error: {error}</p>
      <button onClick={clearError}>Clear Error</button>
    </div>
  );
}
```

## 📊 性能优化

- **自动重连**: 连接断开时自动重连
- **消息缓存**: 本地存储聊天历史
- **状态持久化**: 会话数据自动保存
- **内存管理**: 自动清理过期的消息数据

## 🔧 开发调试

```tsx
import { useChatConnection } from '@turbo-app/ai-chat-core';

function ConnectionStatus() {
  const { connectionStatus, isConnected, isConnecting } = useChatConnection();
  
  return (
    <div>
      Status: {connectionStatus}
      {isConnected && "✅ Connected"}
      {isConnecting && "🔄 Connecting"}
    </div>
  );
}
```

## 📈 扩展性

该服务设计为高度可扩展：

- **插件系统**: 可以轻松添加新的消息类型
- **中间件支持**: 可以添加消息处理中间件
- **自定义传输**: 支持不同的传输协议
- **多实例**: 支持多个聊天实例

## 📚 更多文档

- **[API 使用指南](./API_USAGE.md)** - 完整的 API 使用文档和示例
- **[类型定义](./src/apiTypes.ts)** - 所有 TypeScript 类型定义

## 🔄 迁移指南

如果您正在使用旧版本的 API，建议迁移到新的 `useProjectChat` Hook：

**旧版本:**
```tsx
const { messages, sendMessage } = useChatMessages();
```

**新版本:**
```tsx
const { state, sendMessage, initialize, connect } = useProjectChat();
// state.messages 包含消息列表
```

新版本提供了：
- ✅ 完整的 HTTP API 支持
- ✅ 真实的 WebSocket 通信
- ✅ 项目管理功能
- ✅ 沙盒状态监控
- ✅ 更好的错误处理

---

**🎉 AI Chat Core Service 已准备就绪！**

这个服务包提供了完整的 AI 聊天功能，包括：
- ✅ HTTP REST API 客户端
- ✅ WebSocket 实时通信
- ✅ 认证和授权管理
- ✅ 项目生命周期管理
- ✅ 状态管理和 UI 集成

无论是开发原型还是生产应用，都能满足您的需求。
