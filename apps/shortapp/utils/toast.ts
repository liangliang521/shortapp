// Toast 工具 - 显示轻量级提示信息

import Toast from 'react-native-toast-message';

interface ToastOptions {
  duration?: number;
}

class ToastService {
  /**
   * 显示成功提示
   */
  success(message: string, title?: string, options?: ToastOptions): void {
    Toast.show({
      type: 'success',
      text1: title || 'Success',
      text2: message,
      visibilityTime: options?.duration || 3000,
      position: 'top',
    });
  }

  /**
   * 显示错误提示
   */
  error(message: string, title?: string, options?: ToastOptions): void {
    Toast.show({
      type: 'error',
      text1: title || 'Error',
      text2: message,
      visibilityTime: options?.duration || 4000,
      position: 'top',
    });
  }

  /**
   * 显示信息提示
   */
  info(message: string, title?: string, options?: ToastOptions): void {
    Toast.show({
      type: 'info',
      text1: title || 'Info',
      text2: message,
      visibilityTime: options?.duration || 3000,
      position: 'top',
    });
  }

  /**
   * 显示警告提示
   */
  warning(message: string, title?: string, options?: ToastOptions): void {
    Toast.show({
      type: 'error', // react-native-toast-message 默认只有 success, error, info
      text1: title || 'Warning',
      text2: message,
      visibilityTime: options?.duration || 3000,
      position: 'top',
    });
  }

  /**
   * 隐藏所有 toast
   */
  hide(): void {
    Toast.hide();
  }
}

export const toast = new ToastService();

