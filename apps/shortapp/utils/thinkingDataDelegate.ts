/**
 * 数数分析 SDK Delegate
 * 实现 AnalyticsAdapter 的 delegate 接口，连接到实际的数数 SDK
 */

import { AdapterDelegate } from '@vibecoding/analytics';
import TDAnalytics, { TDAutoTrackEventType } from 'react-native-thinking-data';

// 新版本直接导出 TDAnalytics 类
const ThinkingAnalytics = TDAnalytics;

export const createThinkingDataDelegate = (): AdapterDelegate => {
  return {
    initialize: async (config?: Record<string, any>) => {
      try {
        const { appId, serverUrl } = config || {};
        
        if (!appId || !serverUrl) {
          console.error('❌ [ThinkingData] Missing appId or serverUrl');
          return;
        }

        console.log('🔧 [ThinkingData] Initializing SDK...');
        console.log('📊 [ThinkingData] App ID:', appId);
        console.log('🌐 [ThinkingData] Server URL:', serverUrl);

        // 初始化数数 SDK - 新版本使用配置对象
        if (ThinkingAnalytics && typeof ThinkingAnalytics.init === 'function') {
          ThinkingAnalytics.init({
            appId: appId,  // 使用驼峰命名，符合 JS/TS 规范
            serverUrl: serverUrl,
            enableLog: __DEV__, // 开发环境开启日志
          });
          console.log('✅ [ThinkingData] SDK initialized successfully');

          // 启用自动追踪
          ThinkingAnalytics.enableAutoTrack(
            TDAutoTrackEventType.APP_START | 
            TDAutoTrackEventType.APP_END
          );
          
        } else {
          console.error('❌ [ThinkingData] SDK init method not found');
          console.error('Available methods:', Object.keys(ThinkingAnalytics || {}));
        }
      } catch (error) {
        console.error('❌ [ThinkingData] Initialization failed:', error);
        throw error;
      }
    },

    track: async (event: string, params?: Record<string, any>) => {
      try {
        console.log('📤 [ThinkingData] Tracking event:', event, params);
        
        // 调用数数 SDK 上报事件 - 不传 appId，使用默认实例
        if (ThinkingAnalytics && typeof ThinkingAnalytics.track === 'function') {
          ThinkingAnalytics.track({
            eventName: event,
            properties: params || {}
          });
          console.log('✅ [ThinkingData] Event tracked:', event);
          
          // 立即刷新缓存，确保事件上报
          if (typeof ThinkingAnalytics.flush === 'function') {
            ThinkingAnalytics.flush();
            console.log('🔄 [ThinkingData] Flushed to server');
          }
        } else {
          console.error('❌ [ThinkingData] track method not found');
        }
      } catch (error) {
        console.error('❌ [ThinkingData] Track failed:', event, error);
      }
    },

    setUserId: async (userId: string | null) => {
      try {
        if (userId && ThinkingAnalytics && typeof ThinkingAnalytics.login === 'function') {
          console.log('👤 [ThinkingData] Setting user ID:', userId);
          ThinkingAnalytics.login(userId);
          console.log('✅ [ThinkingData] User ID set');
        } else if (!userId && ThinkingAnalytics && typeof ThinkingAnalytics.logout === 'function') {
          console.log('👤 [ThinkingData] Logging out user');
          ThinkingAnalytics.logout();
          console.log('✅ [ThinkingData] User logged out');
        } else {
          console.error('❌ [ThinkingData] login/logout method not found');
        }
      } catch (error) {
        console.error('❌ [ThinkingData] setUserId failed:', error);
      }
    },

    setUserProperties: async (properties: Record<string, any>) => {
      try {
        console.log('📝 [ThinkingData] Setting user properties:', properties);
        if (ThinkingAnalytics && typeof ThinkingAnalytics.userSet === 'function') {
          ThinkingAnalytics.userSet(properties);
          console.log('✅ [ThinkingData] User properties set');
        } else {
          console.error('❌ [ThinkingData] userSet method not found');
        }
      } catch (error) {
        console.error('❌ [ThinkingData] setUserProperties failed:', error);
      }
    },
  };
};

