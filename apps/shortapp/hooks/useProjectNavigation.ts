/**
 * useProjectNavigation - 处理项目卡片点击导航的 Hook
 * 功能：
 * 1. 判断是否是自己的项目
 * 2. 判断项目状态是否正常（ACTIVE）
 * 3. 如果状态不正常，启动沙盒并轮询状态
 * 4. 提供进度值给外部UI渲染进度条
 * 5. 60秒超时，每1秒检查一次状态
 */

import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Project } from '@vibecoding/api-client/src/types';
import { httpClient } from '@vibecoding/api-client';
import { useAuth } from './useAuth';

interface UseProjectNavigationReturn {
  /**
   * 处理项目卡片点击
   * @param project 项目对象
   * @param isOwnProject 是否是自己的项目（可选，如果不提供则通过尝试启动来判断）
   */
  handleProjectPress: (project: Project, isOwnProject?: boolean) => Promise<void>;
  
  /**
   * 进度值（0-1），用于渲染进度条
   */
  progress: number;
  
  /**
   * 是否正在处理中（启动沙盒或轮询状态）
   */
  isProcessing: boolean;
}

const MAX_WAIT_TIME = 60000; // 60秒
const POLL_INTERVAL = 1000; // 1秒
const PROGRESS_UPDATE_INTERVAL = 100; // 进度更新间隔（100ms，让进度条更流畅）

/**
 * 获取项目状态
 */
const getProjectStatus = (project: Project): 'completed' | 'building' | 'failed' => {
  if (project.status === 'ACTIVE' && project.sandbox_status === 'ACTIVE') {
    return 'completed';
  } else if (project.status === 'BUILDING' || project.sandbox_status === 'BUILDING') {
    return 'building';
  } else {
    return 'failed';
  }
};

export function useProjectNavigation(): UseProjectNavigationReturn {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  /**
   * 清理所有定时器
   */
  const clearAllTimers = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  /**
   * 启动进度条（假进度，60秒）
   */
  const startProgress = useCallback(() => {
    setProgress(0);
    startTimeRef.current = Date.now();
    
    // 清理之前的定时器
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }
    
    // 每100ms更新一次进度，让进度条更流畅
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min(elapsed / MAX_WAIT_TIME, 0.95); // 最多到95%，等待实际完成
      setProgress(newProgress);
    }, PROGRESS_UPDATE_INTERVAL);
  }, []);

  /**
   * 停止进度条
   */
  const stopProgress = useCallback(() => {
    clearAllTimers();
    setProgress(0);
    setIsProcessing(false);
  }, [clearAllTimers]);

  /**
   * 判断是否是自己的项目
   * 通过尝试启动项目来判断：如果启动成功或返回权限错误，说明是自己的项目
   * 如果返回其他错误，可能不是自己的项目
   */
  const checkIsOwnProject = useCallback(async (project: Project): Promise<boolean> => {
    try {
      const response = await httpClient.startProject(project.project_id);
      // 如果启动成功，说明是自己的项目
      if (response.code === 0) {
        return true;
      }
      // 如果是权限错误（401/403），说明不是自己的项目
      if (response.code === 401 || response.code === 403) {
        return false;
      }
      // 其他错误，假设是自己的项目（可能是其他原因导致的错误）
      return true;
    } catch (error) {
      console.error('❌ [useProjectNavigation] Error checking if own project:', error);
      // 出错时假设是自己的项目，继续尝试
      return true;
    }
  }, []);

  /**
   * 轮询项目状态
   */
  const pollProjectStatus = useCallback(async (
    projectId: string,
    onSuccess: () => void,
    onTimeout: () => void
  ): Promise<void> => {
    const startTime = Date.now();
    let pollCount = 0;

    const poll = async () => {
      const elapsed = Date.now() - startTime;
      
      // 超时检查
      if (elapsed >= MAX_WAIT_TIME) {
        clearAllTimers();
        setProgress(1); // 进度条到100%
        setTimeout(() => {
          stopProgress();
          onTimeout();
        }, 100);
        return;
      }

      try {
        const response = await httpClient.getProject(projectId);
        
        if (response.code === 0 && response.data) {
          const project = response.data;
          const status = getProjectStatus(project);
          
          // 检查状态是否为 completed（ACTIVE 且 sandbox_status 为 ACTIVE）
          if (status === 'completed') {
            console.log('✅ [useProjectNavigation] Project is now completed (ACTIVE)');
            clearAllTimers();
            setProgress(1); // 进度条到100%
            setTimeout(() => {
              stopProgress();
              onSuccess();
            }, 100);
            return;
          }
          
          // 如果状态是 failed，也继续轮询（可能正在恢复）
          pollCount++;
          console.log(`⏳ [useProjectNavigation] Polling... (${pollCount}, status: ${status}, project.status: ${project.status}, sandbox_status: ${project.sandbox_status || 'unknown'})`);
        } else {
          pollCount++;
          console.log(`⏳ [useProjectNavigation] Polling... (${pollCount}, API error: ${response.info || 'unknown'})`);
        }

        // 继续轮询
        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL);
      } catch (error) {
        console.error('❌ [useProjectNavigation] Error polling project status:', error);
        // 出错时继续轮询
        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL);
      }
    };

    // 开始轮询
    poll();
  }, [clearAllTimers, stopProgress]);

  /**
   * 显示重试弹窗
   */
  const showRetryAlert = useCallback((project: Project, onRetry: () => void) => {
    Alert.alert(
      'Project Not Ready',
      'The project is not ready yet. Would you like to try again?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            stopProgress();
          },
        },
        {
          text: 'Retry',
          onPress: onRetry,
        },
      ]
    );
  }, [stopProgress]);

  /**
   * 处理项目卡片点击
   */
  const handleProjectPress = useCallback(async (
    project: Project,
    isOwnProject?: boolean
  ): Promise<void> => {
    console.log('🔍 [useProjectNavigation] handleProjectPress:', {
      project_id: project.project_id,
      name: project.name,
      status: project.status,
      sandbox_status: project.sandbox_status,
      projectStatus: getProjectStatus(project),
      isOwnProject,
    });

    // 如果状态是 completed（ACTIVE 且 sandbox_status 为 ACTIVE），直接跳转
    const projectStatus = getProjectStatus(project);
    if (projectStatus === 'completed') {
      console.log('✅ [useProjectNavigation] Project is completed, navigating directly');
      (navigation as any).navigate('ProjectWebView', { project });
      return;
    }

    // 判断是否是自己的项目
    let ownProject = isOwnProject;
    if (ownProject === undefined) {
      console.log('🔍 [useProjectNavigation] Checking if own project...');
      ownProject = await checkIsOwnProject(project);
      console.log('🔍 [useProjectNavigation] Is own project:', ownProject);
    }

    // 如果不是自己的项目，直接跳转（别人的项目我们无法启动，但可能可以查看）
    if (!ownProject) {
      console.log('ℹ️ [useProjectNavigation] Not own project, navigating directly');
      (navigation as any).navigate('ProjectWebView', { project });
      return;
    }

    // 是自己的项目但状态不是 ACTIVE，需要启动沙盒并轮询
    console.log('🚀 [useProjectNavigation] Starting sandbox and polling status...');
    setIsProcessing(true);
    startProgress();

    try {
      // 启动项目
      const startResponse = await httpClient.startProject(project.project_id);
      
      if (startResponse.code !== 0) {
        console.error('❌ [useProjectNavigation] Failed to start project:', startResponse.info);
        stopProgress();
        showRetryAlert(project, () => handleProjectPress(project, true));
        return;
      }

      console.log('✅ [useProjectNavigation] Project started, polling status...');

      // 开始轮询状态
      pollProjectStatus(
        project.project_id,
        () => {
          // 成功：状态变为 ACTIVE，跳转
          console.log('✅ [useProjectNavigation] Project is ready, navigating...');
          // 重新获取项目详情以确保数据是最新的
          httpClient.getProject(project.project_id).then((response) => {
            if (response.code === 0 && response.data) {
              (navigation as any).navigate('ProjectWebView', { project: response.data });
            } else {
              // 如果获取失败，使用原始项目数据跳转
              (navigation as any).navigate('ProjectWebView', { project });
            }
          }).catch(() => {
            // 如果获取失败，使用原始项目数据跳转
            (navigation as any).navigate('ProjectWebView', { project });
          });
        },
        () => {
          // 超时：显示重试弹窗
          console.log('⏰ [useProjectNavigation] Timeout waiting for project to be ready');
          showRetryAlert(project, () => handleProjectPress(project, true));
        }
      );
    } catch (error) {
      console.error('❌ [useProjectNavigation] Error starting project:', error);
      stopProgress();
      showRetryAlert(project, () => handleProjectPress(project, true));
    }
  }, [
    navigation,
    checkIsOwnProject,
    startProgress,
    stopProgress,
    pollProjectStatus,
    showRetryAlert,
  ]);

  return {
    handleProjectPress,
    progress,
    isProcessing,
  };
}

