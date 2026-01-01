import { isAllowedAction } from './Protocol';

declare const window: any;

// Web 侧 Bridge：在 React Native Web / Expo Web 中使用
export const WebBridge = {
  send(data: any) {
    if (!window) return;
    const action = data?.action || data?.event;
    if (action && !isAllowedAction(action)) return;

    if (window?.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(data));
    } else {
      // 非 WebView 调试场景
      console.log('[Web 调试环境] send:', data);
    }
  },
  listen(handler: (data: any) => void) {
    const listener = (event: MessageEvent | any) => {
      // 过滤 devtools/HMR 噪音
      if (event?.data?.source === 'react-devtools' || event?.data?.expo?.type === 'HMR') {
        return;
      }
      let payload = event?.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (e) {
          // ignore parse error
        }
      }
      handler && handler(payload);
    };
    if (window) {   
      window.addEventListener('message', listener);
    }
    return () => {
      if (window) {
        window.removeEventListener('message', listener);
      }
    };
  },
};

