import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Icon from '../../icons/SvgIcons';
import { ChatMessage } from '@vibecoding/ai-chat-core';

interface TodoWriteMessageProps {
  message: ChatMessage;
  onPress?: () => void;
}

interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

// 圆形加载图标组件
const LoadingCircleIcon = ({ size = 16, color = '#000' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" strokeDasharray="4 4" />
  </Svg>
);

// 普通圆点图标
const DotIcon = ({ size = 16, color = '#000' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Circle cx="8" cy="8" r="3" fill={color} />
  </Svg>
);

export default function TodoWriteMessage({ message, onPress }: TodoWriteMessageProps) {
  // 解析 todo 数据
  const parseTodos = (): TodoItem[] => {
    try {
      // 尝试从 content 中解析 JSON
      const content = message.content || '';
      
      // 查找 JSON 数组部分
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const todos = JSON.parse(jsonMatch[0]);
        return todos;
      }
      
      // 如果解析失败，返回空数组
      return [];
    } catch (error) {
      console.error('Failed to parse todos:', error);
      return [];
    }
  };

  const todos = parseTodos();

  if (todos.length === 0) {
    return null;
  }

  // 根据状态返回图标组件
  const renderStatusIcon = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return <Icon name="Checkmark" size={16} color="#000000" />;
      case 'in_progress':
        return <LoadingCircleIcon size={16} color="#000" />;
      case 'pending':
      default:
        return <DotIcon size={16} color="#000" />;
    }
  };

  return (
    <TouchableOpacity
      style={styles.messageContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Title */}
      <Text style={styles.title}>Todo List</Text>

      {/* Todo Content */}
      <View style={styles.todoContainer}>
        {todos.map((todo, index) => (
          <View key={todo.id || index} style={styles.todoItem}>
            <View style={styles.iconContainer}>
              {renderStatusIcon(todo.status)}
            </View>
            <Text 
              style={[
                styles.todoText,
                todo.status === 'completed' && styles.todoTextCompleted,
              ]}
            >
              {todo.content}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    width: '100%',
    borderWidth: 0,
  },
  title: {
    fontSize: 15,
    color: '#000000',
    marginBottom: 6,
    fontFamily: 'System', // sans-serif equivalent
  },
  todoContainer: {
    marginTop: 0,
    paddingLeft: 12, // 底部缩进，形成层次感
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  iconContainer: {
    width: 16,
    height: 16,
    marginRight: 8,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todoText: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 21,
    flex: 1,
    fontFamily: 'System', // sans-serif equivalent
  },
  todoTextCompleted: {
    color: '#8E8E93',
    textDecorationLine: 'line-through',
  },
});

