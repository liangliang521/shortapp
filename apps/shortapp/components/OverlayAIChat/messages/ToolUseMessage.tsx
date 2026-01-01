import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from '../../icons/SvgIcons';
import { ChatMessage } from '@vibecoding/ai-chat-core';

interface ToolUseMessageProps {
  message: ChatMessage;
  onPress?: () => void;
}

export default function ToolUseMessage({ message }: ToolUseMessageProps) {
  // 解析工具使用信息
  const toolName = message.metadata?.toolName || 'Unknown Tool';

  // 尝试从内容中提取工具输入参数
  const content = message.content || '';
  const contentLines = content.split('\n');
  const inputStartIndex = contentLines.findIndex(line => line.includes('Input:'));
  const toolInput = inputStartIndex >= 0 ? contentLines.slice(inputStartIndex + 1).join('\n') : '';
  
  // 尝试从 toolInput 中解析参数
  let filePath: string | null = null;
  let command: string | null = null;
  let description: string | null = null;
  try {
    if (toolInput) {
      const parsed = JSON.parse(toolInput);
      filePath = parsed.file_path || parsed.path || null;
      command = parsed.command || null;
      description = parsed.description || null;
    }
  } catch (e) {
    // 如果解析失败，尝试从字符串中提取
    const filePathMatch = toolInput.match(/"file_path"\s*:\s*"([^"]+)"/) || 
                          toolInput.match(/"path"\s*:\s*"([^"]+)"/);
    if (filePathMatch) {
      filePath = filePathMatch[1];
    }
    const commandMatch = toolInput.match(/"command"\s*:\s*"([^"]+)"/);
    if (commandMatch) {
      command = commandMatch[1];
    }
    const descriptionMatch = toolInput.match(/"description"\s*:\s*"([^"]+)"/);
    if (descriptionMatch) {
      description = descriptionMatch[1];
    }
  }

  // 根据工具名称获取图标（SVG Icon 名称）
  const getToolIcon = (name: string): string => {
    const iconMap: Record<string, string> = {
      'Read': 'Document',
      'Write': 'Create',
      'Edit': 'Create',
      'Bash': 'Build',
      'Task': 'Checkmark',
      'Glob': 'Search',
      'Grep': 'Search',
      'WebFetch': 'Link',
      'WebSearch': 'Search',
      'TodoWrite': 'Document',
      'NotebookEdit': 'Document',
      'BashOutput': 'Build',
      'KillShell': 'CloseCircle',
      'SlashCommand': 'Build',
      'ExitPlanMode': 'Close',
    };
    return iconMap[name] || 'Build';
  };

  const toolIcon = getToolIcon(toolName);

  // 检查是否有实际显示的内容
  const hasFilePath = filePath && filePath.trim().length > 0;
  const hasCommand = command && command.trim().length > 0;
  const hasDescription = description && description.trim().length > 0;
  const hasBashContent = (toolName === 'Bash' || toolName === 'BashOutput') && (hasDescription || hasCommand);
  const hasAnyContent = hasFilePath || hasBashContent;

  // 如果是 Glob 工具且没有文件路径，则不显示整个组件
  if (toolName === 'Glob' && !hasFilePath) {
    return null;
  }

  // 如果是 Skill 工具且没有任何内容，则不显示整个组件
  if (toolName === 'Skill' && !hasFilePath && !hasCommand && !hasDescription) {
    return null;
  }

  // 如果没有任何内容可显示，也不显示组件（避免只显示标题和冒号）
  if (!hasAnyContent && toolName !== 'Bash' && toolName !== 'BashOutput') {
    return null;
  }

  return (
    <View style={styles.messageContainer}>
      <View style={styles.contentWrapper}>
        {/* 工具名称和图标 */}
        <View style={styles.titleContainer}>
          <Icon name={toolIcon} size={14} color="#8E8E93" />
          <Text style={styles.toolTitle}>{toolName} :</Text>
        </View>

        {/* 文件路径 - 字符换行 */}
        {hasFilePath && (
          <View style={styles.filePathContainer}>
            <Text style={styles.filePath}>{filePath}</Text>
          </View>
        )}

        {/* Bash 命令或描述 */}
        {hasBashContent && (
          <View style={styles.filePathContainer}>
            {hasDescription ? (
              <Text style={styles.filePath}>{description}</Text>
            ) : hasCommand ? (
              <Text style={styles.filePath}>Running: {command}</Text>
            ) : null}
          </View>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  contentWrapper: {
    paddingRight: 12,
    paddingLeft: 0, // 左侧无缩进
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8E8E93', // 灰色字体
  },
  filePathContainer: {
    marginTop: 2,
  },
  filePath: {
    fontSize: 15,
    color: '#8E8E93', // 灰色字体
    lineHeight: 21,
  },
});
