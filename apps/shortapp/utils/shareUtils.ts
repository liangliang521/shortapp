import { Alert, Share } from 'react-native';
import { Project } from '@vibecoding/api-client/src/types';

export const getShareUrl = (project?: Project | null): string => {
  if (!project) return '';
  const previewUrl =
    project.startup_info?.web_preview_url ||
    project.startup_info?.preview_url ||
    '';
  if (!previewUrl) return '';
  // 全局替换 preview 为 clip，生成分享地址
  const shareUrl = previewUrl.replace(/preview/g, 'clip');
  console.log('🔗 [shareUtils] URL replacement:', {
    original: previewUrl,
    replaced: shareUrl,
  });
  return shareUrl;
};

type PublishAndShareParams = {
  project: Project;
  isPublic: boolean;
  publish?: () => Promise<void>; // 发布函数（可选，用于未发布时执行）
  onClose?: () => void; // 分享完成或提示后关闭弹窗
  titlePrefix?: string; // 自定义标题前缀
  currentUserId?: string | null; // 当前用户 ID，用于判断是否本人项目
};

/**
 * 如果已发布则直接分享；如果未发布，提示用户发布后分享。
 */
export const ensurePublishedAndShare = async ({
  project,
  isPublic,
  publish,
  onClose,
  titlePrefix = 'Check out my project',
  currentUserId,
}: PublishAndShareParams): Promise<void> => {
  const shareUrl = getShareUrl(project);
  if (!shareUrl) {
    Alert.alert(
      'Error',
      'Project preview URL is not available. Please make sure the project is active.',
    );
    return;
  }

  const doShare = async () => {
    const title = `${titlePrefix}: ${project.name}`;
    const message = `${title}\n${shareUrl}`;
    const result = await Share.share({
      title,
      message,
      url: shareUrl,
    });
    if (
      result.action === Share.sharedAction ||
      result.action === Share.dismissedAction
    ) {
      onClose?.();
    }
  };

  // 是否本人项目：如果无用户信息，默认视为本人项目（保持原逻辑）
  const isOwnProject = currentUserId ? project.user_id === currentUserId : true;

  // 非本人项目，直接分享，无需发布
  if (!isOwnProject) {
    await doShare();
    return;
  }

  if (isPublic) {
    await doShare();
    return;
  }

  if (!publish) {
    Alert.alert(
      'Publish Required',
      'Sharing requires the app to be published.',
    );
    return;
  }

  Alert.alert(
    'Publish Required',
    'Sharing requires the app to be published. Publish now and share?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Publish & Share',
        onPress: async () => {
          try {
            await publish();
            await doShare();
          } catch (error) {
            console.error('❌ [shareUtils] Error publishing/sharing project:', error);
            Alert.alert('Error', 'Failed to publish and share project. Please try again.');
          }
        },
      },
    ],
  );
};

