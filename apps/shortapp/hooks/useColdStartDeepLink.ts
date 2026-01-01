import { useEffect, useRef, useState, useCallback } from 'react';
import { SharedDataService, SharedAppContext } from '../services/SharedDataService';

interface UseColdStartDeepLinkOptions {
  /** 当检测到冷启动深链接时的回调 */
  onDeepLinkDetected?: (projectId: string) => void;
  /** 是否启用（默认true） */
  enabled?: boolean;
  /** 是否在检测后立即清除SharedContext（默认true） */
  clearAfterDetect?: boolean;
}

interface UseColdStartDeepLinkReturn {
  /** 待处理的 projectId */
  pendingProjectId: string | null;
  /** 是否正在检测中 */
  isChecking: boolean;
  /** 手动清除待处理的 projectId */
  clearPendingProjectId: () => void;
  /** 手动触发检测 */
  checkForDeepLink: () => Promise<void>;
}

/**
 * 处理冷启动时的深链接
 * 
 * 工作原理：
 * 1. 应用完全关闭时，通过深链接启动
 * 2. 原生层（EXKernelLinkingManager）提取 projectId 保存到 SharedContext
 * 3. RN 初始化完成后，此 hook 从 SharedContext 读取 projectId
 * 4. 触发导航到项目预览页面
 * 
 * @example
 * ```tsx
 * function HomeScreen() {
 *   const { pendingProjectId, clearPendingProjectId } = useColdStartDeepLink({
 *     onDeepLinkDetected: (projectId) => {
 *       console.log('Detected cold start deep link:', projectId);
 *     }
 *   });
 * 
 *   useEffect(() => {
 *     if (pendingProjectId && projects.length > 0) {
 *       // 导航到项目预览
 *       navigateToProject(pendingProjectId);
 *       clearPendingProjectId();
 *     }
 *   }, [pendingProjectId, projects]);
 * }
 * ```
 */
export function useColdStartDeepLink(
  options: UseColdStartDeepLinkOptions = {}
): UseColdStartDeepLinkReturn {
  const {
    onDeepLinkDetected,
    enabled = true,
    clearAfterDetect = true,
  } = options;

  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const hasCheckedRef = useRef(false);

  /**
   * 检查是否有冷启动深链接
   */
  const checkForDeepLink = useCallback(async () => {
    if (!enabled || hasCheckedRef.current) {
      return;
    }

    try {
      setIsChecking(true);
      console.log('🔗 [ColdStartDeepLink] Checking for cold start deep link...');

      const context: SharedAppContext | null = await SharedDataService.getContext();

      if (context?.projectId) {
        console.log('🔗 [ColdStartDeepLink] Found pending projectId:', context.projectId);
        console.log('🔗 [ColdStartDeepLink] Context details:', {
          projectId: context.projectId,
          projectName: context.projectName,
          timestamp: new Date(context.timestamp).toISOString(),
        });

        setPendingProjectId(context.projectId);
        onDeepLinkDetected?.(context.projectId);

        // 清除 SharedContext 避免重复处理
        if (clearAfterDetect) {
          console.log('🔗 [ColdStartDeepLink] Clearing SharedContext after detection');
          await SharedDataService.clearContext();
        }
      } else {
        console.log('🔗 [ColdStartDeepLink] No pending deep link found');
      }

      hasCheckedRef.current = true;
    } catch (error) {
      console.error('❌ [ColdStartDeepLink] Error checking for cold start deep link:', error);
    } finally {
      setIsChecking(false);
    }
  }, [enabled, onDeepLinkDetected, clearAfterDetect]);

  /**
   * 清除待处理的 projectId
   */
  const clearPendingProjectId = useCallback(() => {
    console.log('🔗 [ColdStartDeepLink] Clearing pending projectId');
    setPendingProjectId(null);
  }, []);

  /**
   * 组件挂载时检测一次
   */
  useEffect(() => {
    if (enabled && !hasCheckedRef.current) {
      // 延迟一小段时间，确保其他初始化完成
      const timer = setTimeout(() => {
        checkForDeepLink();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [enabled, checkForDeepLink]);

  return {
    pendingProjectId,
    isChecking,
    clearPendingProjectId,
    checkForDeepLink,
  };
}

