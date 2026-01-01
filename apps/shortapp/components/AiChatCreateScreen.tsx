import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  AppState,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { ChevronBackIcon } from './icons/SvgIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Linking } from 'react-native';
import { httpClient } from '@vibecoding/api-client';
import { websocketClient } from '@vibecoding/ai-chat-core/src/websocketClient';
import { ChatMessage, WebSocketMessage, WebSocketMessageType, parseSandboxStatusMessage } from '@vibecoding/ai-chat-core';
import { parseAssistantContent, parseResultMessage, parseUserMessage } from '@vibecoding/ai-chat-core/src/messageParser';
import { useAuth } from '../hooks/useAuth';
import { launchCamera, launchImageLibrary, CameraOptions, ImageLibraryOptions, Asset } from 'react-native-image-picker';
import { PermissionsAndroid } from 'react-native';
import ChatContent from './OverlayAIChat/ChatContent';
import { MAX_IMAGES, compressImage, convertImageToBase64 } from '../utils/imageUtils';
import InputArea from './OverlayAIChat/InputArea';
import { BuildModal, ModelModal } from './OverlayAIChat/index';
import { SharedDataService } from '../services/SharedDataService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MODEL_OPTIONS } from '../config/models';

interface AiChatCreateScreenProps {
  onBack: () => void;
  initialPrompt?: string;
}

export default function AiChatCreateScreen({ onBack, initialPrompt }: AiChatCreateScreenProps) {
  const navigation = useNavigation();
  const { isAuthenticated, user, accessToken, loginType } = useAuth();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages]: [ChatMessage[], React.Dispatch<React.SetStateAction<ChatMessage[]>>] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState('glm-4.7');
  const [projectType, setProjectType] = useState<'miniapp' | 'web'>('miniapp'); // 项目类型：miniapp 或 web
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const hasInitialized = useRef(false);
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false); // 标记用户是否已发送消息
  const [isCodeGenerationComplete, setIsCodeGenerationComplete] = useState(false); // 标记代码生成是否完成
  const isCodeGenerationCompleteRef = useRef(false); // 立即可用的代码生成完成标志（解决异步状态问题）
  const [isSandboxReady, setIsSandboxReady] = useState(false); // 标记沙盒是否就绪
  const previewUrlRef = useRef<string | null>(null); // 保存预览URL
  const SELECTED_MODEL_KEY = '@ai_chat_selected_model';
  
  // 同步 state 到 ref（解决异步状态问题）
  useEffect(() => {
    isCodeGenerationCompleteRef.current = isCodeGenerationComplete;
  }, [isCodeGenerationComplete]);

  // 从 AsyncStorage 恢复模型选择（默认 glm-4.7）
  useEffect(() => {
    const loadSelectedModel = async () => {
      try {
        const storedModel = await AsyncStorage.getItem(SELECTED_MODEL_KEY);
        if (storedModel) {
          setSelectedModel(storedModel);
          console.log('✅ [AiChatCreateScreen] Restored selected model from storage:', storedModel);
        } else {
          console.log('ℹ️ [AiChatCreateScreen] No stored model, using default glm-4.7');
        }
      } catch (error) {
        console.error('❌ [AiChatCreateScreen] Error loading selected model:', error);
      }
    };

    loadSelectedModel();
  }, []);

  // 键盘监听
  useEffect(() => {
    const keyboardEventName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardHideEventName = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const keyboardShowListener = Keyboard.addListener(keyboardEventName, () => {
      setIsKeyboardVisible(true);
    });
    
    const keyboardHideListener = Keyboard.addListener(keyboardHideEventName, () => {
      setIsKeyboardVisible(false);
    });
    
    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  // 🎯 当代码生成完成 AND 沙盒就绪时，才跳转到预览
  useEffect(() => {
    console.log('🔍 [AiChatCreateScreen] 检查跳转条件:', {
      isCodeGenerationComplete,
      isSandboxReady,
      previewUrl: previewUrlRef.current,
      hasUserSentMessage,
      currentProjectId,
    });

    if (isCodeGenerationComplete && isSandboxReady && previewUrlRef.current && hasUserSentMessage && currentProjectId) {
      console.log('🎉 [AiChatCreateScreen] 所有条件满足，准备跳转到预览（并替换当前创建页面）...');
      console.log('🚀 [AiChatCreateScreen] Preview URL:', previewUrlRef.current);
      console.log('📦 [AiChatCreateScreen] Project ID:', currentProjectId);
      
      // ✅ 两个条件都满足，停止 typing 和 sending 状态
      setIsTyping(false);
      setIsSending(false);
      
      // 延迟跳转，让用户看到成功消息
      const timeoutId = setTimeout(async () => {
        try {
          const url = previewUrlRef.current;
          const projectId = currentProjectId;
          
          if (url && projectId) {
            console.log('🚀 [AiChatCreateScreen] Opening preview URL:', url);
            console.log('📦 [AiChatCreateScreen] Project ID:', projectId);
            
            // 使用 replace：用预览页面替换当前创建页面，
            // 这样在预览页点返回时不会回到创建页，而是回到再上一级页面
            (navigation as any).replace('ProjectWebView', { 
              project: { 
                project_id: projectId, 
                name: 'Project',
                type: projectType, // 添加项目类型：miniapp 或 web
                user_id: user?.user_id || '', // 添加 user_id，用于判断是否是本人的项目
                startup_info: { 
                  web_preview_url: url,
                  preview_url: url, // 同时传递 preview_url 作为备用
                } 
              } 
            });
            console.log('✅ [AiChatCreateScreen] Preview opened successfully with web_preview_url:', url);
          } else {
            console.warn('⚠️ [AiChatCreateScreen] URL or Project ID is missing:', { url, projectId });
          }
        } catch (error) {
          console.error('❌ [AiChatCreateScreen] Failed to open preview:', error);
          Alert.alert('Error', 'Failed to open project preview');
        }
      }, 1500);

      // 清理函数：如果组件卸载或条件变化，取消跳转
      return () => {
        clearTimeout(timeoutId);
      };
    } else {
      console.log('⏳ [AiChatCreateScreen] 跳转条件未满足，等待中...');
    }
  }, [isCodeGenerationComplete, isSandboxReady, hasUserSentMessage, currentProjectId, navigation]);

  // 处理初始提示词
  useEffect(() => {
    if (initialPrompt) {
      console.log('🚀 [AiChatCreateScreen] Found initial prompt, filling input...');
      setInputText(initialPrompt);
    }
  }, [initialPrompt]);

  // 组件卸载时断开 WebSocket 连接
  useEffect(() => {
    return () => {
      console.log('🔌 [AiChatCreateScreen] Disconnecting WebSocket');
      websocketClient.disconnect();
      hasInitialized.current = false;
    };
  }, []);

  /**
   * 首次发送前：确保已创建项目并连接 WebSocket
   * - 如果没有 project：先创建 project，写入 SharedDataService
   * - 然后获取 WebSocket path，连接 socket
   * - 返回可用的 projectId
   */
  const ensureProjectAndConnection = async (): Promise<string | null> => {
    if (!isAuthenticated || !user || !accessToken) {
      console.log('❌ [AiChatCreateScreen] User not authenticated, redirecting to Login');
      (navigation as any).navigate('Login', { redirectTo: 'AiChat' });
      return null;
    }

    let projectId = currentProjectId;

    try {
      // 1) 如无项目，先创建项目
      if (!projectId) {
        console.log('🔄 [AiChatCreateScreen] Starting project creation before first send...');
        setIsCreatingProject(true);

        const response = await httpClient.createProject(projectType);

        if (response.code === 0 && response.data) {
          projectId = response.data.project_id;
          setCurrentProjectId(projectId);
          console.log('✅ [AiChatCreateScreen] Project created successfully:', projectId);

          // 更新 SharedDataService 上下文
          console.log('💾 [AiChatCreateScreen] Updating SharedDataService with new project...');
          try {
            await SharedDataService.setContext({
              projectId,
              projectName: 'untitled',
              projectUrl: '',
              userId: user.user_id,
              userName: user.name,
              userEmail: user.email,
              accessToken,
              loginType: loginType as 'google' | 'apple' | null,
              timestamp: Date.now(),
            });
            console.log('✅ [AiChatCreateScreen] SharedDataService updated with new project');
          } catch (ctxErr) {
            console.warn('⚠️ [AiChatCreateScreen] Failed to update SharedDataService:', ctxErr);
          }
        } else if (response.code === 1) {
          console.warn('⚠️ [AiChatCreateScreen] User quota exceeded (code: 1)');
          Alert.alert(
            'Upgrade Required',
            'You have reached the limit of your free plan. Upgrade to Pro to create more projects.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Upgrade Now',
                style: 'default',
                onPress: () => (navigation as any).navigate('Subscription'),
              },
            ],
          );
          setIsCreatingProject(false);
          return null;
        } else {
          Alert.alert(
            'Upgrade Required',
            response.info || 'Failed to create project. Please try again.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Upgrade',
                style: 'default',
                onPress: () => (navigation as any).navigate('Subscription'),
              },
            ],
          );
          setIsCreatingProject(false);
          (navigation as any).goBack();
          return null;
        }

        setIsCreatingProject(false);
      }

      if (!projectId) {
        return null;
      }

      // 2) 如未连接 WebSocket，则连接
      if (!websocketClient.isConnected) {
        console.log('🔌 [AiChatCreateScreen] Initializing WebSocket connection for project:', projectId);
        setIsConnecting(true);

        const wsResponse = await httpClient.getWebSocketConnection(projectId);
        if (wsResponse.code !== 0 || !wsResponse.data?.path) {
          throw new Error(wsResponse.info || 'Failed to get WebSocket path');
        }

        const wsKey = wsResponse.data.path;
        console.log('✅ [AiChatCreateScreen] Got WebSocket key:', wsKey);

        await websocketClient.connect(projectId, user.user_id, wsKey);
        setIsConnected(true);
        setIsConnecting(false);
        hasInitialized.current = true;

        console.log('✅ [AiChatCreateScreen] WebSocket connected successfully');
      }

      return projectId;
    } catch (err) {
      console.error('❌ [AiChatCreateScreen] ensureProjectAndConnection failed:', err);
      setError('Failed to initialize chat session');
      setIsCreatingProject(false);
      setIsConnecting(false);
      return null;
    }
  };

  // 监听WebSocket消息
  useEffect(() => {
    if (!isConnected) return;

    const handleMessage = (message: WebSocketMessage) => {
      console.log('\n╔════════════════════════════════════════╗');
      console.log('║  📨 [AiChatCreateScreen] MESSAGE RECEIVED   ║');
      console.log('╚════════════════════════════════════════╝');
      console.log('📨 [AiChatCreateScreen] Message type:', message.type);

      try {
        // 处理沙盒状态消息 (type: 300)
        if (message.type === WebSocketMessageType.SANDBOX_STATUS) {
          console.log('🏗️ [AiChatCreateScreen] Processing SANDBOX_STATUS message');
          const sandboxMessage = message as any;
          const sandboxData = sandboxMessage.data;
          
          // ✅ 关键：沙盒启动成功时的处理
          const { status, startup_info } = sandboxData;
          
          // 过滤掉 "SETTING UP SANDBOX" 状态的消息，不显示给用户
          const lowerStatus = String(status || '').toLowerCase();
          const isSettingUpStatus = lowerStatus === 'creating' || 
                                   lowerStatus.includes('loading') || 
                                   lowerStatus.includes('starting') || 
                                   lowerStatus.includes('building');
          
          // 只有用户发送过消息，且不是 "SETTING UP SANDBOX" 状态，才添加沙盒消息到记录中
          if (hasUserSentMessage && !isSettingUpStatus) {
            // 使用统一的解析器
            const sandboxChatMessage = parseSandboxStatusMessage(
              sandboxData,
              message.msg_id,
              message.timestamp
            );
            
            setMessages(prev => {
              // 去重检查
              if (prev.some(m => m.id === sandboxChatMessage.id)) {
                console.log('⚠️ [AiChatCreateScreen] Sandbox message already exists, skipping');
                return prev;
              }
              console.log('➕ [AiChatCreateScreen] Added sandbox status message');
              return [sandboxChatMessage, ...prev];
            });
          } else {
            if (!hasUserSentMessage) {
              console.log('ℹ️ [AiChatCreateScreen] 用户尚未发送消息，不添加沙盒消息到记录中');
            } else if (isSettingUpStatus) {
              console.log('ℹ️ [AiChatCreateScreen] 跳过 "SETTING UP SANDBOX" 状态消息，不显示给用户');
            }
          }
          // 优先使用 web_preview_url
          const previewUrl = startup_info?.web_preview_url || startup_info?.preview_url;
          if (status === 'success' && previewUrl) {
            console.log('✅ [AiChatCreateScreen] 沙盒启动成功',startup_info);
            console.log('🚀 [AiChatCreateScreen] Preview URL:', previewUrl);
            console.log('👤 [AiChatCreateScreen] 用户是否已发送消息:', hasUserSentMessage);
            console.log('📝 [AiChatCreateScreen] 代码生成是否完成 (state):', isCodeGenerationComplete);
            console.log('📝 [AiChatCreateScreen] 代码生成是否完成 (ref):', isCodeGenerationCompleteRef.current);
            
            // 🎯 关键逻辑：只处理代码生成完成后的沙盒成功消息（使用 ref 获取最新值）
            if (!isCodeGenerationCompleteRef.current) {
              console.log('⏭️ [AiChatCreateScreen] 代码尚未生成完成，忽略此次沙盒启动（可能是旧代码或初始状态）');
              return; // 直接返回，不处理此次沙盒消息
            }
            
            console.log('✅ [AiChatCreateScreen] 代码已生成完成，处理沙盒成功消息');
            
            // 🔑 关键：更新 SharedDataService，添加 projectUrl
            if (currentProjectId) {
              console.log('💾 [AiChatCreateScreen] Updating SharedDataService with preview URL...');
              SharedDataService.getContext().then(async (context) => {
                if (context && context.projectId === currentProjectId) {
                  await SharedDataService.setContext({
                    ...context,
                    projectUrl: previewUrl,
                    timestamp: Date.now(),
                  });
                  console.log('✅ [AiChatCreateScreen] SharedDataService updated with preview URL');
                }
              }).catch(err => {
                console.warn('⚠️ [AiChatCreateScreen] Failed to update SharedDataService:', err);
              });
            }
            
            // 保存预览URL并标记沙盒就绪
            previewUrlRef.current = previewUrl;
            setIsSandboxReady(true);
            console.log('✅ [AiChatCreateScreen] 沙盒就绪，可以跳转到预览');
            console.log('📊 [AiChatCreateScreen] 当前状态:', {
              isCodeGenerationComplete,
              isSandboxReady: true, // 即将设置为 true
              previewUrl: previewUrlRef.current,
              hasUserSentMessage,
              currentProjectId,
            });
          } else if (status === 'failed') {
            console.log('❌ [AiChatCreateScreen] 沙盒启动失败');
            // 失败情况下停止所有状态
            setIsTyping(false);
            setIsSending(false);
            // 重置状态
            setIsCodeGenerationComplete(false);
            setIsSandboxReady(false);
            previewUrlRef.current = null;
          } else if (status === 'killed') {
            console.log('⚠️ [AiChatCreateScreen] 沙盒被停止');
            // 停止所有状态
            setIsTyping(false);
            setIsSending(false);
            // 重置状态
            setIsCodeGenerationComplete(false);
            setIsSandboxReady(false);
            previewUrlRef.current = null;
          } else {
            console.log('ℹ️ [AiChatCreateScreen] 沙盒状态:', status);
          }
          
          return;
        }
        
        // 只处理MODEL_RESPONSE类型
        if (message.type !== WebSocketMessageType.MODEL_RESPONSE) {
          console.log('ℹ️ [AiChatCreateScreen] Ignoring message type:', message.type);
          return;
        }

        // 提取agent_message（关键：从message.data.agent_message获取）
        const agentMessage = (message.data as any).agent_message;
        
        if (!agentMessage) {
          console.log('ℹ️ [AiChatCreateScreen] No agent_message, skipping');
          return;
        }
        
        console.log('📨 [AiChatCreateScreen] agent_message.type:', agentMessage.type);
        
        // 1. 处理user消息（服务器echo，包含完整图片信息）
        if (agentMessage.type === 'user') {
          console.log('👤 [AiChatCreateScreen] Processing user message from server');
          
          // 使用统一的解析器
          const serverUserMessage = parseUserMessage(
            agentMessage, 
            message.msg_id, 
            message.timestamp,
            currentProjectId
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
              console.log('⚠️ [AiChatCreateScreen] User message already exists (local), skipping server message');
              return prev;
            }
            
            console.log('✅ [AiChatCreateScreen] Added user message from server');
            return [serverUserMessage, ...prev];
          });
          
          return;
        }
        
        // 2. 跳过system init消息
        if (agentMessage.type === 'system' && agentMessage.subtype === 'init') {
          console.log('⚙️ [AiChatCreateScreen] System init message - skipping');
          return;
        }
        
        // 2.5. 处理system clear消息（系统清除消息）
        if (agentMessage.type === 'system' && agentMessage.subtype === 'clear') {
          console.log('🗑️ [AiChatCreateScreen] System clear message received');
          const clearMessageText = agentMessage.message || 'Conversation history has been cleared';
          
          const clearMessage: ChatMessage = {
            id: `system_clear_${message.msg_id}`,
            type: 'model_system_init',
            role: 'assistant',
            content: clearMessageText,
            timestamp: new Date(message.timestamp).getTime(),
          };
          
          setMessages(prev => {
            // 检查是否已存在（去重）
            const exists = prev.some(m => m.id === clearMessage.id);
            if (exists) {
              console.log('⚠️ [AiChatCreateScreen] Clear message already exists, skipping');
              return prev;
            }
            console.log('✅ [AiChatCreateScreen] Added system clear message');
            return [clearMessage, ...prev];
          });
          
          return;
        }
        
        // 3. 处理assistant消息（使用共享解析器）
        if (agentMessage.type === 'assistant' && agentMessage.message) {
          console.log('🤖 [AiChatCreateScreen] Processing assistant message');
          
          const parsedMessages = parseAssistantContent(agentMessage, message.msg_id, message.timestamp);
          
          if (parsedMessages.length > 0) {
            // 检查消息是否已存在（去重）
            setMessages(prev => {
              const newMessages = parsedMessages.filter(newMsg => 
                !prev.some(m => m.id === newMsg.id)
              );
              
              if (newMessages.length === 0) {
                console.log('⚠️ [AiChatCreateScreen] All messages already exist, skipping');
                return prev;
              }
              
              console.log(`➕ [AiChatCreateScreen] Added ${newMessages.length} messages`);
              return [...newMessages, ...prev];
            });
          }
          
          // 收到第一条assistant消息，停止isSending
          setIsSending(false);
          console.log('✅ [AiChatCreateScreen] Assistant messages processed');
          return;
        }
        
        // 4. 处理result消息（使用共享解析器）
        if (agentMessage.type === 'result') {
          console.log('🎯 [AiChatCreateScreen] Received result message');
          console.log('🎯 [AiChatCreateScreen] Result subtype:', agentMessage.subtype);
          
          // 添加result消息到UI
          const resultMessage = parseResultMessage(agentMessage, message.msg_id, message.timestamp);
          setMessages(prev => {
            const exists = prev.some(m => m.id === resultMessage.id);
            if (exists) {
              console.log(`⚠️ [AiChatCreateScreen] Result message ${resultMessage.id} already exists, skipping`);
              return prev;
            }
            console.log('✅ [AiChatCreateScreen] Result message added');
            return [resultMessage, ...prev];
          });
          
          // 停止 sending 状态（消息已发送成功）
          setIsSending(false);
          console.log('🎉 [AiChatCreateScreen] SESSION COMPLETE');
          
          // ✅ 设置代码生成完成状态
          if (agentMessage.subtype === 'success') {
            console.log('✅ [AiChatCreateScreen] 代码生成成功');
            setIsCodeGenerationComplete(true);
            setIsTyping(true); // 保持 thinking 状态直到确认沙盒成功
            console.log('⏳ [AiChatCreateScreen] 等待代码生成完成后的沙盒启动...');
            console.log('📝 [AiChatCreateScreen] 注意：之前的沙盒启动消息会被忽略，只处理代码生成完成后的沙盒消息');
            console.log('📊 [AiChatCreateScreen] 代码生成完成时的状态:', {
              isCodeGenerationComplete: true, // 即将设置为 true
              isSandboxReady,
              previewUrl: previewUrlRef.current,
              hasUserSentMessage,
              currentProjectId,
            });
            // 不检查 previewUrlRef.current，因为可能是旧代码的预览
            // 必须等待代码生成完成后的新沙盒成功消息
          } else if (agentMessage.subtype === 'error_max_turns') {
            console.log('⚠️ [AiChatCreateScreen] 达到最大对话轮次限制');
            
            // 添加特殊的"继续"提示消息
            const continueMessage: ChatMessage = {
              id: `continue_hint_${Date.now()}`,
              type: 'model_system_init',
              role: 'assistant',
              content: '🔄 Maximum conversation turns reached\n\nThe AI needs your permission to continue working on this task. Would you like to continue?',
              timestamp: Date.now(),
              metadata: {
                isContinueHint: true, // 标记这是一个继续提示消息
                needsContinue: true,
              },
            };
            
            setMessages(prev => {
              const exists = prev.some(m => m.id === continueMessage.id);
              if (!exists) {
                return [continueMessage, ...prev];
              }
              return prev;
            });
            
            // 停止 loading 状态
            setIsTyping(false);
            setIsSending(false);
          } else if (agentMessage.subtype === 'failed') {
            console.log('❌ [AiChatCreateScreen] 代码生成失败');
            setIsCodeGenerationComplete(false);
            setIsSandboxReady(false);
            previewUrlRef.current = null;
            // 失败情况下停止 typing
            setIsTyping(false);
          }
          return;
        }
        
        // Error Message（错误消息）
        if (agentMessage.type === 'error') {
          const errorText = agentMessage.error || 'Unknown error';
          const errorSubtype = agentMessage.subtype;
          console.log('❌ [AiChatCreateScreen] Error message:', errorText);
          console.log('❌ [AiChatCreateScreen] Error subtype:', errorSubtype);
          
          // 特殊处理：点数不足错误（检测 subtype 或错误文本）
          const isInsufficientCredits = errorSubtype === 'insufficient_credits' || 
                                        errorText.toLowerCase().includes('insufficient credits');
          
          if (isInsufficientCredits) {
            console.log('💰 [AiChatCreateScreen] Insufficient credits detected');
            
            // 添加友好的订阅提示消息（而不是错误消息）
            const upgradeMessage: ChatMessage = {
              id: `upgrade_hint_${Date.now()}`,
              type: 'model_system_init',
              role: 'assistant',
              content: `💎 Upgrade to continue\n\nYou've used up your available credits. Upgrade your subscription to keep creating amazing apps!`,
              timestamp: Date.now(),
              metadata: {
                isUpgradeHint: true, // 标记这是一个升级提示消息
                requiredCredits: agentMessage.credits_required_usd,
              },
            };
            
            setMessages(prev => [upgradeMessage, ...prev]);
            
            // Show alert and guide user to upgrade
            Alert.alert(
              'Insufficient Credits',
              `You don't have enough credits to continue. Approximately $${agentMessage.credits_required_usd?.toFixed(4) || '0.02'} is required.\n\nWould you like to upgrade your subscription?`,
              [
                {
                  text: 'Cancel',
                  style: 'cancel'
                },
                {
                  text: 'Upgrade',
                  onPress: () => {
                    console.log('💰 User chose to upgrade subscription');
                    // Navigate to subscription page
                    navigation.navigate('Subscription' as never);
                  }
                }
              ]
            );
            
            // 停止 loading 状态
            setIsTyping(false);
            setIsSending(false);
            // 重置状态
            setIsCodeGenerationComplete(false);
            setIsSandboxReady(false);
            previewUrlRef.current = null;
            
            // 已添加友好提示消息，直接返回
            return;
          }
          
          // 其他错误消息正常显示
          const errorMessage: ChatMessage = {
            id: `error_${Date.now()}`,
            type: 'model_system_init',
            role: 'assistant',
            content: `❌ Error: ${errorText}`,
            timestamp: Date.now(),
          };

          setMessages(prev => [errorMessage, ...prev]);
          setIsTyping(false);
          setIsSending(false);
          // 重置状态
          setIsCodeGenerationComplete(false);
          setIsSandboxReady(false);
          previewUrlRef.current = null;
          console.log('✅ [AiChatCreateScreen] Error message added');
          return;
        }
        
        // 3.5. Action Message（动作消息，需要用户操作）
        if (agentMessage.type === 'action') {
          const actionSubtype = agentMessage.subtype || '';
          // 从 data._id 获取 actionId，添加到 metadata 中
          const actionId = (message.data as any)?._id;
          console.log('🎬 [AiChatCreateScreen] Action message received, subtype:', actionSubtype, 'actionId:', actionId);
          
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
              console.log('⚠️ [AiChatCreateScreen] Action message already exists, skipping');
              return prev;
            }
            console.log('✅ [AiChatCreateScreen] Added action message, subtype:', actionSubtype);
            return [actionMessage, ...prev];
          });
          
          // Action 消息会暂停 Agent 执行，等待用户操作
          setIsTyping(false);
          setIsSending(false);
          
          return;
        }
        
        // 5. Status Message（状态消息）- 如 thinking
        if (agentMessage.type === 'status') {
          console.log('💭 [AiChatCreateScreen] Status message:', agentMessage.subtype);
          
          // thinking 状态：显示 AI 正在思考
          if (agentMessage.subtype === 'thinking') {
            console.log('🤔 [AiChatCreateScreen] AI is thinking...');
            setIsTyping(true);
            setIsSending(false); // 消息已发送成功，只是 AI 在思考
          }
          
          // status 消息不需要在 UI 中显示，只用于控制状态
          return;
        }
        
        // 未知类型 - 显示一个调试消息，不影响其他消息渲染
        console.warn('⚠️ [AiChatCreateScreen] Unknown agent_message type:', agentMessage.type);
        console.log('Full agentMessage:', JSON.stringify(agentMessage, null, 2));
        
        const unknownMessage: ChatMessage = {
          id: `unknown_${Date.now()}`,
          type: 'model_system_init',
          role: 'assistant',
          content: `⚠️ 收到未知类型的消息 (type: ${agentMessage.type})`,
          timestamp: Date.now(),
        };

        setMessages(prev => [unknownMessage, ...prev]);
        setIsTyping(false);
        setIsSending(false);
        console.log('⚠️ [AiChatCreateScreen] Unknown message type added to UI');
      } catch (error) {
        console.error('❌ [AiChatCreateScreen] Error handling message:', error);
      }
    };

    const unsubscribe = websocketClient.onMessage(handleMessage);

    return () => {
      unsubscribe();
    };
  }, [isConnected, hasUserSentMessage, currentProjectId]);

  // 处理继续按钮点击（当达到最大轮次限制时）
  const handleContinue = async () => {
    console.log('🔄 [AiChatCreateScreen] User clicked Continue button');
    
    // 移除继续提示消息
    setMessages(prev => prev.filter(m => !m.metadata?.isContinueHint));
    
    // 发送继续指令给AI
    try {
      const projectId = await ensureProjectAndConnection();
      if (!projectId || !user?.user_id) {
        console.error('❌ [AiChatCreateScreen] Cannot continue: project or user not ready');
        return;
      }

      setIsSending(true);
      setIsTyping(true);
      setError(null);
      
      // 构建继续消息
      const continueMessage: ChatMessage = {
        id: `user_continue_${Date.now()}`,
        type: 'user',
        role: 'user',
        content: 'Continue working on this task.',
        timestamp: Date.now(),
      };
      
      setMessages(prev => [continueMessage, ...prev]);
      
      // 通过WebSocket发送
      websocketClient.sendUserPrompt('Continue working on this task.', projectId, user.user_id, [], selectedModel);
      
      console.log('✅ [AiChatCreateScreen] Continue message sent');
    } catch (error) {
      console.error('❌ [AiChatCreateScreen] Failed to send continue message:', error);
      setError('Failed to continue. Please try again.');
      setIsSending(false);
      setIsTyping(false);
    }
  };

  // 处理跳过 Stripe 支付配置
  const handleSkipStripe = async () => {
    console.log('⏭️ [AiChatCreateScreen] User clicked Skip Stripe button');
    
    try {
      const projectId = await ensureProjectAndConnection();
      if (!projectId || !user?.user_id) {
        console.error('❌ [AiChatCreateScreen] Cannot skip: project or user not ready');
        return;
      }

      setIsSending(true);
      setIsTyping(true);
      setError(null);
      
      // 构建跳过消息
      const skipMessage: ChatMessage = {
        id: `user_skip_stripe_${Date.now()}`,
        type: 'user',
        role: 'user',
        content: 'Skip the Stripe payment configuration and continue generating the app.',
        timestamp: Date.now(),
      };
      
      setMessages(prev => [skipMessage, ...prev]);
      
      // 通过WebSocket发送
      websocketClient.sendUserPrompt('Skip the Stripe payment configuration and continue generating the app.', projectId, user.user_id, [], selectedModel);
      
      console.log('✅ [AiChatCreateScreen] Skip Stripe message sent');
    } catch (error) {
      console.error('❌ [AiChatCreateScreen] Failed to send skip message:', error);
      setError('Failed to skip. Please try again.');
      setIsSending(false);
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    const content = inputText.trim();
    if (content === '' || isSending) {
      return;
    }

    // 立即设置加载状态，让按钮立即变成加载/暂停状态
    setIsSending(true);
    setIsTyping(true);
    setIsCodeGenerationComplete(false);
    setIsSandboxReady(false);
    setError(null);
    previewUrlRef.current = null;
    
    // 清空输入框并收起键盘
    setInputText('');
    Keyboard.dismiss();

    // 确保在真正发送前已经创建项目并连接 WebSocket
    const projectId = await ensureProjectAndConnection();
    if (!projectId || !user?.user_id) {
      console.error('❌ [AiChatCreateScreen] Cannot send message: project or user not ready');
      setIsSending(false);
      setIsTyping(false);
      // 恢复输入内容
      setInputText(content);
      return;
    }
    
    try {
      // 上传图片到OSS（通过后端代理）
      // 必须等待所有图片上传完成后才能发送消息
      let imageUrls: string[] = [];
      // 检查是否有有效的图片（过滤掉空值、null、undefined）
      const validImages = selectedImages.filter((img): img is string => 
        typeof img === 'string' && img.trim().length > 0
      );
      if (validImages.length > 0) {
        console.log(`📤 [AiChatCreateScreen] Uploading ${validImages.length} images...`);
        
        // 再次确认 projectId 有效
        if (!projectId) {
          console.error('❌ [AiChatCreateScreen] Cannot upload images: projectId is null');
          setInputText(content);
          setIsSending(false);
          setIsTyping(false);
          return;
        }
        
        try {
          imageUrls = await httpClient.uploadMultipleImages(projectId, validImages);
          console.log(`✅ [AiChatCreateScreen] ${imageUrls.length} images uploaded successfully`);
        } catch (uploadError) {
          console.error('❌ [AiChatCreateScreen] Upload failed:', uploadError);
          // 恢复输入内容，避免消息丢失
          setInputText(content);
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

      // 添加用户消息到UI
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

      setMessages(prev => [userMessage, ...prev]);
      // 标记用户已发送消息（用于后续沙盒状态处理）
      setHasUserSentMessage(true);

      // 通过WebSocket发送消息
      console.log('📤 [AiChatCreateScreen] Sending user message via WebSocket');
      console.log('📤 [AiChatCreateScreen] Image URLs (OSS URLs, not base64):');
      imageUrls.forEach((url, i) => {
        console.log(`  ${i + 1}. ${url}`);
        console.log(`     Type: ${url.startsWith('data:') ? '❌ BASE64 (ERROR!)' : '✅ OSS URL'}`);
      });
      websocketClient.sendUserPrompt(content, projectId, user.user_id, imageUrls, selectedModel);
      
      // 清空选中的图片
      setSelectedImages([]);
      
    } catch (error) {
      console.error('❌ [AiChatCreateScreen] Error sending message:', error);
      setError('Failed to send message. Please try again.');
      // 如果发送失败（包括 WS 断连等），把内容写回输入框，方便用户重试
      setInputText(content);
      setIsSending(false);
      setIsTyping(false);
      setIsCodeGenerationComplete(false);
      setIsSandboxReady(false);
      previewUrlRef.current = null;
    }
  };

  const handleSuggestedPrompt = React.useCallback((prompt: string) => {
    // 将建议的提示词填充到输入框，而不是直接发送
    setInputText(prompt);
  }, []);

  const handleClearError = () => {
    setError(null);
  };

  const handleStopAgent = async () => {
    console.log('🛑 [AiChatCreateScreen] Stop agent button pressed');
    
    if (!currentProjectId) {
      Alert.alert('Error', 'Project information not found');
      return;
    }
    
    try {
      console.log('📡 [AiChatCreateScreen] Calling stopAgent API...');
      const response = await httpClient.stopAgent(currentProjectId);
      
      if (response.code === 0) {
        console.log('✅ [AiChatCreateScreen] Agent stopped successfully');
        
        // 重置所有相关状态
        setIsTyping(false);
        setIsSending(false);
        setIsCodeGenerationComplete(false);
        isCodeGenerationCompleteRef.current = false;
        setIsSandboxReady(false);
        previewUrlRef.current = null;
        
        console.log('✅ [AiChatCreateScreen] All states reset after stopping agent');
      } else {
        console.error('❌ [AiChatCreateScreen] Failed to stop agent:', response.info);
        Alert.alert('Error', response.info || 'Failed to stop agent');
      }
    } catch (error) {
      console.error('❌ [AiChatCreateScreen] Error stopping agent:', error);
      Alert.alert('Error', 'Failed to stop agent');
      
      // 即使 API 调用失败，也重置状态（因为用户已经点击了停止）
      setIsTyping(false);
      setIsSending(false);
      setIsCodeGenerationComplete(false);
      isCodeGenerationCompleteRef.current = false;
      setIsSandboxReady(false);
      previewUrlRef.current = null;
    }
  };

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

  // 页面重新获得焦点时，确保键盘已关闭
  useFocusEffect(
    React.useCallback(() => {
      // 页面获得焦点时，确保键盘已关闭
      Keyboard.dismiss();
      
      return () => {
        // 页面失去焦点时，也关闭键盘
        Keyboard.dismiss();
      };
    }, [])
  );


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

          setSelectedImages([...selectedImages, dataUri]);
        } catch (conversionError) {
          console.error('❌ Error processing camera image:', conversionError);
          Alert.alert('Error', 'Failed to process captured photo. Please try again.');
        }
      } else if (asset?.uri) {
        try {
          console.log('📸 Camera image URI received, converting to base64...');
          console.log('📸 Camera image URI:', asset.uri);
          const compressedUri = await compressImage(asset.uri);
          const base64 = await convertImageToBase64(compressedUri);
          console.log('✅ Compression and base64 conversion complete, length:', base64.length);

          setSelectedImages([...selectedImages, base64]);
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
            console.log(`📸 Image ${index + 1}/${assets.length}: Using base64 from picker, length:`, asset.base64.length);
            return `data:image/jpeg;base64,${asset.base64}`;
          } else if (asset.uri) {
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
      console.log(`✅ ${base64Array.length} images saved as base64 (will upload on send)`);
    } catch (error) {
      console.error('❌ Error selecting image:', error);
      Alert.alert('Error', `Error occurred while selecting image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // 底部功能处理方法
  const handleAddImage = async () => {
    try {
      // TODO: Replace with react-native-image-picker or similar
      // const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      // 
      // if (status !== 'granted') {
      //   Alert.alert('Permission Denied', 'Camera roll permission is required to select images');
      //   return;
      // }

      // 显示选择对话框
      Alert.alert(
        'Select Image',
        'Please choose image source',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Take Photo',
            onPress: openCamera,
          },
          {
            text: 'Choose from Library',
            onPress: openImageLibrary,
          },
        ]
      );
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Error occurred while selecting image');
    }
  };

  const handleBuildPress = () => {
    setShowBuildModal(true);
  };

  const handleModelPress = () => {
    setShowModelModal(true);
  };

  const handleCloseBuildModal = () => {
    setShowBuildModal(false);
  };

  const handleBuildAction = (action: string) => {
    console.log(`Build action: ${action}`);
    setShowBuildModal(false);
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
      console.error('❌ [AiChatCreateScreen] Error saving selected model:', error);
    });
  };

  // 聊天界面（全屏）
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.fullScreenContainer} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -12 : 0}
      >
        {/* 顶部操作栏 - 只保留返回按钮和标题 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <ChevronBackIcon size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create App</Text>
          <View style={styles.placeholder} />
        </View>

        {/* 聊天内容 - 占据整个容器 */}
        <View style={styles.chatContentWrapper}>
          <ChatContent
            messages={messages}
            isTyping={isTyping}
            error={error}
            onChatAreaPress={handleChatAreaPress}
            onClearError={handleClearError}
            onSuggestedPrompt={handleSuggestedPrompt}
            onUpgrade={() => navigation.navigate('Subscription' as never)}
            onContinue={handleContinue}
            onSkip={handleSkipStripe}
            isInitialLoadComplete={true}
            contentPaddingBottom={0}
            isCodingComplete={isCodeGenerationComplete}
            projectId={currentProjectId || undefined}
          />
        </View>

        {/* 输入区域（包含底部功能按钮和图片预览） */}
        <InputArea
          inputText={inputText}
          onInputChange={setInputText}
          onSendMessage={handleSendMessage}
          onStopAgent={handleStopAgent}
          onAddImage={handleAddImage}
          onBuildPress={handleBuildPress}
          onModelPress={handleModelPress}
          selectedModel={selectedModel}
          projectType={projectType}
          onProjectTypeChange={setProjectType}
          isSending={isSending}
          isTyping={isTyping}
          selectedImages={selectedImages}
          isKeyboardVisible={isKeyboardVisible}
          onRemoveImage={(index) => {
            const newImages = selectedImages.filter((_, i) => i !== index);
            setSelectedImages(newImages);
          }}
        />

        {/* 创建项目 / 连接 Socket 全屏 Loading 覆盖层（仅在后台初始化时显示） */}
        {(isCreatingProject || isConnecting) && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingTitle}>
                {isCreatingProject ? 'Creating your app...' : 'Connecting to AI...'}
              </Text>
              <Text style={styles.loadingSubtext}>
                {isCreatingProject
                  ? 'Setting up your workspace'
                  : 'Establishing real-time connection'}
              </Text>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

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
        modelOptions={MODEL_OPTIONS}
        onClose={handleCloseModelModal}
        onModelSelect={handleModelSelect}
        onViewPricing={() => console.log('View pricing')}
      />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  keyboardView: {
    flex: 1,
  },
  chatContentWrapper: {
    flex: 1,
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  loadingContainer: {
    paddingHorizontal: 40,
    paddingVertical: 32,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 6,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    padding: 4,
  },
});
