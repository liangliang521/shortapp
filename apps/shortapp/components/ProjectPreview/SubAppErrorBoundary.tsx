/**
 * SubAppErrorBoundary - 子 App 错误边界组件
 * 用于捕获子 App 中的 JavaScript 错误，防止应用崩溃
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { ChevronBackIcon } from '../icons/SvgIcons';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onBack?: () => void;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class SubAppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console
    console.error('❌ [SubAppErrorBoundary] Caught error in sub-app:', error);
    console.error('❌ [SubAppErrorBoundary] Error info:', errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });
    
    // Notify parent component
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI or use provided fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <View style={styles.errorContainer}>
          {/* 返回按钮 */}
          {this.props.onBack && (
            <View style={styles.errorHeader}>
              <Pressable
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.backButtonPressed
                ]}
                onPress={this.props.onBack}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ChevronBackIcon size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          )}
          
          <View style={styles.errorContent}>
            <Text style={styles.errorTitle}>子 App 加载错误</Text>
            <Text style={styles.errorMessage}>
              {this.state.error?.message || '未知错误'}
            </Text>
            {this.state.error?.stack && (
              <Text style={styles.errorStack}>
                {this.state.error.stack}
              </Text>
            )}
            <Text style={styles.errorHint}>
              请检查网络连接或联系开发者
            </Text>
            
            {/* 返回按钮（如果顶部没有） */}
            {this.props.onBack && (
              <TouchableOpacity
                style={styles.backButtonLarge}
                onPress={this.props.onBack}
              >
                <Text style={styles.backButtonText}>返回</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorHeader: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    opacity: 0.8,
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorStack: {
    fontSize: 12,
    color: '#999999',
    marginTop: 12,
    marginBottom: 12,
    textAlign: 'left',
    fontFamily: 'monospace',
  },
  errorHint: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 12,
    textAlign: 'center',
  },
  backButtonLarge: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

