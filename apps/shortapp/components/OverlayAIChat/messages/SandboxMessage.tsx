import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from '../../icons/SvgIcons';
import { ChatMessage } from '@vibecoding/ai-chat-core';

interface SandboxMessageProps {
  message: ChatMessage;
  onPress?: () => void;
}

export default function SandboxMessage({ message, onPress }: SandboxMessageProps) {
  return null;
  const sandboxStatus = message.metadata?.sandboxStatus || 'unknown';
  const previewUrl = message.metadata?.previewUrl;

  // 根据状态确定颜色和图标
  const getStatusInfo = (status: string) => {
    const lowerStatus = status.toLowerCase();
    
    if (lowerStatus === 'success' || lowerStatus.includes('active') || lowerStatus.includes('running')) {
      return {
        color: '#34C759',
        icon: 'CheckmarkCircle',
        bgColor: '#F0F9F4',
        title: 'Sandbox Ready',
      };
    } else if (lowerStatus === 'killed' || lowerStatus.includes('stopped') || lowerStatus.includes('inactive')) {
      return {
        color: '#FF9500',
        icon: 'AlertCircle',
        bgColor: '#FFF3E0',
        title: 'Sandbox Stopped',
      };
    } else if (lowerStatus === 'failed' || lowerStatus.includes('error')) {
      return {
        color: '#FF3B30',
        icon: 'CloseCircle',
        bgColor: '#FEF2F2',
        title: 'Sandbox Error',
      };
    } else if (lowerStatus === 'creating' || lowerStatus.includes('loading') || lowerStatus.includes('starting') || lowerStatus.includes('building')) {
      return {
        color: '#007AFF',
        icon: 'Refresh',
        bgColor: '#F0F4FF',
        title: 'Setting up Sandbox',
      };
    } else {
      return {
        color: '#8E8E93',
        icon: 'Build',
        bgColor: '#F2F2F7',
        title: 'Sandbox Update',
      };
    }
  };

  const statusInfo = getStatusInfo(sandboxStatus);

  return (
    <TouchableOpacity
      style={[
        styles.messageContainer,
        { backgroundColor: statusInfo.bgColor }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Message Header */}
      <View style={styles.messageHeader}>
        <View style={styles.titleContainer}>
          <Icon name={statusInfo.icon} size={18} color={statusInfo.color} />
          <Text style={[styles.messageTitle, { color: statusInfo.color }]}>
            {statusInfo.title}
          </Text>
        </View>
      </View>

      {/* Status Content */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>{message.content || ''}</Text>
        <Text style={styles.statusDescription}>
          {getStatusDescription(sandboxStatus)}
        </Text>
      </View>

      {/* Preview URL (if available) */}
      {previewUrl && sandboxStatus === 'success' && (
        <View style={styles.urlContainer}>
          <Icon name="Link" size={14} color="#007AFF" />
          <Text style={styles.urlText} numberOfLines={1}>
            {previewUrl}
          </Text>
        </View>
      )}

      {/* Additional Info */}
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Icon name="TimeOutline" size={12} color="#8E8E93" />
          <Text style={styles.infoText}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </Text>
        </View>
        {message.metadata?.sandboxId && (
          <View style={styles.infoRow}>
            <Icon name="Server" size={12} color="#8E8E93" />
            <Text style={styles.infoText} numberOfLines={1}>
              {message.metadata?.sandboxId}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const getStatusDescription = (status: string): string => {
  const lowerStatus = status.toLowerCase();
  
  if (lowerStatus === 'success') {
    return '✅ Sandbox created successfully and ready to use';
  } else if (lowerStatus === 'killed') {
    return '⚠️ Sandbox was stopped and will restart automatically';
  } else if (lowerStatus === 'creating') {
    return '🔄 Setting up your development environment...';
  } else if (lowerStatus === 'failed') {
    return '❌ Sandbox creation failed, please try again';
  } else if (lowerStatus.includes('active')) {
    return '✅ Your development environment is running';
  } else if (lowerStatus.includes('inactive') || lowerStatus.includes('stopped')) {
    return '⏸️ Development environment has been stopped';
  } else if (lowerStatus.includes('building')) {
    return '🔨 Building your development environment...';
  } else {
    return 'Development environment status update';
  }
};

const styles = StyleSheet.create({
  messageContainer: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    marginHorizontal: 0,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  statusDescription: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 6,
  },
  urlText: {
    fontSize: 11,
    color: '#007AFF',
    flex: 1,
    fontFamily: 'monospace',
  },
  infoContainer: {
    alignItems: 'center',
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 11,
    color: '#8E8E93',
  },
});
