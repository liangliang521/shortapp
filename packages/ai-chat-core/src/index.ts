// 导出所有类型
export * from './types';

// 从 api-client 重新导出 API 相关内容
export * from '@vibecoding/api-client';

// 导出核心服务
export * from './socketService';
export * from './websocketClient';
export * from './jsonProcessor';
export * from './chatStore';
export * from './messageParser';

// 导出 React Hooks
export * from './useChat';
export * from './useProjectChat';

// 导出默认配置
export const defaultChatSettings = {
    model: 'claude-sonnet-4',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: 'You are a helpful AI assistant that helps users build mobile applications.',
};

// 导出工具函数
export const chatUtils = {
    // 生成消息 ID
    generateMessageId: () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

    // 生成会话 ID
    generateSessionId: () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

    // 格式化时间戳
    formatTimestamp: (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    },

    // 计算消息长度
    estimateTokens: (text: string) => {
        // 简单的 token 估算：平均每个 token 约 4 个字符
        return Math.ceil(text.length / 4);
    },

    // 验证消息内容
    validateMessage: (content: string) => {
        if (!content || typeof content !== 'string') {
            return { valid: false, error: 'Message content is required' };
        }

        if (content.trim().length === 0) {
            return { valid: false, error: 'Message content cannot be empty' };
        }

        if (content.length > 10000) {
            return { valid: false, error: 'Message content is too long' };
        }

        return { valid: true };
    },

    // 截断消息内容
    truncateMessage: (content: string, maxLength: number = 100) => {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    },

    // 提取消息中的代码块
    extractCodeBlocks: (content: string) => {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        const blocks: { language: string; code: string }[] = [];
        let match;

        while ((match = codeBlockRegex.exec(content)) !== null) {
            blocks.push({
                language: match[1] || 'text',
                code: match[2],
            });
        }

        return blocks;
    },

    // 高亮消息中的关键词
    highlightKeywords: (content: string, keywords: string[]) => {
        let highlightedContent = content;

        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            highlightedContent = highlightedContent.replace(
                regex,
                `<mark>${keyword}</mark>`
            );
        });

        return highlightedContent;
    },
};
