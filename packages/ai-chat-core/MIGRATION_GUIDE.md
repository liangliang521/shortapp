# 迁移指南

## API 重构说明

我们将 API 相关功能抽离到了独立的 `@turbo-app/api-client` package，使架构更清晰、更易维护。

## 包结构变化

### 之前
```
@turbo-app/ai-chat-core
├── API 功能 (apiService, apiConfig, websocketService)
└── 聊天功能 (chatStore, useChat)
```

### 现在
```
@turbo-app/api-client        (新 package)
├── httpClient               HTTP REST API
├── websocketClient          WebSocket 实时通信
└── apiConfig               配置管理

@turbo-app/ai-chat-core      (保持)
├── chatStore               聊天状态管理
├── useChat                 聊天 Hook
└── useProjectChat          项目聊天 Hook (使用 api-client)
```

## 迁移步骤

### 1. 更新依赖

在 `package.json` 中添加新的依赖：

```json
{
  "dependencies": {
    "@turbo-app/ai-chat-core": "^1.0.0",
    "@turbo-app/api-client": "^1.0.0"
  }
}
```

然后运行：
```bash
npm install
```

### 2. 更新导入语句

#### 场景 1: 使用 HTTP API

**之前:**
```typescript
import { apiService, apiConfig } from '@turbo-app/ai-chat-core';

await apiService.loginWithGoogle('token');
```

**现在 (推荐方式 1):**
```typescript
import { httpClient, apiConfig } from '@turbo-app/api-client';

await httpClient.loginWithGoogle('token');
```

**现在 (推荐方式 2 - 向后兼容):**
```typescript
// ai-chat-core 重新导出了 api-client 的所有内容
import { httpClient, apiConfig } from '@turbo-app/ai-chat-core';

await httpClient.loginWithGoogle('token');
```

#### 场景 2: 使用 WebSocket

**之前:**
```typescript
import { websocketService } from '@turbo-app/ai-chat-core';

await websocketService.connect(projectId, userId);
```

**现在 (推荐方式 1):**
```typescript
import { websocketClient } from '@turbo-app/api-client';

await websocketClient.connect(projectId, userId);
```

**现在 (推荐方式 2 - 向后兼容):**
```typescript
import { websocketClient } from '@turbo-app/ai-chat-core';

await websocketClient.connect(projectId, userId);
```

#### 场景 3: 使用项目聊天 Hook

**之前和现在 (无需改动):**
```typescript
import { useProjectChat } from '@turbo-app/ai-chat-core';

const { state, connect, sendMessage } = useProjectChat();
```

> `useProjectChat` 内部已更新为使用 `api-client`，但对外接口保持不变。

### 3. 更新类型导入

**之前:**
```typescript
import {
    User,
    Project,
    BaseResponse,
    WebSocketMessage
} from '@turbo-app/ai-chat-core';
```

**现在 (推荐方式 1):**
```typescript
import {
    User,
    Project,
    BaseResponse,
    WebSocketMessage
} from '@turbo-app/api-client';
```

**现在 (推荐方式 2 - 向后兼容):**
```typescript
// ai-chat-core 重新导出了所有 api-client 的类型
import {
    User,
    Project,
    BaseResponse,
    WebSocketMessage
} from '@turbo-app/ai-chat-core';
```

## API 重命名对照表

| 旧名称 | 新名称 | Package |
|-------|--------|---------|
| `apiService` | `httpClient` | `@turbo-app/api-client` |
| `websocketService` | `websocketClient` | `@turbo-app/api-client` |
| `apiConfig` | `apiConfig` | `@turbo-app/api-client` (无变化) |

## 完整示例对比

### 示例 1: 完整的认证流程

**之前:**
```typescript
import { apiService, apiConfig } from '@turbo-app/ai-chat-core';

// 配置
apiConfig.setBaseURL('https://api.example.com');

// 登录
const response = await apiService.loginWithGoogle('token');
if (response.code === 0) {
    apiConfig.setAccessToken(response.data.access_token);
}

// 获取用户信息
const user = await apiService.getUserProfile(userId);
```

**现在:**
```typescript
import { httpClient, apiConfig } from '@turbo-app/api-client';

// 配置
apiConfig.setBaseURL('https://api.example.com');

// 登录
const response = await httpClient.loginWithGoogle('token');
if (response.code === 0) {
    apiConfig.setAccessToken(response.data.access_token);
}

// 获取用户信息
const user = await httpClient.getUserProfile(userId);
```

### 示例 2: WebSocket 通信

**之前:**
```typescript
import { websocketService, WebSocketMessageType } from '@turbo-app/ai-chat-core';

await websocketService.connect(projectId, userId);

websocketService.onMessage((message) => {
    if (message.type === WebSocketMessageType.MODEL_RESPONSE) {
        console.log(message.data.content);
    }
});

websocketService.sendUserPrompt('创建应用', projectId, userId);
```

**现在:**
```typescript
import { websocketClient, WebSocketMessageType } from '@turbo-app/api-client';

await websocketClient.connect(projectId, userId);

websocketClient.onMessage((message) => {
    if (message.type === WebSocketMessageType.MODEL_RESPONSE) {
        console.log(message.data.content);
    }
});

websocketClient.sendUserPrompt('创建应用', projectId, userId);
```

### 示例 3: React Component

**之前:**
```typescript
import { useProjectChat } from '@turbo-app/ai-chat-core';

function ChatComponent() {
    const { state, connect, sendMessage } = useProjectChat();
    
    useEffect(() => {
        connect();
    }, []);
    
    return <div>...</div>;
}
```

**现在 (完全相同，无需修改):**
```typescript
import { useProjectChat } from '@turbo-app/ai-chat-core';

function ChatComponent() {
    const { state, connect, sendMessage } = useProjectChat();
    
    useEffect(() => {
        connect();
    }, []);
    
    return <div>...</div>;
}
```

## 推荐做法

1. **新项目**: 直接从 `@turbo-app/api-client` 导入 API 功能
2. **现有项目**: 可以继续从 `@turbo-app/ai-chat-core` 导入（向后兼容），逐步迁移
3. **只需要 API 功能**: 直接使用 `@turbo-app/api-client`，无需安装 `ai-chat-core`

## 为什么要做这个改动？

1. **职责分离**: API 客户端与聊天功能是不同的关注点
2. **代码复用**: `api-client` 可以在其他项目中独立使用
3. **更小的包体积**: 如果只需要 API 功能，无需引入整个聊天系统
4. **更好的维护性**: 独立的 package 更容易测试和维护

## 需要帮助？

如果您在迁移过程中遇到任何问题，请：
1. 查看 `@turbo-app/api-client` 的 [README.md](../api-client/README.md)
2. 查看示例代码
3. 提交 issue

---

**🎉 迁移完成后，您的代码将更清晰、更易维护！**

