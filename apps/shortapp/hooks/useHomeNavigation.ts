import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import { useAuth } from './useAuth';
import { Project } from '@vibecoding/api-client/src/types';
import { SharedDataService } from '../services/SharedDataService';

interface UseHomeNavigationReturn {
  handleAddProject: () => void;
  handleOpenSettings: () => void;
  handleOpenProjectPreview: (project: Project) => void;
}

export function useHomeNavigation(): UseHomeNavigationReturn {
  const navigation = useNavigation();
  const { isAuthenticated, user, accessToken, loginType } = useAuth();

  const handleAddProject = useCallback(() => {
    console.log('🔍 [useHomeNavigation] handleAddProject - isAuthenticated:', isAuthenticated);
    if (!isAuthenticated) {
      console.log('🔍 [useHomeNavigation] User not authenticated, redirecting to login');
      (navigation as any).navigate('Login', { redirectTo: 'AiChat' });
      return;
    }
    console.log('🔍 [useHomeNavigation] User authenticated, navigating to ai-chat');
    (navigation as any).navigate('AiChat');
  }, [isAuthenticated, navigation]);

  const handleOpenSettings = useCallback(() => {
    console.log('🔍 [useHomeNavigation] handleOpenSettings - isAuthenticated:', isAuthenticated);
    
    if (!isAuthenticated) {
      console.log('🔍 [useHomeNavigation] User not authenticated, redirecting to login');
      (navigation as any).navigate('Login', { redirectTo: 'MainTabs', screen: 'SettingsTab' });
      return;
    }
    console.log('🔍 [useHomeNavigation] User authenticated, navigating to settings tab');
    (navigation as any).navigate('MainTabs', { screen: 'SettingsTab' });
  }, [isAuthenticated, navigation]);

  const handleOpenProjectPreview = useCallback(async (project: Project) => {
    if (!isAuthenticated || !user || !accessToken) {
      // TODO: Implement login navigation
      // navigation.navigate('Login' as never, {
      //   redirectTo: `/project-loading?projectId=${project.project_id}&projectName=${project.name}`
      // });
      return;
    }

    try {
      // 优先使用 web_preview_url
      const previewUrl = project.startup_info?.web_preview_url || project.startup_info?.preview_url;

      if (!previewUrl) {
        Alert.alert('Error', 'Project preview URL not available');
        return;
      }

      console.log('🚀 Opening project:', project.name, 'URL:', previewUrl);

      // ✨ 关键步骤：在跳转前存储共享数据
      const success = await SharedDataService.setContext({
        // 项目信息
        projectId: project.project_id,
        projectName: project.name,
        projectUrl: previewUrl,

        // 用户信息
        userId: user.user_id,
        userName: user.name,
        userEmail: user.email,

        // 认证信息
        accessToken: accessToken,
        loginType: loginType as 'google' | 'apple' | null,

        // 时间戳
        timestamp: Date.now(),
      });

      if (!success) {
        console.warn('⚠️ Failed to store shared context, but continuing...');
      }

      // 确保数据已写入（等待一小段时间）
      await new Promise(resolve => setTimeout(resolve, 100));

      // 跳转到内部 WebView 页面
      (navigation as any).navigate('ProjectWebView', { projectId: project.project_id });

      console.log('✅ Project opened in WebView');
    } catch (error) {
      console.error('❌ Failed to open project:', error);
      Alert.alert('Error', 'Failed to open project preview');
    }
  }, [isAuthenticated, user, accessToken, loginType, navigation]);

  return {
    handleAddProject,
    handleOpenSettings,
    handleOpenProjectPreview,
  };
}
