import { isAllowedAction } from './Protocol';

// Native 侧 Bridge：向 WebView 发送消息（白名单动作）
export const NativeBridge = {
  send(webRef: { current: { postMessage: (msg: string) => void } | null } | null, data: any) {
    if (!webRef?.current) return;
    const action = data?.action || data?.event;
    if (action && !isAllowedAction(action)) return;
    try {
      webRef.current.postMessage(JSON.stringify(data));
    } catch (e) {
      console.error('❌ [NativeBridge] postMessage failed:', e);
    }
  },
};

