# API Client

HTTP REST API 客户端，基于 OpenAPI 规范实现。

## 📦 安装

```bash
npm install @turbo-app/api-client
```

## 🚀 功能特性

- **HTTP REST API 客户端** - 完整的 HTTP API 支持（13个端点）
- **认证管理** - 自动添加 Authorization 头
- **项目管理** - 创建、查询、启动、停止项目
- **用户管理** - 登录、登出、用户信息查询
- **类型安全** - 完整的 TypeScript 类型定义
- **单例模式** - 全局配置管理

> **注意**: WebSocket 实时通信功能在 `@turbo-app/ai-chat-core` package 中。

## 🔧 使用方法

### 1. 配置 API

```typescript
import { apiConfig } from '@turbo-app/api-client';

// 设置 API 基础 URL
apiConfig.setBaseURL('https://api.example.com');

// 设置 WebSocket URL
apiConfig.setWsURL('wss://ws.example.com');

// 设置访问令牌
apiConfig.setAccessToken('your-access-token');
```

### 2. 使用 HTTP API

```typescript
import { httpClient } from '@turbo-app/api-client';

// Google 登录
const response = await httpClient.loginWithGoogle('google-token');
if (response.code === 0) {
    const { user, access_token } = response.data;
    apiConfig.setAccessToken(access_token);
}

// 创建项目
const project = await httpClient.createProject();

// 获取项目列表
const projects = await httpClient.getProjects();

// 启动项目
await httpClient.startProject(projectId);
```

### 3. WebSocket 功能

WebSocket 实时通信功能在 `@turbo-app/ai-chat-core` 中：

```typescript
import { websocketClient, WebSocketMessageType } from '@turbo-app/ai-chat-core';

// 连接
await websocketClient.connect(projectId, userId);

// 监听消息
websocketClient.onMessage((message) => {
    if (message.type === WebSocketMessageType.MODEL_RESPONSE) {
        console.log('AI 响应:', message.data.content);
    }
});
```

或者使用 React Hook (推荐):

```typescript
import { useProjectChat } from '@turbo-app/ai-chat-core';

const { state, connect, sendMessage } = useProjectChat();
```

## 📡 API 接口

### HTTP API 端点

#### 认证相关
- `loginWithGoogle(googleAccessToken?)` - Google 登录
- `refreshToken()` - 刷新 Token
- `logout()` - 登出

#### 用户相关
- `getUserProfile(userId)` - 获取用户信息

#### 项目相关
- `createProject()` - 创建项目
- `getProjects()` - 获取项目列表
- `getProject(projectId)` - 获取项目详情
- `deleteProject(projectId)` - 删除项目
- `renameProject(projectId, name)` - 重命名项目
- `startProject(projectId)` - 启动项目
- `stopProject(projectId)` - 停止项目
- `downloadProject(projectId)` - 下载源代码

#### 发布相关
- `publishApp(data)` - 发布应用到应用商店

## 📝 类型定义

所有类型都可以导入：

```typescript
import {
    User,
    Project,
    BaseResponse,
    LoginData,
    WebSocketMessage,
    WebSocketMessageType,
    ModelResponse,
    SandboxStatus,
} from '@turbo-app/api-client';
```

## 🔒 错误处理

所有 HTTP API 返回统一格式：

```typescript
interface BaseResponse<T> {
    code: number;      // 0 表示成功
    data?: T | null;   // 成功时的数据
    info?: string;     // 错误信息
}
```

示例：

```typescript
const response = await httpClient.createProject();
if (response.code === 0) {
    console.log('成功:', response.data);
} else {
    console.error('错误:', response.info);
}
```

## 🌐 配置选项

```typescript
// 设置超时时间
apiConfig.setTimeout(30000);

// 重置所有配置
apiConfig.reset();

// 获取当前配置
const baseURL = apiConfig.getBaseURL();
const wsURL = apiConfig.getWsURL();
const token = apiConfig.getAccessToken();
```

## 📚 更多信息

这个 package 是独立的 **HTTP REST API 客户端**，专注于：
- ✅ 用户认证和授权
- ✅ 项目生命周期管理
- ✅ 数据查询和更新

如果您需要 **WebSocket 实时通信**和 **AI 聊天功能**，请使用 `@turbo-app/ai-chat-core`。

## 🔗 相关 Package

- **[@turbo-app/ai-chat-core](../ai-chat-core/README.md)** - AI 聊天核心功能，包含 WebSocket 客户端

---

**Made with ❤️ for turbo-react-native-app**

