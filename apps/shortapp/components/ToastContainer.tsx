// Toast 容器组件 - 自定义样式并处理安全区域

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast, { BaseToast, ErrorToast, BaseToastProps } from 'react-native-toast-message';

const THEME_COLOR = '#FF6B35';

// Toast 自定义配置 - iOS 风格
const toastConfig = {
  success: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: THEME_COLOR,
        borderLeftWidth: 5,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: '#1C1C1E',
      }}
      text2Style={{
        fontSize: 13,
        color: '#8E8E93',
      }}
    />
  ),
  error: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: THEME_COLOR,
        borderLeftWidth: 5,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: '#1C1C1E',
      }}
      text2Style={{
        fontSize: 13,
        color: '#8E8E93',
      }}
    />
  ),
  info: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: THEME_COLOR,
        borderLeftWidth: 5,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: '#1C1C1E',
      }}
      text2Style={{
        fontSize: 13,
        color: '#8E8E93',
      }}
    />
  ),
};

export default function ToastContainer() {
  const insets = useSafeAreaInsets();
  
  return (
    <Toast 
      config={toastConfig}
      topOffset={insets.top + 10}
    />
  );
}

