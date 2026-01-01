import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Pressable,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  Keyboard,
  Share,
  Linking,
  PermissionsAndroid,
  AppState,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { APP_LINKS, openLink } from '../config/links';
import { websocketClient } from '@vibecoding/ai-chat-core/src/websocketClient';
import { WebSocketMessageType, WebSocketMessage, ModelResponseMessage, httpClient, ProjectVersion } from '@vibecoding/api-client';
import { parseSandboxStatusMessage, parseUserMessage } from '@vibecoding/ai-chat-core/src/messageParser';
import { useAuthStoreData } from '../stores/authStore';
import { launchCamera, launchImageLibrary, CameraOptions, ImageLibraryOptions, Asset } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DevMenu from '../src/menu/DevMenuModule';
import { MAX_IMAGES, compressImage, convertImageToBase64 } from '../utils/imageUtils';
import {
  TopButtons,
  TopActions,
  ChatContent,
  InputArea,
  ShareModal,
  BuildModal,
  ModelModal,
  VersionHistoryModal,
  VersionHistoryItem,
  RestoreConfirmModal,
} from './OverlayAIChat/index';
import SubscriptionScreen from './SubscriptionScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { BlurView } from '@react-native-community/blur';
import { MODEL_OPTIONS } from '../config/models';

interface OverlayAIChatProps {
  isVisible: boolean;
  onClose: () => void;
  onGoHome?: () => void;
  projectId?: string | null;
  projectUrl?: string | null;
  onRefreshWebView?: () => void;
}

const { height } = Dimensions.get('window');

// Import ChatMessage type from ai-chat-core
import { ChatMessage } from '@vibecoding/ai-chat-core/src/types';

export default function OverlayAIChat({ isVisible, onClose, onGoHome, projectId, projectUrl, onRefreshWebView }: OverlayAIChatProps) {
  console.log('OverlayAIChat rendered, isVisible:', isVisible);
  
  // Get user info from auth store
  const { user } = useAuthStoreData();
  
  // Local state for messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCodingComplete, setIsCodingComplete] = useState(false); // 编码完成状态
  const [isSandboxReady, setIsSandboxReady] = useState(false); // 沙盒启动成功状态
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  // ChatContent 的底部 padding，用于在键盘弹起/输入区域占位时避免内容被遮挡
  // 基础值约等于输入区域高度，让聊天记录默认从输入框上方开始
  const BASE_CHAT_PADDING_BOTTOM = 40;
  const [chatContentPaddingBottom, setChatContentPaddingBottom] = useState(BASE_CHAT_PADDING_BOTTOM);
  
  const [inputText, setInputText] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]); // 存储base64字符串
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);
  const [pendingRestoreVersion, setPendingRestoreVersion] = useState<VersionHistoryItem | null>(null);
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>([]);
  const [versionHistoryOffset, setVersionHistoryOffset] = useState<number>(0);
  const [versionHistoryTotal, setVersionHistoryTotal] = useState<number>(0);
  const [isLoadingMoreVersions, setIsLoadingMoreVersions] = useState<boolean>(false);
  const [hasMoreVersions, setHasMoreVersions] = useState<boolean>(true);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [selectedModel, setSelectedModel] = useState('glm-4.7');

  // 标记当前这一轮是否已被用户「取消/终止」
  // 一旦为 true，本轮后续的 result / sandbox 状态更新和 "Refreshing mini app" 等 UI 都会被忽略
  const isRunCancelledRef = useRef(false);

  // 动画值：chatContainer 的样式变化
  const chatContainerBorderRadius = useSharedValue(24);
  const chatContainerMarginTop = useSharedValue(20);
  const chatContainerMaxHeight = useSharedValue(height * 0.9);
  const chatContainerMinHeight = useSharedValue(height * 0.85);
  const topButtonsOpacity = useSharedValue(1);
  const topButtonsTranslateY = useSharedValue(0);
  // 输入框的位移，用于与键盘同步
  const inputAreaTranslateY = useSharedValue(0);
  
  const SELECTED_IMAGES_KEY = '@selected_images';
  const SELECTED_MODEL_KEY = '@ai_chat_selected_model';
  const DONT_REMIND_RESTORE_KEY = '@version_restore_dont_remind';
  
  // App Clip link - should be obtained from actual project data
  const appClipLink = `${APP_LINKS.APP_STORE}/projects/0199e1ed-1234-5678-9abc-def012345678`;
  
  const requestMediaLibraryPermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const androidVersion =
        typeof Platform.Version === 'number'
          ? Platform.Version
          : parseInt(String(Platform.Version), 10);
      const permission =
        androidVersion >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

      const status = await PermissionsAndroid.request(permission, {
        title: 'Media Library Permission',
        message: 'Camera roll permission is required to select images',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
      });

      if (status === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      Alert.alert('Permission Denied', 'Camera roll permission is required to select images');
      return false;
    } catch (permissionError) {
      console.error('❌ Error requesting media library permission:', permissionError);
      Alert.alert('Error', 'Unable to request media library permission');
      return false;
    }
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
        title: 'Camera Permission',
        message: 'Camera permission is required to take photos',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
      });

      if (status === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      Alert.alert('Permission Denied', 'Camera permission is required to take photos');
      return false;
    } catch (permissionError) {
      console.error('❌ Error requesting camera permission:', permissionError);
      Alert.alert('Error', 'Unable to request camera permission');
      return false;
    }
  };

  // 保存图片到AsyncStorage
  const saveImagesToStorage = async (images: string[]) => {
    try {
      await AsyncStorage.setItem(SELECTED_IMAGES_KEY, JSON.stringify(images));
      console.log('💾 Saved images to storage:', images.length);
    } catch (error) {
      console.error('❌ Error saving images:', error);
    }
  };
  
  // 从AsyncStorage恢复图片
  const loadImagesFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(SELECTED_IMAGES_KEY);
      if (stored) {
        const images = JSON.parse(stored);
        setSelectedImages(images);
        console.log('✅ Restored images from storage:', images.length);
      }
    } catch (error) {
      console.error('❌ Error loading images:', error);
    }
  };
  
  // 清除存储的图片
  const clearImagesFromStorage = async () => {
    try {
      await AsyncStorage.removeItem(SELECTED_IMAGES_KEY);
      console.log('🗑️ Cleared images from storage');
    } catch (error) {
      console.error('❌ Error clearing images:', error);
    }
  };

  /**
   * 将本轮对话相关的运行状态重置为初始值
   * - 停止「正在发送」「正在思考」「Refreshing mini app」等 UI
   * - 清除编码完成 / 沙盒就绪标记，下一轮从干净状态开始
   * - 重置本轮取消标记
   */
  const resetChatRunState = useCallback(() => {
    console.log('🔁 [OverlayAIChat] Reset chat run state to initial');
    setIsTyping(false);
    setIsSending(false);
    setIsCodingComplete(false);
    setIsSandboxReady(false);
    isRunCancelledRef.current = false;
  }, []);

  // 从 AsyncStorage 恢复模型选择（默认 glm-4.7）
  useEffect(() => {
    const loadSelectedModel = async () => {
      try {
        const storedModel = await AsyncStorage.getItem(SELECTED_MODEL_KEY);
        if (storedModel) {
          setSelectedModel(storedModel);
          console.log('✅ [OverlayAIChat] Restored selected model from storage:', storedModel);
        } else {
          console.log('ℹ️ [OverlayAIChat] No stored model, using default glm-4.7');
        }
      } catch (error) {
        console.error('❌ [OverlayAIChat] Error loading selected model:', error);
      }
    };

    loadSelectedModel();
  }, []);
  
  // Model options
  const modelOptions = MODEL_OPTIONS;

  // 组件加载时恢复选中的图片和加载历史消息
  useEffect(() => {
    console.log('👀 [OverlayAIChat] Visibility changed:', {
      isVisible,
      projectId,
      currentHistoryOffset: historyOffset,
      hasMoreHistory,
    });

    if (!isVisible) {
      // 组件消失时，清空选择的图片
      console.log('🗑️ [OverlayAIChat] Component hidden, clearing selected images');
      setSelectedImages([]);
      clearImagesFromStorage();
      return;
    }

    setIsInitialLoadComplete(false); // 重置加载状态
    setHistoryOffset(0);
    setHasMoreHistory(true);
    loadImagesFromStorage();

    if (!projectId) {
      console.log('⚠️ [OverlayAIChat] Missing projectId, skipping initial history load');
      setIsInitialLoadComplete(true);
      return;
    }

    console.log('📥 [OverlayAIChat] Triggering initial history load');
    loadHistoryMessages(true); // true表示初始加载
  }, [isVisible, projectId]);

  // 解析历史事件为ChatMessage
  const parseHistoryEvents = (events: any[], baseIndex: number = 0, projectId?: string): ChatMessage[] => {
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
          projectId || event.project_id
        );
        historyMessages.push(userMessage);
      }
      
      // AI消息
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
        const errorText = agentMessage.error || 'Unknown error';
        const errorSubtype = agentMessage.subtype;
        
        // 检测是否为点数不足错误
        const isInsufficientCredits = errorSubtype === 'insufficient_credits' || 
                                      errorText.toLowerCase().includes('insufficient credits');
        
        if (isInsufficientCredits) {
          // 显示友好的升级提示
          historyMessages.push({
            id: eventMsgId, // 使用 event.msg_id
            type: 'model_system_init',
            role: 'assistant',
            content: `💎 Upgrade to continue\n\nYou've used up your available credits. Upgrade your subscription to keep creating amazing apps!`,
            timestamp: new Date(event.timestamp).getTime(),
            metadata: {
              isUpgradeHint: true, // 标记这是一个升级提示消息
              requiredCredits: agentMessage.credits_required_usd,
            },
          });
        } else {
          // 其他错误正常显示
          historyMessages.push({
            id: eventMsgId, // 使用 event.msg_id
            type: 'model_system_init',
            role: 'assistant',
            content: `❌ Error: ${errorText}`,
            timestamp: new Date(event.timestamp).getTime(),
          });
        }
      }

      // System消息 - Clear（系统清除消息）
      if (agentMessage.type === 'system' && agentMessage.subtype === 'clear') {
        const clearMessageText = agentMessage.message || 'Conversation history has been cleared';
        historyMessages.push({
          id: eventMsgId, // 使用 event.msg_id
          type: 'model_system_init',
          role: 'assistant',
          content: clearMessageText,
          timestamp: new Date(event.timestamp).getTime(),
        });
      }
      
      // System消息 - Init（系统初始化消息）- 跳过，不在历史记录中显示
      if (agentMessage.type === 'system' && agentMessage.subtype === 'init') {
        // 静默跳过，不添加到历史消息中
        return;
      }

      // Status消息 - 跳过，不在历史记录中显示
      // status 消息（如 thinking）只是实时状态指示，历史记录中不需要显示
      if (agentMessage.type === 'status') {
        // 静默跳过，不添加到历史消息中
        return;
      }

      // Action消息（动作消息，需要用户操作）
      if (agentMessage.type === 'action') {
        const actionSubtype = agentMessage.subtype || '';
        
        // 🔍 打印 Stripe action 消息的详细信息
        if (actionSubtype === 'stripe') {
          console.log('🔍 [OverlayAIChat] Found Stripe action message in history:', {
            eventMsgId,
            actionSubtype,
            agentMessage: JSON.stringify(agentMessage, null, 2),
            timestamp: event.timestamp,
            hasMetadata: !!agentMessage.metadata,
            metadata: agentMessage.metadata,
            isSubmitted: (agentMessage as any).is_submitted,
            isSubmittedType: typeof (agentMessage as any).is_submitted,
          });
        }
        
        // 将服务端返回的 is_submitted 状态传递到 metadata 中
        const isSubmitted = (agentMessage as any).is_submitted;
        // 从 event._id 获取 actionId，添加到 metadata 中
        const actionId = event._id;
        
        historyMessages.push({
          id: eventMsgId, // 使用 event.msg_id
          type: 'action',
          role: 'assistant',
          content: '',
          timestamp: new Date(event.timestamp).getTime(),
          metadata: {
            subtype: actionSubtype,
            actionId: actionId, // 将 event._id 添加到 metadata 中
            // 如果服务端返回了已保存的状态，保留在 metadata 中
            ...(agentMessage.metadata || {}),
            // 将 is_submitted 传递到 metadata 中，供组件使用
            isSubmitted: isSubmitted === true || isSubmitted === 'true',
          },
        });
        return;
      }

      // 未知类型 - 显示调试信息
      const knownTypes = ['user', 'assistant', 'result', 'error', 'system', 'status', 'action'];
      if (!knownTypes.includes(agentMessage.type)) {
        console.warn('⚠️ [OverlayAIChat] Unknown history message type:', agentMessage.type);
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
  };

  // 加载历史聊天记录
  const loadHistoryMessages = async (isInitial: boolean = false) => {
    if (!projectId) {
      console.log('⚠️ [OverlayAIChat] No projectId, skipping history load', { isInitial });
      if (isInitial) {
        setIsInitialLoadComplete(true);
      }
      return;
    }

    try {
      const offset = isInitial ? 0 : historyOffset;
      console.log('📜 [OverlayAIChat] Loading history messages', {
        isInitial,
        projectId,
        offset,
        hasMoreHistory,
        currentMessageCount: messages.length,
      });
      
      const response = await httpClient.getHistoryMessages(projectId, 20, offset);
      
      if (response.code === 0 && response.data) {
        const responseData = response.data as any;
        const events = responseData.events || [];
        console.log(`✅ [OverlayAIChat] Received ${events.length} history events`, {
          offset,
          returnedCount: events.length,
          dataKeys: typeof responseData === 'object' && responseData
            ? Object.keys(responseData)
            : 'non-object response.data',
        });
        
        if (events.length === 0) {
          const preview = (() => {
            try {
              return JSON.stringify(responseData, null, 2).slice(0, 2000);
            } catch {
              return String(responseData);
            }
          })();
          console.log('🧾 [OverlayAIChat] Raw history response preview:', preview);
          setHasMoreHistory(false);
          console.log('ℹ️ [OverlayAIChat] No more history messages');
          return;
        }
        
        // 打印所有历史消息的原始数据（服务器返回的是从新到旧）
        if (events.length > 0 && isInitial) {
          console.log('\n🔍🔍🔍 [OverlayAIChat] 所有历史消息原始数据（共 ' + events.length + ' 条）：');
          events.forEach((event: any, index: number) => {
            console.log(`\n=== Event #${index} (倒数第${index + 1}条) ===`);
            console.log(JSON.stringify(event, null, 2));
          });
          console.log('🔍🔍🔍\n');
        }
        
        const historyMessages = parseHistoryEvents(events, offset, projectId);
        console.log(`✅ [OverlayAIChat] Parsed ${historyMessages.length} history messages`);
        
        // inverted 模式下，数据需要是时间正序：[最早消息, ..., 最新消息]
        // 根据测试，初始化数据正确（不需要 reverse），说明服务器返回的是从旧到新
        // 所以直接使用 historyMessages，不需要 reverse
        const orderedMessages = historyMessages;
        console.log(`🔄 [OverlayAIChat] Using history messages as-is (server returns time-ascending order)`);
        
        if (isInitial) {
          // 初始加载，替换所有消息
          setMessages(orderedMessages);
          setHistoryOffset(events.length);
          console.log('📥 [OverlayAIChat] Initial history set', {
            newMessageCount: orderedMessages.length,
            nextOffset: events.length,
          });
        } else {
          // 加载更早的消息，添加到数组开头
          // orderedMessages 已经是时间正序（从旧到新），直接拼接在前面
          setMessages(prev => [...prev,...orderedMessages]);
          setHistoryOffset(prev => prev + events.length);
        }
        
        // 如果返回的消息少于请求的数量，说明没有更多了
        if (events.length < 20) {
          setHasMoreHistory(false);
          console.log('ℹ️ [OverlayAIChat] Returned less than page size, marking no more history');
        }
      } else {
        console.log('⚠️ [OverlayAIChat] Failed to load history', {
          code: response.code,
          info: response.info,
          dataPresent: !!response.data,
        });
        if (!isInitial) {
          setHasMoreHistory(false);
        }
      }
    } catch (error) {
      console.error('❌ [OverlayAIChat] Failed to load history messages:', error);
      if (!isInitial) {
        setHasMoreHistory(false);
      }
    } finally {
      // 初始加载完成后，标记加载状态
      if (isInitial) {
        setIsInitialLoadComplete(true);
        console.log('✅ [OverlayAIChat] Initial history load complete');
      }
    }
  };

  // 下拉刷新加载更多历史
  const handleRefreshHistory = async () => {
    if (isLoadingHistory || !hasMoreHistory) {
      console.log('⚠️ [OverlayAIChat] Already loading or no more history', {
        isLoadingHistory,
        hasMoreHistory,
        projectId,
      });
      return;
    }
    if (!projectId) {
      console.log('⚠️ [OverlayAIChat] Cannot refresh history without projectId');
      return;
    }

    setIsLoadingHistory(true);
    await loadHistoryMessages(false);
    setIsLoadingHistory(false);
  };

  // WebSocket connection
  useEffect(() => {
    if (!isVisible || !projectId || !user?.user_id) {
      return;
    }

    const connectWebSocket = async () => {
      try {
        // 如果已经连接，不需要重新连接
        if (websocketClient.isConnected) {
          console.log('✅ [OverlayAIChat] WebSocket already connected');
          return;
        }

        console.log('🔌 [OverlayAIChat] Connecting WebSocket...');
        console.log('🔌 [OverlayAIChat] Project ID:', projectId);
        console.log('🔌 [OverlayAIChat] User ID:', user.user_id);

        // 获取 WebSocket 连接路径
        const wsResponse = await httpClient.getWebSocketConnection(projectId);
        if (wsResponse.code !== 0 || !wsResponse.data?.path) {
          throw new Error(wsResponse.info || 'Failed to get WebSocket path');
        }

        const wsKey = wsResponse.data.path;
        console.log('✅ [OverlayAIChat] Got WebSocket key:', wsKey);

        // 连接 WebSocket
        await websocketClient.connect(projectId, user.user_id, wsKey);
        console.log('✅ [OverlayAIChat] WebSocket connected successfully');
      } catch (error) {
        console.error('❌ [OverlayAIChat] Failed to connect WebSocket:', error);
        setError(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    connectWebSocket();

    // 清理：断开 WebSocket 连接
    return () => {
      console.log('🔌 [OverlayAIChat] Disconnecting WebSocket');
      websocketClient.disconnect();
    };
  }, [isVisible, projectId, user?.user_id]);

  // WebSocket message listener
  useEffect(() => {
    if (!isVisible) return;

    console.log('📨📨📨 [OverlayAIChat] SETTING UP MESSAGE LISTENER 📨📨📨');
    
    // 用于跟踪是否已收到第一条消息
    let hasReceivedFirstMessage = false;
    
    const unsubscribe = websocketClient.onMessage((message: WebSocketMessage) => {
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║  🎉 CALLBACK TRIGGERED (OverlayAIChat)║');
      console.log('╚════════════════════════════════════════╝');
      console.log('🎉 [OverlayAIChat] Message type:', message.type);
      console.log('🎉 [OverlayAIChat] Message data:', message);
      
      // 处理沙盒状态消息 (type: 300)
      if (message.type === WebSocketMessageType.SANDBOX_STATUS) {
        console.log('🏗️ [OverlayAIChat] Processing SANDBOX_STATUS message');
        const sandboxMessage = message as any;
        const sandboxData = sandboxMessage.data;
        
        // 检查沙盒状态
        const sandboxStatus = String(sandboxData.status || '').toLowerCase();
        console.log('🏗️ [OverlayAIChat] Sandbox status:', sandboxStatus, 'raw data:', sandboxData);

        // 如果本轮已经被用户取消，则忽略所有沙盒状态更新（包括成功/失败），也不再追加 "Refreshing mini app" 类消息
        if (isRunCancelledRef.current) {
          console.log('⏹️ [OverlayAIChat] Run was cancelled, ignoring SANDBOX_STATUS message');
          console.log('========================================\n');
          return;
        }

        // 过滤掉 "SETTING UP SANDBOX" 状态的消息，不显示给用户
        const isSettingUpStatus = sandboxStatus === 'creating' || 
                                 sandboxStatus.includes('loading') || 
                                 sandboxStatus.includes('starting') || 
                                 sandboxStatus.includes('building');

        if (sandboxStatus === 'success' || sandboxStatus.includes('active') || sandboxStatus.includes('running')) {
          console.log('✅ [OverlayAIChat] Sandbox is ready');
          // 只有在本轮编码已完成时，才在沙盒成功后重置状态
          setIsCodingComplete(prev => {
            if (prev) {
              console.log('✅ [OverlayAIChat] Coding & sandbox both done, reset run state');
              resetChatRunState();
              return false; // 回到初始状态
            } else {
              // 仅标记沙盒可用，保留编码进行中的状态
              setIsSandboxReady(true);
              return prev;
            }
          });
        } else if (sandboxStatus === 'failed' || sandboxStatus === 'error' || sandboxStatus === 'killed') {
          // 沙盒启动失败/被杀死时，重置所有运行状态，避免下次对话残留在 "Refreshing" 等错误状态
          console.log('❌ [OverlayAIChat] Sandbox failed or was terminated, resetting states');
          resetChatRunState();
        }
        
        // 跳过 "SETTING UP SANDBOX" 状态的消息，不添加到消息列表
        if (isSettingUpStatus) {
          console.log('ℹ️ [OverlayAIChat] 跳过 "SETTING UP SANDBOX" 状态消息，不显示给用户');
          console.log('========================================\n');
          return;
        }
        
        // 使用统一的解析器
        const sandboxChatMessage = parseSandboxStatusMessage(
          sandboxData,
          message.msg_id,
          message.timestamp
        );
        
        setMessages(prev => {
          if (prev.some(m => m.id === sandboxChatMessage.id)) {
            console.log('⚠️ [OverlayAIChat] Sandbox message already exists, skipping');
            return prev;
          }
          console.log('➕ [OverlayAIChat] Added sandbox status message');
          return [sandboxChatMessage, ...prev];
        });
        
        console.log('========================================\n');
        return;
      }
      
      // 根据文档：type = '200' 是模型回复消息
      if (message.type === WebSocketMessageType.MODEL_RESPONSE) {
        console.log('🤖 [OverlayAIChat] Processing MODEL_RESPONSE (type:', message.type, ')');
        const modelResponse = message as ModelResponseMessage;
        
        // 服务器返回的数据结构：data.agent_message
        const agentMessage = (modelResponse.data as any).agent_message;
        console.log('🤖 [OverlayAIChat] agent_message.type:', agentMessage?.type);
        
        if (!agentMessage) {
          console.log('ℹ️ [OverlayAIChat] No agent_message, skipping');
          console.log('========================================\n');
          return;
        }
        
        // 1. User Message（服务器echo的用户消息）
        if (agentMessage.type === 'user') {
          console.log('👤 [OverlayAIChat] Processing user message from server');
          
          const serverUserMessage = parseUserMessage(
            agentMessage, 
            message.msg_id, 
            message.timestamp,
            projectId
          );
          
          // 添加到消息列表（带去重）
          setMessages(prev => {
            // 检查是否已存在（基于内容和时间戳的模糊匹配）
            const exists = prev.some(m => 
              m.type === 'user' && 
              m.content === serverUserMessage.content &&
              Math.abs(m.timestamp - serverUserMessage.timestamp) < 5000 // 5秒内的相同消息视为重复
            );
            
            if (exists) {
              console.log('⚠️ [OverlayAIChat] User message already exists (local), skipping server message');
              return prev;
            }
            
            console.log('✅ [OverlayAIChat] Added user message from server');
            return [serverUserMessage, ...prev];
          });
          
          console.log('========================================\n');
          return;
        }
        
        // 2. System Message - Init（系统初始化消息）
        if (agentMessage.type === 'system' && agentMessage.subtype === 'init') {
          console.log('⚙️ [OverlayAIChat] System init message - skipping');
          console.log('========================================\n');
          return;
        }
        
        // 2.5. System Message - Clear（系统清除消息）
        if (agentMessage.type === 'system' && agentMessage.subtype === 'clear') {
          console.log('🗑️ [OverlayAIChat] System clear message received');
          const clearMessageText = agentMessage.message || 'Conversation history has been cleared';
          
          const clearMessage: ChatMessage = {
            id: message.msg_id, // 统一使用 message.msg_id
            type: 'model_system_init',
            role: 'assistant',
            content: clearMessageText,
            timestamp: new Date(message.timestamp).getTime(),
          };
          
          setMessages(prev => {
            // 检查是否已存在（去重）
            const exists = prev.some(m => m.id === clearMessage.id);
            if (exists) {
              console.log('⚠️ [OverlayAIChat] Clear message already exists, skipping');
              return prev;
            }
            console.log('✅ [OverlayAIChat] Added system clear message');
            return [clearMessage, ...prev];
          });
          
          console.log('========================================\n');
          return;
        }
        
        // 3. Assistant Message（助手消息）
        if (agentMessage.type === 'assistant' && agentMessage.message) {
          const contentArray = agentMessage.message.content || [];
          console.log('📋 [OverlayAIChat] Processing', contentArray.length, 'content items');
          console.log('📋 [OverlayAIChat] Using msg_id:', message.msg_id);
          
          // 标记本批次 assistant 内容里是否有「终止」提示
          let hasInterruptFlag = false;
          
          // 遍历content数组，处理不同类型的内容
          contentArray.forEach((item: any, index: number) => {
            console.log(`\n--- Processing content item #${index} ---`);
            console.log('Item type:', item.type);
            console.log('Full item:', item);
            
            // 直接使用 message.msg_id，禁止拼接任何参数
            let content = '';
            let messageType: ChatMessage['type'] = 'model_assistant_text';
            
            if (item.type === 'text') {
              // 3.1 文本回复
              // 确保 content 是字符串类型
              const textValue = item.text;
              content = typeof textValue === 'string' ? textValue : (textValue ? String(textValue) : '');
              messageType = 'model_assistant_text';
              console.log(`🤖 [OverlayAIChat] Text content #${index}:`, content ? content.substring(0, 100) : '(empty)');
              
              // 检查是否是「中断」类提示，例如 "[Request interrupted by user]"
              const lower = content.toLowerCase();
              if (lower.includes('request interrupted by user')) {
                hasInterruptFlag = true;
                console.log('⏹️ [OverlayAIChat] Detected interrupt text in assistant message');
              }
            } else if (item.type === 'tool_use') {
              // 3.2 工具使用
              console.log('🔧 Tool use item details:', {
                hasName: 'name' in item,
                name: item.name,
                hasInput: 'input' in item,
                id: item.id,
              });
              
              const toolName = item.name || 'Unknown Tool';
              const toolInput = JSON.stringify(item.input || {}, null, 2);
              content = `Input:\n${toolInput}`;
              messageType = 'model_assistant_tool_use';
              console.log(`🔧 [OverlayAIChat] Tool use #${index}: ${toolName}, using server ID: ${item.id}`);
            } else if (item.type === 'tool_result') {
              // 3.3 工具结果
              console.log('✅ Tool result item details:', {
                hasContent: 'content' in item,
                contentType: typeof item.content,
                tool_use_id: item.tool_use_id,
              });
              
              // 确保 content 是字符串类型
              const contentValue = item.content;
              content = typeof contentValue === 'string' ? contentValue : (contentValue ? String(contentValue) : '');
              messageType = 'model_assistant_tool_result';
              console.log(`✅ [OverlayAIChat] Tool result #${index}:`, content ? content.substring(0, 100) : '(empty)');
            } else {
              console.warn(`⚠️ Unknown content item type: ${item.type}`);
            }
            
            if (content || item.type === 'tool_use') {
              const newMessage: ChatMessage = {
                id: message.msg_id, // 直接使用 message.msg_id，不拼接
                type: messageType,
                role: 'assistant',
                content: content,
                timestamp: new Date(message.timestamp).getTime(),
                // 添加metadata
                metadata: item.type === 'tool_use' ? {
                  toolName: item.name || 'Unknown Tool',
                  toolId: item.id,
                } : item.type === 'tool_result' ? {
                  toolId: item.tool_use_id,
                } : undefined,
              };
              
              // 检查消息是否已存在（去重）
              setMessages(prev => {
                const exists = prev.some(m => m.id === newMessage.id);
                if (exists) {
                  console.log(`⚠️ [OverlayAIChat] Message ${newMessage.id} already exists, skipping`);
                  return prev;
                }
                console.log(`➕ [OverlayAIChat] Added message #${index}, id: ${newMessage.id}, type: ${messageType}, metadata:`, newMessage.metadata);
                return [newMessage, ...prev];
              });
            }
          });
          
          if (hasInterruptFlag) {
            // 如果 assistant 文本里包含终止提示，视为本轮被中断
            // 标记本轮已取消，并恢复初始状态，后续的 result / sandbox 消息会被忽略
            console.log('⏹️ [OverlayAIChat] Assistant interrupt message batch, cancelling current run');
            isRunCancelledRef.current = true;
            setIsTyping(false);
            setIsSending(false);
            setIsCodingComplete(false);
            setIsSandboxReady(false);
          } else {
            // 收到第一条assistant消息，停止isSending（消息已成功发送）
            // 但保持isTyping=true（AI还在工作，直到收到result消息）
            if (!hasReceivedFirstMessage) {
              hasReceivedFirstMessage = true;
              setIsSending(false);
              console.log('✅ [OverlayAIChat] First message received, isSending=false (but still typing)');
            }
          }
          
          console.log('✅ [OverlayAIChat] All assistant messages processed');
          console.log('========================================\n');
          return;
        }
        
        // 3.5. Action Message（动作消息，需要用户操作）
        if (agentMessage.type === 'action') {
          const actionSubtype = agentMessage.subtype || '';
          // 从 data._id 获取 actionId，添加到 metadata 中
          const actionId = (modelResponse.data as any)._id;
          console.log('🎬 [OverlayAIChat] Action message received, subtype:', actionSubtype, 'msg_id:', message.msg_id, 'actionId:', actionId);
          
          const actionMessage: ChatMessage = {
            id: message.msg_id, // 统一使用 message.msg_id
            type: 'action',
            role: 'assistant',
            content: '', // action 消息通常不需要 content
            timestamp: new Date(message.timestamp).getTime(),
            metadata: {
              subtype: actionSubtype,
              actionId: actionId, // 将 data._id 添加到 metadata 中
            },
          };
          
          setMessages(prev => {
            // 检查是否已存在（去重）
            const exists = prev.some(m => m.id === actionMessage.id);
            if (exists) {
              console.log('⚠️ [OverlayAIChat] Action message already exists, skipping');
              return prev;
            }
            console.log('✅ [OverlayAIChat] Added action message, subtype:', actionSubtype);
            return [actionMessage, ...prev];
          });
          
          // Action 消息会暂停 Agent 执行，等待用户操作
          setIsTyping(false);
          setIsSending(false);
          
          console.log('========================================\n');
          return;
        }
        
        // 4. Result Message（最终结果）
        if (agentMessage.type === 'result') {
          const content = agentMessage.result || '';
          const resultSubtype = agentMessage.subtype;
          console.log('🎯 [OverlayAIChat] Final result:', content.substring(0, 100));
          console.log('🎯 [OverlayAIChat] Result subtype:', resultSubtype);
          
          const newMessage: ChatMessage = {
            id: message.msg_id,
            type: 'model_result',
            role: 'assistant',
            content: content,
            timestamp: new Date(message.timestamp).getTime(),
            metadata: {
              tokens: agentMessage.usage?.output_tokens,
              model: agentMessage.modelUsage ? Object.keys(agentMessage.modelUsage)[0] : undefined,
            }
          };
          
          // 检查消息是否已存在（去重）
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMessage.id);
            if (exists) {
              console.log(`⚠️ [OverlayAIChat] Result message ${newMessage.id} already exists, skipping`);
              return prev;
            }
            console.log('✅ [OverlayAIChat] Result message added');
            return [newMessage, ...prev];
          });
          
          // 检查是否是「终止」类型的结果，比如用户中断
          const contentLower = content.toLowerCase();
          const isInterruptedResult =
            resultSubtype === 'user_interrupted' ||
            resultSubtype === 'user_cancelled' ||
            contentLower.includes('request interrupted by user');

          // 特殊处理：达到最大轮次限制
          if (resultSubtype === 'error_max_turns') {
            console.log('⚠️ [OverlayAIChat] Reached max turns limit');
            
            // 添加特殊的"继续"提示消息
            const continueMessage: ChatMessage = {
              id: `continue_hint_${message.msg_id}`,
              type: 'model_system_init',
              role: 'assistant',
              content: '🔄 Maximum conversation turns reached\n\nThe AI needs your permission to continue working on this task. Would you like to continue?',
              timestamp: new Date(message.timestamp).getTime(),
              metadata: {
                isContinueHint: true, // 标记这是一个继续提示消息
                needsContinue: true,
              },
            };
            
            setMessages(prev => {
              const exists = prev.some(m => m.id === continueMessage.id);
              if (!exists) {
                console.log('🔄 [OverlayAIChat] Added continue hint message');
                return [continueMessage, ...prev];
              }
              return prev;
            });
          }
          
          if (isInterruptedResult) {
            // 中断类结果：标记本轮已取消，并立即把按钮和运行状态恢复成初始状态
            console.log('⏹️ [OverlayAIChat] Result indicates interruption, cancelling current run');
            isRunCancelledRef.current = true;
            setIsTyping(false);
            setIsSending(false);
            setIsCodingComplete(false);
            setIsSandboxReady(false);
          } else if (!isRunCancelledRef.current) {
            // 正常 Result 消息表示编码完成
            // 代码完成后，显示 "Refreshing mini app"，等待沙盒完成
            setIsCodingComplete(true);
            setIsTyping(true); // 显示 "Refreshing mini app"
            setIsSending(false);
            setIsSandboxReady(false); // 重置沙盒状态，等待新的沙盒成功消息
            console.log('🎉🎉🎉 [OverlayAIChat] CODING COMPLETE - Waiting for sandbox... 🎉🎉🎉');
          }
          console.log('========================================\n');
          return;
        }
        
        // 5. Error Message（错误消息）
        if (agentMessage.type === 'error') {
          const errorText = agentMessage.error || 'Unknown error';
          const errorSubtype = agentMessage.subtype;
          console.log('❌ [OverlayAIChat] Error message:', errorText);
          console.log('❌ [OverlayAIChat] Error subtype:', errorSubtype);
          
          // 特殊处理：点数不足错误（检测 subtype 或错误文本）
          const isInsufficientCredits = errorSubtype === 'insufficient_credits' || 
                                        errorText.toLowerCase().includes('insufficient credits');
          
          if (isInsufficientCredits) {
            console.log('💰 [OverlayAIChat] Insufficient credits detected');
            
            // 添加友好的订阅提示消息（而不是错误消息）
            const upgradeMessage: ChatMessage = {
              id: `upgrade_hint_${message.msg_id}`,
              type: 'model_system_init',
              role: 'assistant',
              content: `💎 Upgrade to continue\n\nYou've used up your available credits. Upgrade your subscription to keep creating amazing apps!`,
              timestamp: new Date(message.timestamp).getTime(),
              metadata: {
                isUpgradeHint: true, // 标记这是一个升级提示消息
                requiredCredits: agentMessage.credits_required_usd,
              },
            };
            
            setMessages(prev => {
              const exists = prev.some(m => m.id === upgradeMessage.id);
              if (!exists) {
                console.log('💰 Added friendly upgrade hint message');
                return [upgradeMessage, ...prev];
              }
              return prev;
            });
            
            // Show alert and guide user to upgrade
            Alert.alert(
              'Insufficient Credits',
              `You don't have enough credits to continue. Approximately $${agentMessage.credits_required_usd?.toFixed(4) || '0.02'} is required.\n\nWould you like to upgrade your subscription?`,
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => {
                    console.log('💰 User cancelled subscription upgrade');
                  }
                },
                {
                  text: 'Upgrade',
                  onPress: () => {
                    console.log('💰 User chose to upgrade subscription');
                    // 直接显示订阅 Modal（嵌套在当前 Modal 内）
                    setShowSubscriptionModal(true);
                  }
                }
              ]
            );
            
            // 停止 loading 状态
            setIsTyping(false);
            setIsSending(false);
            
            // 已添加友好提示消息，直接返回
            return;
          }
          
          // 其他错误消息正常显示
          const errorMessage: ChatMessage = {
            id: `error_${message.msg_id}`,
            type: 'model_system_init',
            role: 'assistant',
            content: `❌ Error: ${errorText}`,
            timestamp: new Date(message.timestamp).getTime(),
          };

          setMessages(prev => {
            const exists = prev.some(m => m.id === errorMessage.id);
            if (exists) {
              console.log(`⚠️ [OverlayAIChat] Error message ${errorMessage.id} already exists, skipping`);
              return prev;
            }
            console.log('✅ [OverlayAIChat] Error message added');
            return [errorMessage, ...prev];
          });

          setIsTyping(false);
          setIsSending(false);
          console.log('✅ [OverlayAIChat] Error message processing complete');
          console.log('========================================\n');
          return;
        }
        
        // 6. Status Message（状态消息）- 如 thinking
        if (agentMessage.type === 'status') {
          console.log('💭 [OverlayAIChat] Status message:', agentMessage.subtype);
          
          // thinking 状态：显示 AI 正在思考
          if (agentMessage.subtype === 'thinking') {
            console.log('🤔 [OverlayAIChat] AI is thinking...');
            setIsTyping(true);
            setIsSending(false); // 消息已发送成功，只是 AI 在思考
          }
          
          // status 消息不需要在 UI 中显示，只用于控制状态
          console.log('========================================\n');
          return;
        }
        
        // 未知类型 - 显示一个调试消息，不影响其他消息渲染
        console.warn('⚠️ [OverlayAIChat] Unknown agent_message type:', agentMessage.type);
        console.log('Full agentMessage:', JSON.stringify(agentMessage, null, 2));
        
        const unknownMessage: ChatMessage = {
          id: `unknown_${message.msg_id}`,
          type: 'model_system_init',
          role: 'assistant',
          content: `⚠️ 收到未知类型的消息 (type: ${agentMessage.type})`,
          timestamp: new Date(message.timestamp).getTime(),
        };

        setMessages(prev => {
          const exists = prev.some(m => m.id === unknownMessage.id);
          if (exists) {
            console.log(`⚠️ [OverlayAIChat] Unknown message ${unknownMessage.id} already exists, skipping`);
            return prev;
          }
          console.log('⚠️ [OverlayAIChat] Unknown message type added to UI');
          return [unknownMessage, ...prev];
        });

        setIsTyping(false);
        setIsSending(false);
        console.log('========================================\n');
      } else {
        console.log('ℹ️ [OverlayAIChat] Ignoring message type:', message.type);
        console.log('========================================\n');
      }
    });

    console.log('✅ [OverlayAIChat] Message listener registered');
    
    return () => {
      console.log('🔌 [OverlayAIChat] Cleaning up WebSocket listener');
      unsubscribe();
    };
  }, [isVisible, projectId]);

  // Keyboard listener
  useEffect(() => {
    // iOS 使用 keyboardWillShow/keyboardWillHide 以获得更快的响应
    // Android 使用 keyboardDidShow/keyboardDidHide
    const keyboardEventName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardHideEventName = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const keyboardShowListener = Keyboard.addListener(keyboardEventName, (event) => {
      setIsKeyboardVisible(true);
      const keyboardHeight = event.endCoordinates?.height-15 || 0;
      // 在键盘弹起时增加 ChatContent 的底部 padding，避免内容被键盘和输入区域遮挡
      setChatContentPaddingBottom(keyboardHeight + BASE_CHAT_PADDING_BOTTOM);

      // 输入框立即跟随键盘移动（使用键盘的动画时长）
      const animationDuration = Platform.OS === 'ios' 
        ? (event.duration || 250) 
        : 250;
      
      inputAreaTranslateY.value = withTiming(-keyboardHeight, {
        duration: animationDuration,
        easing: Easing.out(Easing.ease),
      });
      
      // 下拉按钮位置由 handleInputAreaLayout 自动更新，不需要手动移动
      
      // 动画：chatContainer 变为全屏
      chatContainerBorderRadius.value = withTiming(0, {
        duration: animationDuration,
        easing: Easing.out(Easing.ease),
      });
      chatContainerMarginTop.value = withTiming(0, {
        duration: animationDuration,
        easing: Easing.out(Easing.ease),
      });
      chatContainerMaxHeight.value = withTiming(height, {
        duration: animationDuration,
        easing: Easing.out(Easing.ease),
      });
      chatContainerMinHeight.value = withTiming(height, {
        duration: animationDuration,
        easing: Easing.out(Easing.ease),
      });
      // 动画：TopButtons 淡出并向上移动
      topButtonsOpacity.value = withTiming(0, {
        duration: animationDuration,
        easing: Easing.out(Easing.ease),
      });
      topButtonsTranslateY.value = withTiming(-20, {
        duration: animationDuration,
        easing: Easing.out(Easing.ease),
      });
    });
    
    const keyboardHideListener = Keyboard.addListener(keyboardHideEventName, (event) => {
      setIsKeyboardVisible(false);
      
      const animationDuration = Platform.OS === 'ios' 
        ? (event.duration || 250) 
        : 250;
      
      // 输入框立即跟随键盘收起
      inputAreaTranslateY.value = withTiming(0, {
        duration: animationDuration,
        easing: Easing.out(Easing.ease),
      });
      
      // 键盘收起时恢复 ChatContent 的底部 padding（保持与输入区域同高）
      setChatContentPaddingBottom(BASE_CHAT_PADDING_BOTTOM);
      
      // 动画：chatContainer 恢复原样
      chatContainerBorderRadius.value = withTiming(24, {
        duration: animationDuration,
        easing: Easing.out(Easing.ease),
      });
      chatContainerMarginTop.value = withTiming(20, {
        duration: animationDuration,
        easing: Easing.out(Easing.ease),
      });
      chatContainerMaxHeight.value = withTiming(height * 0.9, {
        duration: animationDuration,
        easing: Easing.out(Easing.ease),
      });
      chatContainerMinHeight.value = withTiming(height * 0.85, {
        duration: animationDuration,
        easing: Easing.out(Easing.ease),
      });
      // 动画：TopButtons 淡入并恢复位置
      topButtonsOpacity.value = withTiming(1, {
        duration: animationDuration,
        easing: Easing.out(Easing.ease),
      });
      topButtonsTranslateY.value = withTiming(0, {
        duration: animationDuration,
        easing: Easing.out(Easing.ease),
      });
    });

    return () => {
      keyboardShowListener?.remove();
      keyboardHideListener?.remove();
    };
  }, []);

  // chatContainer 的动画样式
  const chatContainerAnimatedStyle = useAnimatedStyle(() => ({
    borderTopLeftRadius: chatContainerBorderRadius.value,
    borderTopRightRadius: chatContainerBorderRadius.value,
    marginTop: chatContainerMarginTop.value,
    maxHeight: chatContainerMaxHeight.value,
    minHeight: chatContainerMinHeight.value,
  }));

  // TopButtons 的动画样式
  const topButtonsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: topButtonsOpacity.value,
    transform: [{ translateY: topButtonsTranslateY.value }],
  }));

  // InputArea 的动画样式，用于与键盘同步移动
  const inputAreaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: inputAreaTranslateY.value }],
  }));

  // Click chat area to dismiss keyboard
  const handleChatAreaPress = () => {
    // 点击空白区域收起键盘
    Keyboard.dismiss();
  };

  // 监听应用状态变化，处理键盘问题
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // 应用进入后台或变为非活跃状态时，强制关闭键盘
        Keyboard.dismiss();
      } else if (nextAppState === 'active') {
        // 应用重新激活时，确保键盘已关闭
        // 延迟一下确保状态已更新
        setTimeout(() => {
          Keyboard.dismiss();
        }, 100);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const sendMessage = async (content: string) => {
    console.log('╔════════════════════════════════════════╗');
    console.log('║  🚀 SEND MESSAGE (OverlayAIChat)     ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('🚀 [OverlayAIChat] Message content:', content.substring(0, 100));
    console.log('🚀 [OverlayAIChat] WebSocket connected?', websocketClient.isConnected);
    
    if (!websocketClient.isConnected) {
      console.error('❌ [OverlayAIChat] WebSocket is NOT connected');
      setError('WebSocket not connected');
      setIsSending(false);
      setIsTyping(false);
      return;
    }

    console.log('📋 [OverlayAIChat] User info:', { 
      hasUser: !!user, 
      userId: user?.user_id 
    });
    
    if (!projectId) {
      const errorMsg = 'Project information lost. Please reopen the project.';
      setError(errorMsg);
      console.error('❌❌❌ [OverlayAIChat] MISSING PROJECT INFO ❌❌❌');
      console.error('❌ [OverlayAIChat] This usually happens when:');
      console.error('  1. Context expired (>10 minutes)');
      console.error('  2. App was backgrounded');
      console.error('  3. Context was cleared');
      setIsSending(false);
      setIsTyping(false);
      return;
    }
    
    if (!user?.user_id) {
      const errorMsg = 'User information lost. Please login again.';
      setError(errorMsg);
      console.error('❌❌❌ [OverlayAIChat] MISSING USER INFO ❌❌❌');
      console.error('❌ [OverlayAIChat] User:', user);
      setIsSending(false);
      setIsTyping(false);
      return;
    }

    try {
      // 状态已在 handleSendMessage 中设置，这里只需要确保 error 被清除
      setError(null);

      // 上传图片到OSS（通过后端代理）
      // 必须等待所有图片上传完成后才能发送消息
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        console.log(`📤 [OverlayAIChat] Uploading ${selectedImages.length} images...`);
        
        try {
          imageUrls = await httpClient.uploadMultipleImages(projectId, selectedImages);
          
          // 验证上传是否成功
          if (!imageUrls || imageUrls.length === 0) {
            console.error('❌ [OverlayAIChat] Upload failed: no URLs returned');
            Alert.alert('上传失败', '图片上传未返回有效URL，请重试');
            setIsSending(false);
            setIsTyping(false);
            return;
          }
          
          console.log(`✅ [OverlayAIChat] ${imageUrls.length} images uploaded successfully`);
        } catch (uploadError) {
          console.error('❌ [OverlayAIChat] Upload failed:', uploadError);
          Alert.alert('上传失败', `图片上传失败：${uploadError instanceof Error ? uploadError.message : '未知错误'}，请重试`);
          setIsSending(false);
          setIsTyping(false);
          return;
        }
      }

      // 构建content数组（与服务端格式一致）
      const contentArray: any[] = [
        { type: 'text', text: content }
      ];
      
      if (imageUrls.length > 0) {
        contentArray.push({
          type: 'image',
          image: imageUrls
        });
      }

      // Add user message
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        type: 'user',
        role: 'user',
        content,
        timestamp: Date.now(),
        metadata: imageUrls.length > 0 ? { 
          projectId: projectId, // 项目ID，用于ServerImage组件拼接URL
          images: imageUrls, // 服务器返回的图片路径（相对路径）
          localImages: selectedImages, // 本地base64数据，用于即时显示
          contentArray: contentArray // 保存完整的content数组
        } : undefined,
      };
      
      console.log('➕ [OverlayAIChat] Adding user message to UI');
      setMessages(prev => {
        const updated = [userMessage, ...prev];
        console.log('📝 [OverlayAIChat] Messages count:', updated.length);
        return updated;
      });

      // Send via WebSocket
      console.log('📡 [OverlayAIChat] Calling websocketClient.sendUserPrompt...');
      console.log('📡 [OverlayAIChat] Parameters:', {
        projectId,
        userId: user.user_id,
        contentLength: content.length,
        imagesCount: imageUrls.length,
      });
      console.log('📡 [OverlayAIChat] Image URLs (OSS URLs, not base64):');
      imageUrls.forEach((url, i) => {
        console.log(`  ${i + 1}. ${url}`);
        console.log(`     Type: ${url.startsWith('data:') ? '❌ BASE64 (ERROR!)' : '✅ OSS URL'}`);
      });
      
      websocketClient.sendUserPrompt(content, projectId, user.user_id, imageUrls, selectedModel);
      
      // 清空选中的图片
      setSelectedImages([]);
      await clearImagesFromStorage();
      
      console.log('✅ [OverlayAIChat] SEND MESSAGE COMPLETED');
      console.log('⏰ [OverlayAIChat] Waiting for server response...');
      console.log('========================================\n');
      
      // 设置30秒超时检测
      setTimeout(() => {
        if (isTyping) {
          console.warn('\n⚠️⚠️⚠️ [OverlayAIChat] NO RESPONSE AFTER 30 SECONDS ⚠️⚠️⚠️');
          console.warn('⚠️ Possible issues:');
          console.warn('  1. Server not responding');
          console.warn('  2. Server not processing messages');
          console.warn('  3. Message format incorrect');
          console.warn('  4. Server connection lost');
          console.warn('========================================\n');
          // 不自动停止loading，让用户能看到在等待
        }
      }, 30000);
    } catch (err) {
      console.error('\n❌❌❌ [OverlayAIChat] SEND MESSAGE FAILED ❌❌❌');
      console.error('❌ [OverlayAIChat] Error:', err);
      console.error('========================================\n');
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setIsSending(false);
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (inputText.trim() === '') return;

    const messageContent = inputText.trim();
    
    // 立即设置加载状态，让按钮立即变成加载/暂停状态
    setIsSending(true);
    setIsTyping(true);
    setInputText('');
    // 开启新一轮对话时，清除上一轮的取消标记
    isRunCancelledRef.current = false;
    
    // 发送消息后收起键盘
    Keyboard.dismiss();
    
    await sendMessage(messageContent);
    
    // 发送消息后刷新版本列表（如果版本历史弹窗已打开）
    if (showVersionHistoryModal) {
      await loadVersionHistory();
    }
  };

  // 处理继续按钮点击（当达到最大轮次限制时）
  const handleContinue = async () => {
    console.log('🔄 [OverlayAIChat] User clicked Continue button');
    
    // 移除继续提示消息
    setMessages(prev => prev.filter(m => !m.metadata?.isContinueHint));
    
    // 发送继续指令给AI
    await sendMessage('Continue working on this task.');
  };

  // 处理跳过 Stripe 支付配置
  const handleSkipStripe = async () => {
    console.log('⏭️ [OverlayAIChat] User clicked Skip Stripe button');
    
    // 发送跳过消息给AI
    await sendMessage('Skip the Stripe payment configuration and continue generating the app.');
  };

  // 加载版本历史列表（首次加载或刷新）
  const loadVersionHistory = async (reset: boolean = true) => {
    if (reset) {
      setVersionHistoryOffset(0);
      setVersionHistory([]);
      setHasMoreVersions(true);
    }
    
    setIsLoadingVersions(true);
    try {
      const offset = reset ? 0 : versionHistoryOffset;
      const response = await httpClient.getProjectVersions(projectId || '', 20, offset);
      if (response.code === 0 && response.data) {
        const { versions, total } = response.data;
        // 转换 API 返回的数据格式为 VersionHistoryItem
        // API 使用驼峰命名规范：versionID, projectID, message, createdAt
        const newVersions: VersionHistoryItem[] = versions.map((v: ProjectVersion) => ({
          id: v.versionID,
          content: v.message, // 兼容旧字段
          message: v.message,
          timestamp: new Date(v.createdAt).getTime(),
          createdAt: v.createdAt,
          version: '', // 不再使用版本号
        }));
        
        if (reset) {
          setVersionHistory(newVersions);
          // offset 从0开始，下一次加载的 offset = 0 + 已加载的数量
          setVersionHistoryOffset(newVersions.length);
        } else {
          setVersionHistory(prev => [...prev, ...newVersions]);
          setVersionHistoryOffset(prev => prev + newVersions.length);
        }
        
        setVersionHistoryTotal(total);
        setHasMoreVersions(newVersions.length < total);
      }
    } catch (error) {
        console.error('❌ [VersionHistory] Error loading version history:', error);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  // 加载更多版本历史（上拉加载）
  const loadMoreVersionHistory = async () => {
    if (isLoadingMoreVersions || !hasMoreVersions || isLoadingVersions) return;
    
    setIsLoadingMoreVersions(true);
    try {
      const response = await httpClient.getProjectVersions(projectId || '', 20, versionHistoryOffset);
      if (response.code === 0 && response.data) {
        const { versions, total } = response.data;
        const newVersions: VersionHistoryItem[] = versions.map((v: ProjectVersion) => ({
          id: v.versionID,
          content: v.message,
          message: v.message,
          timestamp: new Date(v.createdAt).getTime(),
          createdAt: v.createdAt,
          version: '',
        }));
        
        setVersionHistory(prev => [...prev, ...newVersions]);
        setVersionHistoryTotal(total);
        // offset 从1开始，下一次加载的 offset = 当前 offset + 新加载的数量
        const nextOffset = versionHistoryOffset + newVersions.length;
        setVersionHistoryOffset(nextOffset);
        setHasMoreVersions(nextOffset <= total);
      }
    } catch (error) {
        console.error('❌ [VersionHistory] Error loading more versions:', error);
    } finally {
      setIsLoadingMoreVersions(false);
    }
  };

  // 检查是否已保存"不再提醒"状态
  const checkDontRemindRestore = async (): Promise<boolean> => {
    try {
      const stored = await AsyncStorage.getItem(DONT_REMIND_RESTORE_KEY);
      return stored === 'true';
    } catch (error) {
      console.error('❌ [VersionHistory] Error checking dont remind status:', error);
      return false;
    }
  };

  // 保存"不再提醒"状态
  const saveDontRemindRestore = async (dontRemind: boolean) => {
    try {
      if (dontRemind) {
        await AsyncStorage.setItem(DONT_REMIND_RESTORE_KEY, 'true');
      } else {
        await AsyncStorage.removeItem(DONT_REMIND_RESTORE_KEY);
      }
    } catch (error) {
      console.error('❌ [VersionHistory] Error saving dont remind status:', error);
    }
  };

  // 执行版本恢复（实际调用API）
  const executeRestoreVersion = async (version: VersionHistoryItem) => {
    if (!projectId) {
      setShowVersionHistoryModal(false);
      return;
    }

    try {
      // 调用回滚接口
      const response = await httpClient.rollbackToVersion(projectId, version.id);
      if (response.code === 0) {
        // 回滚成功后，手动插入版本回滚消息
        const revertMessage: ChatMessage = parseUserMessage(
          {
            type: 'user',
            message: {
              revert_version: true,
              role: 'user',
            },
          },
          `revert_${Date.now()}`,
          new Date().toISOString(),
          projectId
        );

        // 添加到消息列表
        setMessages(prev => [revertMessage, ...prev]);

        // 关闭版本历史弹窗
        setShowVersionHistoryModal(false);
        // 可以在这里刷新项目状态或重新加载消息历史
      } else {
        console.error('❌ [VersionHistory] Rollback failed:', response.info);
        Alert.alert('Error', response.info || 'Failed to rollback version');
      }
    } catch (error) {
      console.error('❌ [VersionHistory] Rollback error:', error);
      Alert.alert('Error', 'Failed to rollback version');
    }
  };

  // 处理版本历史恢复
  const handleRestoreVersion = async (version: VersionHistoryItem, dontRemind?: boolean) => {
    // 如果传递了dontRemind参数，说明是从确认弹窗来的
    if (dontRemind !== undefined) {
      // 保存"不再提醒"状态
      if (dontRemind) {
        await saveDontRemindRestore(true);
      }
      // 执行恢复
      await executeRestoreVersion(version);
      setShowRestoreConfirmModal(false);
      setPendingRestoreVersion(null);
      return;
    }

    // 否则，检查是否已保存"不再提醒"状态
    const shouldSkipConfirm = await checkDontRemindRestore();
    
    if (shouldSkipConfirm) {
      // 如果已保存"不再提醒"，直接执行恢复
      await executeRestoreVersion(version);
    } else {
      // 否则，显示确认弹窗
      setPendingRestoreVersion(version);
      setShowRestoreConfirmModal(true);
    }
  };

  // 处理确认弹窗的确认
  const handleConfirmRestore = async (dontRemind: boolean) => {
    if (pendingRestoreVersion) {
      await handleRestoreVersion(pendingRestoreVersion, dontRemind);
    }
  };

  // 处理确认弹窗的取消
  const handleCancelRestore = () => {
    setShowRestoreConfirmModal(false);
    setPendingRestoreVersion(null);
  };

  // 处理打开版本历史弹窗
  const handleOpenVersionHistory = async () => {
    setShowVersionHistoryModal(true);
    // 打开弹窗时加载版本列表
    await loadVersionHistory();
  };

  const clearError = () => {
    setError(null);
  };

  const handleClose = () => {
    onClose();
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      onClose(); // If onGoHome is not provided, just close the modal
    }
  };

  const handleRefresh = async () => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  🔄 REFRESH PREVIEW TRIGGERED         ║');
    console.log('╚════════════════════════════════════════╝');
    
    try {
      // 优先使用 onRefreshWebView（刷新 WebView）
      if (onRefreshWebView) {
        console.log('🔄 [OverlayAIChat] Refreshing WebView...');
        onRefreshWebView();
        console.log('✅✅✅ [OverlayAIChat] SUCCESS: WebView refreshed');
        console.log('========================================\n');
        return;
      }
      
      // 降级方案：如果没有提供 onRefreshWebView，使用旧的逻辑
      const currentUrl = projectUrl;
      
      if (!currentUrl) {
        console.warn('⚠️ [OverlayAIChat] No project URL found, cannot refresh');
        Alert.alert('提示', '无法获取项目URL，请重新打开项目');
        return;
      }
      
      console.log('🔄 [OverlayAIChat] Current manifest URL:', currentUrl);
      console.log('----------------------------------------');
      
      // 方案1: 尝试使用平滑重新加载（原生方法）
      console.log('📱 [OverlayAIChat] Strategy 1: Trying smooth reload with native method...');
      try {
        await DevMenu.reloadAppWithNewUrl(currentUrl);
        console.log('✅✅✅ [OverlayAIChat] SUCCESS: Smooth reload completed (Native Method)');
        console.log('========================================\n');
        return;
      } catch (reloadError) {
        console.warn('❌ [OverlayAIChat] Native reload failed:', reloadError);
        console.log('🔄 [OverlayAIChat] Falling back to Strategy 2...');
      }
      
      // 方案2: 降级到 Linking.openURL
      console.log('🔗 [OverlayAIChat] Strategy 2: Using Linking.openURL (app will restart)...');
      const canOpen = await Linking.canOpenURL(currentUrl);
      if (canOpen) {
        await Linking.openURL(currentUrl);
        console.log('✅✅✅ [OverlayAIChat] SUCCESS: Preview refreshed with Linking (App Restart)');
        console.log('========================================\n');
      } else {
        throw new Error('Cannot open project URL');
      }
    } catch (error) {
      console.error('❌❌❌ [OverlayAIChat] FAILED: All refresh strategies failed');
      console.error('Error details:', error);
      console.log('========================================\n');
      Alert.alert('刷新失败', '无法刷新预览，请稍后重试');
    }
  };

  const handleClearContext = async () => {
    console.log('🗑️ Clear context button pressed');
    
    if (!projectId) {
      Alert.alert('Error', 'Project information not found');
      return;
    }
    
    // Show confirmation dialog
    Alert.alert(
      'Clear Conversation Context',
      'This will reset your AI agent\'s memory. This action cannot be undone. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('📡 [OverlayAIChat] Calling clearHistoryMessages API...');
              const response = await httpClient.clearHistoryMessages(projectId);
              
              if (response.code === 0) {
                console.log('✅ [OverlayAIChat] Server context cleared');
                // 注意：系统消息会通过 WebSocket 返回，不需要手动添加
              } else {
                console.error('❌ Failed to clear context:', response.info);
                Alert.alert('Error', response.info || 'Failed to clear context');
              }
            } catch (error) {
              console.error('❌ Error clearing context:', error);
              Alert.alert('Error', 'Failed to clear context');
            }
          },
        },
      ]
    );
  };

  const handleStopAgent = async () => {
    console.log('🛑 Stop agent button pressed');
    
    if (!projectId) {
      Alert.alert('Error', 'Project information not found');
      return;
    }
    
    try {
      console.log('📡 [OverlayAIChat] Calling stopAgent API...');
      const response = await httpClient.stopAgent(projectId);
      
      if (response.code === 0) {
        console.log('✅ [OverlayAIChat] Agent stopped successfully');
        
        // 标记本轮已被用户主动终止，并重置所有相关状态
        isRunCancelledRef.current = true;
        setIsTyping(false);
        setIsSending(false);
        setIsCodingComplete(false);
        setIsSandboxReady(false);
        
        console.log('✅ [OverlayAIChat] All states reset after stopping agent');
      } else {
        console.error('❌ Failed to stop agent:', response.info);
        Alert.alert('Error', response.info || 'Failed to stop agent');
      }
    } catch (error) {
      console.error('❌ Error stopping agent:', error);
      Alert.alert('Error', 'Failed to stop agent');
      
      // 即使 API 调用失败，也标记本轮取消并重置状态（因为用户已经点击了停止）
      isRunCancelledRef.current = true;
      setIsTyping(false);
      setIsSending(false);
      setIsCodingComplete(false);
      setIsSandboxReady(false);
    }
  };

  const handleAddImage = async () => {
    try {
      Alert.alert(
        'Select Image',
        'Please choose image source',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {},
          },
          {
            text: 'Take Photo',
            onPress: async () => {
              console.log('📸 Hiding DevMenu window for camera...');
              await DevMenu.hideDevMenuWindowAsync();
              await openCamera();
            },
          },
          {
            text: 'Choose from Library',
            onPress: async () => {
              console.log('📸 Hiding DevMenu window for image library...');
              await DevMenu.hideDevMenuWindowAsync();
              await openImageLibrary();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Error occurred while selecting image');
    }
  };

  const openCamera = async () => {
    try {
      if (selectedImages.length >= MAX_IMAGES) {
        Alert.alert('提示', `最多只能选择${MAX_IMAGES}张图片`);
        return;
      }

      console.log('📷 [openCamera] Starting camera...');
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        console.log('📷 [openCamera] Permission denied');
        return;
      }

      console.log('📷 [openCamera] Launching camera...');
      const cameraOptions: CameraOptions = {
        mediaType: 'photo',
        quality: 0.7,
        saveToPhotos: false,
        includeBase64: true,
        cameraType: 'back',
      };
      
      console.log('📷 [openCamera] Calling launchCamera with options:', cameraOptions);
      const result = await launchCamera(cameraOptions);
      console.log('📷 [openCamera] Camera result received:', {
        didCancel: result.didCancel,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        assetsCount: result.assets?.length || 0,
      });

      if (result.didCancel) {
        console.log('📷 Camera result: canceled');
        return;
      }

      if (result.errorCode) {
        console.error('❌ Error launching camera:', result.errorMessage || result.errorCode);
        Alert.alert('Error', result.errorMessage || 'Failed to open camera');
        return;
      }

      const asset = result.assets?.[0];
      if (asset?.base64) {
        try {
          console.log('📸 Camera image base64 received, length:', asset.base64.length);
          const dataUri = `data:image/jpeg;base64,${asset.base64}`;
          console.log('✅ Base64 conversion complete, data URI length:', dataUri.length);

          const newImages = [...selectedImages, dataUri];
          setSelectedImages(newImages);
          await saveImagesToStorage(newImages);
          console.log('✅ Camera image saved as base64');
        } catch (conversionError) {
          console.error('❌ Error processing camera image:', conversionError);
          Alert.alert('Error', 'Failed to process captured photo. Please try again.');
        }
      } else if (asset?.uri) {
        // Fallback: 如果没有 base64，尝试使用 URI 转换
        try {
          console.log('📸 Camera image URI received, converting to base64...');
          console.log('📸 Camera image URI:', asset.uri);
          const compressedUri = await compressImage(asset.uri);
          const base64 = await convertImageToBase64(compressedUri);
          console.log('✅ Compression and base64 conversion complete, length:', base64.length);

          const newImages = [...selectedImages, base64];
          setSelectedImages(newImages);
          await saveImagesToStorage(newImages);
          console.log('✅ Camera image saved as base64');
        } catch (conversionError) {
          console.error('❌ Error converting camera image:', conversionError);
          Alert.alert('Error', `Failed to process captured photo: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`);
        }
      } else {
        Alert.alert('Error', 'No image data returned from camera. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error taking photo:', error);
      Alert.alert('Error', `Error occurred while taking photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      console.log('✅ Showing DevMenu window...');
      await DevMenu.showDevMenuWindowAsync();
    }
  };

  const openImageLibrary = async () => {
    try {
      const remainingSlots = MAX_IMAGES - selectedImages.length;
      if (remainingSlots <= 0) {
        Alert.alert('提示', `最多只能选择${MAX_IMAGES}张图片`);
        return;
      }

      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) {
        return;
      }

      console.log('🖼️ [openImageLibrary] Launching image library...');
      console.log(`🖼️ [openImageLibrary] Remaining slots: ${remainingSlots}`);

      const libraryOptions: ImageLibraryOptions = {
        mediaType: 'photo',
        quality: 0.7,
        selectionLimit: remainingSlots,
        includeBase64: true,
      };

      console.log('🖼️ [openImageLibrary] Calling launchImageLibrary with options:', libraryOptions);
      const result = await launchImageLibrary(libraryOptions);
      console.log('🖼️ [openImageLibrary] Library result received:', {
        didCancel: result.didCancel,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        assetsCount: result.assets?.length || 0,
      });
      console.log(
        '🖼️ Image library result:',
        result.didCancel ? 'canceled' : `selected ${result.assets?.length || 0} images`
      );

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        console.error('❌ Error opening image library:', result.errorMessage || result.errorCode);
        Alert.alert('Error', result.errorMessage || 'Failed to open image library');
        return;
      }

      const assets = result.assets || [];
      if (assets.length === 0) {
        Alert.alert('提示', '未选择任何图片');
        return;
      }

      console.log(`📸 Processing ${assets.length} images...`);

      const base64Array = await Promise.all(
        assets.map(async (asset: Asset, index: number) => {
          if (asset.base64) {
            // 直接使用返回的 base64 数据
            console.log(`📸 Image ${index + 1}/${assets.length}: Using base64 from picker, length:`, asset.base64.length);
            return `data:image/jpeg;base64,${asset.base64}`;
          } else if (asset.uri) {
            // Fallback: 如果没有 base64，尝试使用 URI 转换
            console.log(`📸 Image ${index + 1}/${assets.length}: Converting from URI:`, asset.uri);
            try {
              const compressedUri = await compressImage(asset.uri);
              const base64 = await convertImageToBase64(compressedUri);
              console.log(`✅ Image ${index + 1} compressed and converted, length:`, base64.length);
              return base64;
            } catch (error) {
              console.error(`❌ Error converting image ${index + 1}:`, error);
              throw new Error(`Failed to convert image ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          } else {
            throw new Error(`Missing image data for image ${index + 1}`);
          }
        })
      );

      const newImages = [...selectedImages, ...base64Array];
      setSelectedImages(newImages);
      await saveImagesToStorage(newImages);
      console.log(`✅ ${base64Array.length} images saved as base64 (will upload on send)`);
    } catch (error) {
      console.error('❌ Error selecting image:', error);
      Alert.alert('Error', `Error occurred while selecting image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      console.log('✅ Showing DevMenu window...');
      await DevMenu.showDevMenuWindowAsync();
    }
  };

  const handleRemoveImage = async (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    await saveImagesToStorage(newImages);
  };

  // Share handling functions
  const handleSharePress = () => {
    setShowShareModal(true);
  };

  const handleShareAppClip = async () => {
    try {
      const shareOptions = {
        message: appClipLink,
        url: appClipLink,
        title: 'Check out this app!',
      };

      if (Platform.OS === 'ios') {
        await Share.share(shareOptions);
      } else {
        // Android share
        await Share.share({
          message: `Check out this app! ${appClipLink}`,
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
      Alert.alert('Share Failed', 'Unable to share App Clip link');
    }
  };

  const handleUnpublish = () => {
    Alert.alert(
      'Unpublish',
      'Are you sure you want to unpublish this App Clip?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: () => {
            // Add unpublish logic here
            console.log('App Clip unpublished');
            setShowShareModal(false);
          },
        },
      ]
    );
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
  };

  // Build button handling functions
  const handleBuildPress = () => {
    setShowBuildModal(true);
  };

  const handleCloseBuildModal = () => {
    setShowBuildModal(false);
  };

  const handleBuildAction = (action: string) => {
    console.log(`Build action: ${action}`);
    setShowBuildModal(false);
    // Add specific build logic here
  };

  // Model selection handling functions
  const handleModelPress = () => {
    setShowModelModal(true);
  };

  const handleCloseModelModal = () => {
    setShowModelModal(false);
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setShowModelModal(false);
    console.log(`Selected model: ${modelId}`);

    // 持久化保存用户选择的模型
    AsyncStorage.setItem(SELECTED_MODEL_KEY, modelId).catch(error => {
      console.error('❌ [OverlayAIChat] Error saving selected model:', error);
    });
  };

  const handleViewPricing = async () => {
    try {
      await openLink(APP_LINKS.PRICING);
    } catch (error) {
      console.error('Unable to open pricing page:', error);
      Alert.alert('Error', 'Unable to open pricing page');
    }
  };


  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <View style={styles.overlay} pointerEvents="box-none">
        {/* Top action buttons - 使用动画淡出 */}
        <Animated.View 
          style={[
            styles.backgroundTop,
            topButtonsAnimatedStyle,
          ]}
          pointerEvents={isKeyboardVisible ? 'none' : 'auto'}
        >
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={handleClose}
          >
            <TopButtons onGoHome={handleGoHome} onRefresh={handleRefresh} />
          </TouchableOpacity>
        </Animated.View>

        {/* Chat window */}
        <Animated.View 
          style={[
            styles.chatContainer,
            chatContainerAnimatedStyle,
          ]}
        >
          <KeyboardAvoidingView 
            style={StyleSheet.absoluteFillObject}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            enabled={false}
          >
        {/* Action bar */}
        <TopActions 
          onClearContext={handleClearContext}
          onShare={handleSharePress}
          isKeyboardVisible={isKeyboardVisible}
          onVersionHistoryPress={handleOpenVersionHistory}
        />

        {/* Chat content - 占据整个容器 */}
        <View style={styles.chatContentWrapper}>
          <ChatContent
            messages={messages}
            isTyping={isTyping}
            error={error}
            onChatAreaPress={handleChatAreaPress}
            onClearError={clearError}
            onSuggestedPrompt={setInputText}
            onRefresh={handleRefreshHistory}
            refreshing={isLoadingHistory}
            onUpgrade={() => setShowSubscriptionModal(true)}
            onContinue={handleContinue}
            onSkip={handleSkipStripe}
            isInitialLoadComplete={isInitialLoadComplete}
            isCodingComplete={isCodingComplete}
            isSandboxReady={isSandboxReady}
            contentPaddingBottom={chatContentPaddingBottom}
            projectId={projectId || undefined}
          />
        </View>

        {/* Input area - 包含图片预览，使用动画与键盘同步 */}
        <Animated.View style={inputAreaAnimatedStyle}>
          <InputArea
            inputText={inputText}
            onInputChange={setInputText}
            onSendMessage={handleSendMessage}
            onStopAgent={handleStopAgent}
            onAddImage={handleAddImage}
            onBuildPress={handleBuildPress}
            onModelPress={handleModelPress}
            selectedModel={selectedModel}
            isSending={isSending}
            isTyping={isTyping}
            selectedImages={selectedImages}
            onRemoveImage={handleRemoveImage}
            isKeyboardVisible={isKeyboardVisible}
            onCollapsePress={onClose}
          />
        </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
      </View>
      
      {/* Share modal */}
      <ShareModal
        visible={showShareModal}
        appClipLink={appClipLink}
        onClose={handleCloseShareModal}
        onShare={handleShareAppClip}
        onUnpublish={handleUnpublish}
      />

      {/* Build modal */}
      <BuildModal
        visible={showBuildModal}
        onClose={handleCloseBuildModal}
        onBuildAction={handleBuildAction}
      />

      {/* Model selection modal */}
      <ModelModal
        visible={showModelModal}
        selectedModel={selectedModel}
        modelOptions={modelOptions}
        onClose={handleCloseModelModal}
        onModelSelect={handleModelSelect}
        onViewPricing={handleViewPricing}
      />

      {/* Version history modal - 当确认弹窗显示时隐藏 */}
      <VersionHistoryModal
        visible={showVersionHistoryModal && !showRestoreConfirmModal}
        versions={versionHistory}
        currentVersionId={versionHistory.length > 0 ? versionHistory[0].id : undefined}
        onLoadMore={loadMoreVersionHistory}
        onRefresh={() => loadVersionHistory(true)}
        isLoadingMore={isLoadingMoreVersions}
        isRefreshing={isLoadingVersions}
        hasMore={hasMoreVersions}
        onClose={() => setShowVersionHistoryModal(false)}
        onRestore={handleRestoreVersion}
      />

      {/* Restore confirm modal */}
      <RestoreConfirmModal
        visible={showRestoreConfirmModal}
        onConfirm={handleConfirmRestore}
        onCancel={handleCancelRestore}
        onDontRemind={() => {}} // 不需要在这里处理，在handleConfirmRestore中处理
      />
      
      {/* Subscription modal - 使用 SafeAreaProvider 包裹确保安全区域生效 */}
      <Modal
        visible={showSubscriptionModal}
        transparent={false}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowSubscriptionModal(false)}
      >
          <SubscriptionScreen
            onBack={() => {
              console.log('💰 [OverlayAIChat] Subscription modal closed');
              setShowSubscriptionModal(false);
            }}
            onUpgrade={() => {
              console.log('💰 [OverlayAIChat] Subscription upgraded successfully');
              setShowSubscriptionModal(false);
            }}
          />
      </Modal>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backgroundTop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  chatContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.9,
    minHeight: height * 0.85,
    marginTop: 20,
    position: 'relative', // 确保按钮的 absolute 定位相对于此容器
  },
  chatContainerFullscreen: {
    flex: 1,
    maxHeight: height,
    minHeight: height,
    marginTop: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  chatContentWrapper: {
    flex: 1,
    position: 'relative',
  },
});
