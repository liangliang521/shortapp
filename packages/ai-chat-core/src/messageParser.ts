/**
 * 消息解析工具
 * 统一处理WebSocket消息和历史消息的解析逻辑
 */

import { ChatMessage } from './types';

/**
 * 解析沙盒状态消息 (WebSocket type: 300)
 * @param sandboxData 沙盒状态数据
 * @param msgId 消息ID
 * @param timestamp 时间戳
 * @returns ChatMessage
 */
export function parseSandboxStatusMessage(
    sandboxData: any,
    msgId: string,
    timestamp: string
): ChatMessage {
    // 优先使用 web_preview_url，如果没有则使用 preview_url
    const previewUrl = sandboxData.startup_info?.web_preview_url || sandboxData.startup_info?.preview_url;
    
    console.log('🏗️ [messageParser] Parsing sandbox status message');
    console.log('📋 [messageParser] Sandbox data:', {
        status: sandboxData.status,
        sandboxId: sandboxData.sandbox_id,
        previewUrl: previewUrl,
    });

    return {
        id: msgId,
        type: 'sandbox',
        role: 'assistant',
        content: sandboxData.message || `Sandbox ${sandboxData.status}`,
        timestamp: new Date(timestamp).getTime(),
        metadata: {
            sandboxStatus: sandboxData.status,
            sandboxId: sandboxData.sandbox_id,
            previewUrl: previewUrl,
            expUrl: sandboxData.startup_info?.exp_url,
            jobId: sandboxData.job_id,
        },
    };
}

/**
 * 解析WebSocket实时消息中的assistant消息内容
 * @param agentMessage assistant消息对象
 * @param msgId 消息ID
 * @param timestamp 时间戳
 * @returns ChatMessage数组
 */
export function parseAssistantContent(
    agentMessage: any,
    msgId: string,
    timestamp: string
): ChatMessage[] {
    const messages: ChatMessage[] = [];

    if (!agentMessage?.message) {
        console.log('⚠️ [messageParser] No message in agentMessage');
        return messages;
    }

    const contentArray = agentMessage.message.content || [];
    console.log(`📋 [messageParser] Processing ${contentArray.length} content items, using msg_id: ${msgId}`);

    contentArray.forEach((item: any, index: number) => {
        console.log(`\n--- Processing content item #${index} ---`);
        console.log('Item type:', item.type);

        // 直接使用 msg_id，禁止拼接任何参数

        let content = '';
        let messageType: ChatMessage['type'] = 'model_assistant_text';

        if (item.type === 'text') {
            // 文本回复
            // 确保 content 是字符串类型
            const textValue = item.text;
            content = typeof textValue === 'string' ? textValue : (textValue ? String(textValue) : '');
            messageType = 'model_assistant_text';
            console.log(`🤖 [messageParser] Text content #${index}:`, content ? content.substring(0, 100) : '(empty)');
        } else if (item.type === 'tool_use') {
            // 工具使用
            const toolInput = JSON.stringify(item.input || {}, null, 2);
            content = `Input:\n${toolInput}`;
            messageType = 'model_assistant_tool_use';
            console.log(`🔧 [messageParser] Tool use #${index}: ${item.name}, using server ID: ${item.id}`);
        } else if (item.type === 'tool_result') {
            // 工具结果
            // 确保 content 是字符串类型
            const contentValue = item.content;
            content = typeof contentValue === 'string' ? contentValue : (contentValue ? String(contentValue) : '');
            messageType = 'model_assistant_tool_result';
            console.log(`✅ [messageParser] Tool result #${index}:`, content ? content.substring(0, 100) : '(empty)');
        } else {
            console.warn(`⚠️ [messageParser] Unknown content item type: ${item.type}`);
        }

        if (content || item.type === 'tool_use') {
            messages.push({
                id: msgId, // 直接使用 msg_id，不拼接
                type: messageType,
                role: 'assistant',
                content: content,
                timestamp: new Date(timestamp).getTime(),
                metadata: item.type === 'tool_use' ? {
                    toolName: item.name || 'Unknown Tool',
                    toolId: item.id,
                } : item.type === 'tool_result' ? {
                    toolId: item.tool_use_id,
                } : undefined,
            });
        }
    });

    console.log(`✅ [messageParser] Parsed ${messages.length} messages`);
    return messages;
}

/**
 * 解析用户消息（WebSocket实时消息）
 * @param agentMessage user消息对象
 * @param msgId 消息ID
 * @param timestamp 时间戳
 * @param projectId 项目ID（可选，用于图片URL）
 * @returns ChatMessage
 */
export function parseUserMessage(
    agentMessage: any,
    msgId: string,
    timestamp: string,
    projectId?: string | null
): ChatMessage {
    console.log('👤 [messageParser] Parsing user message from WebSocket');
    
    // 检查是否是特殊格式的消息（如 revert_version）
    const messageObj = agentMessage.message;
    
    // 如果 message 是一个对象且包含 revert_version，这是版本回滚消息
    if (messageObj && typeof messageObj === 'object' && !Array.isArray(messageObj) && messageObj.revert_version) {
        console.log('🔄 [messageParser] Detected revert_version message');
        return {
            id: msgId,
            type: 'user',
            role: 'user',
            content: 'Version restored',
            timestamp: new Date(timestamp).getTime(),
            metadata: {
                revertVersion: true,
                projectId: projectId || undefined,
            },
        };
    }
    
    // 从 content 数组中提取文本和图片
    const contentArray = messageObj?.content || [];
    
    // 提取文本内容
    const textContent = contentArray.find((item: any) => item.type === 'text');
    const prompt = textContent?.text || messageObj?.prompt || '';
    
    // 如果 message 是字符串，直接使用
    if (typeof messageObj === 'string') {
        return {
            id: msgId,
            type: 'user',
            role: 'user',
            content: messageObj,
            timestamp: new Date(timestamp).getTime(),
        };
    }
    
    // 提取图片URL（兼容两种数据结构）
    // 新结构：{ type: 'image', image: [...] }
    // 旧结构：{ type: 'image_url', image_url: [...] }
    const imageContent = contentArray.find((item: any) => item.type === 'image' || item.type === 'image_url');
    const imageUrls = imageContent?.image || imageContent?.image_url || [];
    const hasImages = imageUrls.length > 0;
    
    console.log('✅ [messageParser] User message parsed:', {
        prompt: prompt.substring(0, 50),
        imageCount: imageUrls.length,
        hasImages
    });

    return {
        id: msgId,
        type: 'user',
        role: 'user',
        content: prompt,
        timestamp: new Date(timestamp).getTime(),
        metadata: hasImages ? {
            projectId: projectId || undefined,
            images: imageUrls, // 服务器返回的图片路径
            contentArray: contentArray // 保存完整的content数组
        } : undefined,
    };
}

/**
 * 解析result消息
 * @param agentMessage result消息对象
 * @param msgId 消息ID
 * @param timestamp 时间戳
 * @returns ChatMessage
 */
export function parseResultMessage(
    agentMessage: any,
    msgId: string,
    timestamp: string
): ChatMessage {
    // 确保 content 是字符串类型
    const resultValue = agentMessage.result;
    const content = typeof resultValue === 'string' ? resultValue : (resultValue ? String(resultValue) : '');
    console.log('🎯 [messageParser] Parsing result message:', content ? content.substring(0, 100) : '(empty)', 'using msg_id:', msgId);

    return {
        id: msgId, // 统一使用 msg_id
        type: 'model_result',
        role: 'assistant',
        content: content,
        timestamp: new Date(timestamp).getTime(),
        metadata: {
            tokens: agentMessage.usage?.output_tokens,
            model: agentMessage.modelUsage ? Object.keys(agentMessage.modelUsage)[0] : undefined,
        }
    };
}

/**
 * 解析历史事件为ChatMessage数组
 * @param events 历史事件数组
 * @param baseIndex 基础索引（用于生成唯一ID）
 * @returns ChatMessage数组
 */
export function parseHistoryEvents(events: any[], baseIndex: number = 0): ChatMessage[] {
    const historyMessages: ChatMessage[] = [];

    events.forEach((event: any, index: number) => {
        const agentMessage = event.agent_message;
        if (!agentMessage) return;

        // 统一使用 event.msg_id
        const eventMsgId = event.msg_id || `history_${baseIndex + index}`;

        // 用户消息 - 使用统一的解析器
        if (agentMessage.type === 'user') {
            const userMessage = parseUserMessage(
                agentMessage,
                eventMsgId, // 使用 event.msg_id
                event.timestamp,
                undefined // 历史消息中 projectId 通过外部参数传入
            );
            
            // 如果有 projectId，添加到 metadata
            if (!userMessage.metadata && (event.project_id || undefined)) {
                userMessage.metadata = { projectId: event.project_id };
            } else if (userMessage.metadata && event.project_id) {
                userMessage.metadata.projectId = event.project_id;
            }

            historyMessages.push(userMessage);
        }

        // AI助手消息
        if (agentMessage.type === 'assistant' && agentMessage.message) {
            const contentArray = agentMessage.message.content || [];
            
            contentArray.forEach((item: any, contentIndex: number) => {
                // 直接使用 event.msg_id，禁止拼接任何参数
                
                let content = '';
                let messageType: ChatMessage['type'] = 'model_assistant_text';

                if (item.type === 'text') {
                    content = item.text || '';
                    messageType = 'model_assistant_text';
                } else if (item.type === 'tool_use') {
                    const toolInput = JSON.stringify(item.input || {}, null, 2);
                    content = `Input:\n${toolInput}`;
                    messageType = 'model_assistant_tool_use';
                } else if (item.type === 'tool_result') {
                    content = item.content || '';
                    messageType = 'model_assistant_tool_result';
                }

                if (content || item.type === 'tool_use') {
                    historyMessages.push({
                        id: eventMsgId, // 直接使用 event.msg_id，不拼接
                        type: messageType,
                        role: 'assistant',
                        content: content,
                        timestamp: new Date(event.timestamp).getTime(),
                        metadata: item.type === 'tool_use' ? {
                            toolName: item.name || 'Unknown Tool',
                            toolId: item.id,
                        } : item.type === 'tool_result' ? {
                            toolId: item.tool_use_id,
                        } : undefined,
                    });
                }
            });
        }

        // Result消息
        if (agentMessage.type === 'result') {
            historyMessages.push({
                id: eventMsgId, // 使用 event.msg_id
                type: 'model_result',
                role: 'assistant',
                content: agentMessage.result || '',
                timestamp: new Date(event.timestamp).getTime(),
                metadata: {
                    tokens: agentMessage.usage?.output_tokens,
                    model: agentMessage.modelUsage ? Object.keys(agentMessage.modelUsage)[0] : undefined,
                }
            });
        }

        // Error消息
        if (agentMessage.type === 'error') {
            historyMessages.push({
                id: eventMsgId, // 使用 event.msg_id
                type: 'model_system_init',
                role: 'assistant',
                content: `❌ 错误: ${agentMessage.error || 'Unknown error'}`,
                timestamp: new Date(event.timestamp).getTime(),
            });
        }

        // Status消息 - 跳过，不在历史记录中显示
        // status 消息（如 thinking）只是实时状态指示，历史记录中不需要显示
        if (agentMessage.type === 'status') {
            // 静默跳过，不添加到历史消息中
            return;
        }

        // 未知类型 - 显示调试信息
        const knownTypes = ['user', 'assistant', 'result', 'error', 'system', 'status'];
        if (!knownTypes.includes(agentMessage.type)) {
            console.warn('⚠️ [messageParser] Unknown message type:', agentMessage.type);
            console.log('Full agentMessage:', agentMessage);
            historyMessages.push({
                id: eventMsgId, // 使用 event.msg_id
                type: 'model_system_init',
                role: 'assistant',
                content: `⚠️ 收到未知类型的历史消息 (type: ${agentMessage.type})`,
                timestamp: new Date(event.timestamp).getTime(),
            });
        }
    });

    return historyMessages;
}
