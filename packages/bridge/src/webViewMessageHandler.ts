/**
 * WebView Message Handler
 * 处理来自 WebView 的消息
 */

import { Platform, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACTIONS } from './Protocol';

const CAMERA_PROMPT_KEY_PREFIX = '@camera_permission_prompt_seen_';

export interface MessageHandlerContext {
  projectId: string;
  sendToWeb: (payload: any) => void;
  onShowCameraPermissionModal: () => void;
  onPushStripe?: (payload: PushStripePayload) => void;
}

export interface PushStripePayload {
  url?: string;
  successUrl?: string | null;
  cancelUrl?: string | null;
  requestId?: string;
}

/**
 * 处理相机权限请求
 */
export async function handleCameraPermissionRequest(
  context: MessageHandlerContext
): Promise<boolean> {
  const { projectId, sendToWeb, onShowCameraPermissionModal } = context;

  const promptKey = `${CAMERA_PROMPT_KEY_PREFIX}${projectId}`;
  const hasSeen = await AsyncStorage.getItem(promptKey);

  // 第一次收到消息：仅记录，不做处理（不弹窗、不回包）
  if (!hasSeen) {
    await AsyncStorage.setItem(promptKey, 'seen');
    console.log('ℹ️ [WebViewMessageHandler] First camera permission request received. Recorded and skip handling.');
    return false; // 表示已处理，但不执行后续逻辑
  }

  // 后续请求：检查权限（Android/iOS 共用 react-native-permissions）
  const perm = Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA;
  try {
    let status = await check(perm);
    if (status === RESULTS.DENIED) {
      status = await request(perm);
    }

    if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) {
      sendToWeb({
        type: 'response',
        action: ACTIONS.GET_CAMERA_PERMISSION,
        granted: true,
      });
      return true;
    }

    // 未授权或被阻止：回包 false 并弹窗
    sendToWeb({
      type: 'response',
      action: ACTIONS.GET_CAMERA_PERMISSION,
      granted: false,
    });
    onShowCameraPermissionModal();
    return true;
  } catch (error) {
    console.error('❌ [WebViewMessageHandler] camera permission check failed:', error);
    sendToWeb({
      type: 'response',
      action: ACTIONS.GET_CAMERA_PERMISSION,
      granted: false,
    });
    onShowCameraPermissionModal();
    return true;
  }
}

/**
 * 打开系统设置页面
 */
export function openSystemSettings(): void {
  Linking.openSettings().catch(err => {
    console.error('❌ [WebViewMessageHandler] Failed to open settings:', err);
  });
}

/**
 * 处理来自 WebView 的消息
 */
export async function handleWebViewMessage(
  data: string,
  context: MessageHandlerContext
): Promise<boolean> {
  console.log('📨 [WebViewMessageHandler] handleWebViewMessage called with data:', data);
  console.log('📨 [WebViewMessageHandler] Data type:', typeof data);

  let message: any;
  try {
    message = JSON.parse(data);
    console.log('✅ [WebViewMessageHandler] Message parsed successfully:', message);
  } catch (error) {
    console.error('❌ [WebViewMessageHandler] Failed to parse message as JSON:', error);
    console.log('📨 [WebViewMessageHandler] Raw data:', data);
    return false; // 解析失败，未处理
  }

  const { type, action } = message || {};
  console.log('📨 [WebViewMessageHandler] Message type:', type, 'action:', action);

  // Web 请求相机权限
  if (type === 'request' && action === ACTIONS.GET_CAMERA_PERMISSION) {
    return await handleCameraPermissionRequest(context);
  }

  // Web 发起 Stripe 支付
  if (type === 'request' && action === ACTIONS.PUSH_STRIPE) {
    const { url, successUrl, cancelUrl, requestId } = message || {};
    const rid = requestId || `stripe_${Date.now()}`;

    if (!url) {
      context.sendToWeb({
        type: 'response',
        action,
        error: 'Missing url',
      });
      return true; // 已处理
    }

    if (context.onPushStripe) {
      context.onPushStripe({
        url,
        successUrl: successUrl || null,
        cancelUrl: cancelUrl || null,
        requestId: rid,
      });
    }

    context.sendToWeb({
      type: 'response',
      action,
      requestId: rid,
      status: 'opened',
    });
    return true;
  }

  // 其他消息类型可以在这里添加处理逻辑
  // 例如：if (type === 'request' && action === ACTIONS.PUSH_STRIPE) { ... }

  return false; // 未处理的消息
}


