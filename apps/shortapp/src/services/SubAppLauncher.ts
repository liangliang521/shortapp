/**
 * SubApp Launcher - 用于全屏启动子 App
 * 
 * 使用 ExpoReactNativeFactory 实现，参考 Expo Go 的设计
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { normalizeExpUrlToHttp } from '../utils/url';

const { SubAppLauncher } = NativeModules;
const subAppLauncherEmitter = new NativeEventEmitter(SubAppLauncher);

export interface LoadingProgress {
  status: string;
  done: number;
  total: number;
  progress: number; // 0.0 - 1.0
}

interface SubAppLauncherInterface {
  /**
   * 全屏打开子 App（从 manifest URL）
   * @param manifestUrl - Manifest JSON URL
   * @param moduleName - 模块名（必须在 bundle 中注册）
   * @param initialProps - 初始属性
   */
  openSubApp(
    manifestUrl: string,
    moduleName: string,
    initialProps?: Record<string, any>
  ): Promise<void>;
  
  /**
   * 重新加载子 App（重新下载 manifest、bundle 和 assets）
   */
  reloadSubApp(): Promise<void>;
  
  /**
   * 检查更新（比较当前 manifest 与远程 manifest）
   */
  checkForUpdate(): Promise<void>;
  
  /**
   * 关闭当前子 App，返回宿主 App
   */
  closeSubApp(): void;
  
  /**
   * 监听加载进度（总体进度）
   */
  addProgressListener(callback: (progress: LoadingProgress) => void): () => void;
  
  /**
   * 监听 Manifest 下载进度
   */
  addManifestProgressListener(callback: (progress: LoadingProgress) => void): () => void;
  
  /**
   * 监听 Bundle 下载进度
   */
  addBundleProgressListener(callback: (progress: LoadingProgress) => void): () => void;
  
  /**
   * 监听 Assets 下载进度
   */
  addAssetsProgressListener(callback: (progress: LoadingProgress) => void): () => void;
  
  /**
   * 监听子 App 就绪事件
   */
  addSubAppReadyListener(callback: () => void): () => void;
  
  /**
   * 监听更新检测事件
   */
  addUpdateDetectedListener(callback: (data: { hasUpdate: boolean; manifest: any; manifestId: string }) => void): () => void;
  
  /**
   * 监听子 App 错误事件（来自原生错误处理器）
   */
  addSubAppErrorListener(callback: (errorData: { message: string; isFatal: boolean }) => void): () => void;
}

export const SubAppLauncherService: SubAppLauncherInterface = {
  openSubApp: async (manifestUrl: string, moduleName: string, initialProps?: Record<string, any>) => {
    if (!SubAppLauncher) {
      throw new Error('SubAppLauncher native module is not available');
    }
    
    const normalizedUrl = normalizeExpUrlToHttp(manifestUrl);

    // Pre-flight check to avoid native fatal when manifest 返回非200
    try {
      const res = await fetch(normalizedUrl, { method: 'HEAD' });
      if (!res.ok) {
        throw new Error(`Manifest unreachable: ${res.status} ${res.statusText}`);
      }
    } catch (e) {
      throw new Error(`Manifest preflight failed: ${(e as Error).message}`);
    }

    if (Platform.OS === 'ios') {
      return SubAppLauncher.openSubApp(normalizedUrl, moduleName, initialProps || {});
    } else {
      throw new Error('Android support coming soon');
    }
  },
  
  reloadSubApp: async () => {
    if (!SubAppLauncher) {
      throw new Error('SubAppLauncher native module is not available');
    }
    
    if (Platform.OS === 'ios') {
      return SubAppLauncher.reloadSubApp();
    } else {
      throw new Error('Android support coming soon');
    }
  },
  
  checkForUpdate: async () => {
    if (!SubAppLauncher) {
      throw new Error('SubAppLauncher native module is not available');
    }
    
    if (Platform.OS === 'ios') {
      return SubAppLauncher.checkForUpdate();
    } else {
      throw new Error('Android support coming soon');
    }
  },
  
  closeSubApp: () => {
    if (!SubAppLauncher) {
      console.warn('SubAppLauncher native module is not available');
      return;
    }
    
    if (Platform.OS === 'ios') {
      SubAppLauncher.closeSubApp();
    }
  },
  
  addProgressListener: (callback: (progress: LoadingProgress) => void) => {
    if (!SubAppLauncher) {
      return () => {};
    }
    
    const subscription = subAppLauncherEmitter.addListener('onLoadingProgress', callback);
    return () => subscription.remove();
  },
  
  addManifestProgressListener: (callback: (progress: LoadingProgress) => void) => {
    if (!SubAppLauncher) {
      return () => {};
    }
    
    const subscription = subAppLauncherEmitter.addListener('onManifestProgress', callback);
    return () => subscription.remove();
  },
  
  addBundleProgressListener: (callback: (progress: LoadingProgress) => void) => {
    if (!SubAppLauncher) {
      return () => {};
    }
    
    const subscription = subAppLauncherEmitter.addListener('onBundleProgress', callback);
    return () => subscription.remove();
  },
  
  addAssetsProgressListener: (callback: (progress: LoadingProgress) => void) => {
    if (!SubAppLauncher) {
      return () => {};
    }
    
    const subscription = subAppLauncherEmitter.addListener('onAssetsProgress', callback);
    return () => subscription.remove();
  },
  
  addSubAppReadyListener: (callback: () => void) => {
    if (!SubAppLauncher) {
      return () => {};
    }
    
    const subscription = subAppLauncherEmitter.addListener('onSubAppReady', callback);
    return () => subscription.remove();
  },
  
  addUpdateDetectedListener: (callback: (data: { hasUpdate: boolean; manifest: any; manifestId: string }) => void) => {
    if (!SubAppLauncher) {
      return () => {};
    }
    
    const subscription = subAppLauncherEmitter.addListener('onUpdateDetected', callback);
    return () => subscription.remove();
  },
  
  addSubAppErrorListener: (callback: (errorData: { message: string; isFatal: boolean }) => void) => {
    if (!SubAppLauncher) {
      return () => {};
    }
    
    const subscription = subAppLauncherEmitter.addListener('onSubAppError', callback);
    return () => subscription.remove();
  },
};

export default SubAppLauncherService;

