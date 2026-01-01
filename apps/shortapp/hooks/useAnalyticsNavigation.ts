/**
 * useAnalyticsNavigation - 带数据统计的导航 Hook
 * 包装 React Navigation 的 navigate 方法，在每次跳转时自动上报事件
 */

import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { analytics } from '@vibecoding/analytics';

export function useAnalyticsNavigation() {
  const navigation = useNavigation();

  const navigate = useCallback(
    (screen: string, params?: any) => {
      // 上报导航事件
      const eventParams: Record<string, any> = {
        screen_name: screen,
      };
      
      // 添加参数信息（如果有）
      if (params) {
        if (params.redirectTo) eventParams.redirectTo = params.redirectTo;
        if (params.screen) eventParams.screen = params.screen;
        if (params.project?.project_id) eventParams.project_id = params.project.project_id;
        if (params.project?.name) eventParams.project_name = params.project.name;
      }

      analytics.track('screen_view', eventParams).catch((error) => {
        console.error('❌ [useAnalyticsNavigation] Failed to track navigation:', error);
      });

      // 执行实际的导航
      (navigation as any).navigate(screen, params);
    },
    [navigation]
  );

  return {
    ...navigation,
    navigate,
  };
}

