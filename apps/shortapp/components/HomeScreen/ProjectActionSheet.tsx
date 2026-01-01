import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Share } from 'react-native';
import Icon from '../icons/SvgIcons';
import { Project, Category } from '@vibecoding/api-client/src/types';
import { httpClient } from '@vibecoding/api-client';
import CategoryModal from './CategoryModal';
import { ensurePublishedAndShare, getShareUrl } from '../../utils/shareUtils';

interface ProjectActionSheetProps {
  visible: boolean;
  project: Project | null;
  onClose: () => void;
  onRename: (projectId: string, newName: string) => void;
  onDelete: (projectId: string) => void;
  onTogglePublic?: (projectId: string, isPublic: boolean) => void; // 可选，只在需要的地方使用
  onCategoryChange?: (projectId: string, categoryKey: string) => void; // 可选，只在需要的地方使用
  currentUserId?: string | null;
}

interface ActionItem {
  id: string;
  title: string;
  icon: string; // SVG icon name
  color?: string;
  onPress: () => void;
}

export default function ProjectActionSheet({ 
  visible, 
  project, 
  onClose, 
  onRename, 
  onDelete,
  onTogglePublic,
  onCategoryChange,
  currentUserId,
}: ProjectActionSheetProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await httpClient.getCategorys();
      if (response.code === 0 && response.data) {
        setCategories(response.data);
      } else {
        console.error('Failed to load categories:', response.info);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  // 获取分类列表
  useEffect(() => {
    if (visible && onCategoryChange) {
      loadCategories();
    }
  }, [visible, onCategoryChange]);

  // 计算当前的 isPublic 和 category 值，用于依赖项
  // 使用 useMemo 确保在 project 改变时重新计算
  // 注意：依赖 project 对象本身，React 会比较对象引用
  const currentIsPublic = useMemo(() => {
    if (!project) return false;
    const value = project.app?.isPublic ?? project.isPublic ?? false;
    console.log('🔍 [ProjectActionSheet] currentIsPublic calculated:', {
      value,
      projectAppIsPublic: project.app?.isPublic,
      projectIsPublic: project.isPublic,
      hasProject: !!project,
      hasApp: !!project.app,
      projectId: project.project_id,
    });
    return value;
  }, [project]);

  const isOwnProject = useMemo(() => {
    if (!project || !currentUserId) return true; // 默认视为自己的
    return project.user_id === currentUserId;
  }, [project, currentUserId]);
  
  const currentCategory = useMemo(() => {
    if (!project) return null;
    return project.app?.category || project.category || null;
  }, [project]);
      
  // 获取当前分类名称
  const getCurrentCategoryName = useCallback((): string => {
    if (!project || !currentCategory) {
      console.log('🔍 [ProjectActionSheet] getCurrentCategoryName: project is null or no category');
      return 'None';
    }
    
    console.log('🔍 [ProjectActionSheet] getCurrentCategoryName:', {
      projectCategory: currentCategory,
      appCategory: project.app?.category,
      legacyCategory: project.category,
      categoriesLength: categories.length,
      loadingCategories,
      categories: categories.map(c => ({ key: c.key, name: c.name })),
      });
    
    // 如果分类列表还没加载完成，显示原始值
    if (categories.length === 0 && loadingCategories) {
      console.log('🔍 [ProjectActionSheet] Categories still loading, returning:', currentCategory || 'None');
      return currentCategory || 'None';
    }
    
    // 查找匹配的分类
    const category = categories.find(cat => cat.key === currentCategory);
    
    // 调试日志
    if (!category && currentCategory) {
      console.log('🔍 [ProjectActionSheet] Category not found:', {
        projectCategory: currentCategory,
        availableCategories: categories.map(c => ({ key: c.key, name: c.name })),
      });
    }
    
    const result = category ? category.name : (currentCategory || 'None');
    console.log('🔍 [ProjectActionSheet] getCurrentCategoryName result:', result);
    return result;
  }, [project, currentCategory, categories, loadingCategories]);

  // 使用 useMemo 确保在 categories 更新时重新计算 actions
  const actions: ActionItem[] = useMemo(() => {
    if (!project) return [];
    
    return [
      {
        id: 'rename',
        title: 'Rename',
        icon: 'Create',
        onPress: () => {
    Alert.prompt(
      'Rename Project',
      'Enter new project name:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Rename',
          onPress: (newName: string | undefined) => {
            if (newName && newName.trim()) {
              onRename(project.project_id, newName.trim());
            }
          },
        },
      ],
      'plain-text',
      project.name
    );
        },
      },
      ...(onTogglePublic ? [{
        id: 'togglePublic',
        title: currentIsPublic ? 'Published' : 'Publish',
        icon: 'Eye',
        onPress: () => {
          if (!onTogglePublic) return;
          if (currentIsPublic) {
            return; // 已发布，不支持反向操作
          }
          const newIsPublic = true;
          Alert.alert(
            'Publish Project',
            'Do you want to publish this project?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Confirm',
                onPress: () => {
                  onTogglePublic(project.project_id, newIsPublic);
                },
              },
            ]
          );
        },
      }] : []),
      ...(onCategoryChange ? [{
        id: 'category',
        title: `Category: ${getCurrentCategoryName()}`,
        icon: 'Tag',
        onPress: () => {
          if (!onCategoryChange) return;
          setShowCategoryModal(true);
        },
      }] : []),
      {
        id: 'share',
        title: 'Share',
        icon: 'Share',
        onPress: async () => {
          try {
            await ensurePublishedAndShare({
              project,
              isPublic: currentIsPublic,
              currentUserId: currentUserId ?? undefined,
              publish: onTogglePublic
                ? () => Promise.resolve(onTogglePublic(project.project_id, true))
                : undefined,
              onClose,
            });
          } catch (error) {
            console.error('❌ [ProjectActionSheet] Error sharing project:', error);
            Alert.alert('Error', 'Failed to share project');
            onClose();
          }
        },
      },
      {
        id: 'download',
        title: 'Download Code',
        icon: 'Download',
        onPress: async () => {
          try {
            const downloadUrl = `https://api.vibecode.app/projects/${project.project_id}/download`;
            const fileName = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${project.project_id}.zip`;
            await Share.share({
              url: downloadUrl,
              title: `Download ${fileName}`,
              message: `Download project code: ${downloadUrl}`,
            });
          } catch (error) {
            console.error('Error sharing download link:', error);
            Alert.alert('Error', 'Failed to share download link');
          }
        },
      },
      {
        id: 'delete',
        title: 'Delete',
        icon: 'Trash',
        color: '#FF3B30',
        onPress: () => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${project.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(project.project_id),
        },
      ]
    );
        },
      },
    ];
  }, [project, currentIsPublic, currentCategory, categories, loadingCategories, onTogglePublic, onCategoryChange, onRename, onDelete, onClose, getCurrentCategoryName, setShowCategoryModal]);

  // 添加调试日志，监控 project 和 actions 的变化
  useEffect(() => {
    if (project) {
      console.log('🔍 [ProjectActionSheet] Project prop changed:', {
        projectId: project.project_id,
        projectAppIsPublic: project.app?.isPublic,
        projectIsPublic: project.isPublic,
        currentIsPublic,
        hasApp: !!project.app,
      });
    }
  }, [project, currentIsPublic]);

  useEffect(() => {
    if (project && actions.length > 0) {
      const togglePublicAction = actions.find(a => a.id === 'togglePublic');
      if (togglePublicAction) {
        console.log('🔍 [ProjectActionSheet] Actions updated - togglePublic:', {
          title: togglePublicAction.title,
          icon: togglePublicAction.icon,
          projectAppIsPublic: project.app?.isPublic,
          projectIsPublic: project.isPublic,
          currentIsPublic,
        });
      }
    }
  }, [project, actions, currentIsPublic]);

  if (!project) return null;

  const handleCategoryChange = async (categoryKey: string) => {
    if (!onCategoryChange || !project) return;
    try {
      console.log('🔄 [ProjectActionSheet] handleCategoryChange called with:', categoryKey);
      await onCategoryChange(project.project_id, categoryKey);
      console.log('✅ [ProjectActionSheet] Category change successful, project.category should be updated');
      // 分类更新成功后，关闭分类选择模态框
      // selectedProject 会在 useProjectActions 中更新，从而更新 project prop
      setShowCategoryModal(false);
      // 不关闭主弹窗，让用户看到更新后的分类名称
    } catch (error) {
      // 错误已在 useProjectActions 中处理
      console.error('❌ [ProjectActionSheet] Error changing category:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.container}>
          {/* Project Info Card */}
          <View style={styles.projectCard}>
            <View style={styles.projectIconContainer}>
              <View style={[styles.projectIcon, { backgroundColor: getTypeColor(project.type) }]}>
                <Text style={styles.projectIconText}>
                  {project.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
            
            <View style={styles.projectInfo}>
              <Text style={styles.projectTitle}>{project.name}</Text>
              <Text style={styles.projectSubtitle}>{formatTimeAgo(project.created_at)}</Text>
              {project.status === 'BUILDING' && (
                <>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: '60%' }]} />
                  </View>
                  <Text style={styles.progressText}>Loading in approximately 19 seconds...</Text>
                </>
              )}
            </View>
            
            <View style={styles.projectStatus}>
              {getStatusIcon(getProjectStatus(project))}
            </View>
          </View>

          {/* Action Sheet */}
          <View style={styles.actionSheet}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionItem,
                  index === actions.length - 1 && styles.lastActionItem
                ]}
                onPress={() => {
                  action.onPress();
                  // 只有非分享、非切换公开、非分类选择操作才立即关闭浮窗
                  // 分享操作会在完成后自己关闭
                  // 切换公开操作会在确认后关闭
                  // 分类选择操作会在选择后关闭
                  if (action.id !== 'share' && action.id !== 'togglePublic' && action.id !== 'category') {
                    onClose();
                  }
                }}
              >
                <Text style={[styles.actionText, action.color && { color: action.color }]}>
                  {action.title}
                </Text>
                <Icon 
                  name={action.icon} 
                  size={20} 
                  color={action.color || '#000000'} 
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>

      {/* Category Selection Modal */}
      {onCategoryChange && project && (
        <CategoryModal
          visible={showCategoryModal}
          selectedCategoryKey={project.app?.category || project.category || null}
          categories={categories}
          onClose={() => setShowCategoryModal(false)}
          onCategorySelect={handleCategoryChange}
        />
      )}
    </Modal>
  );
}

// Helper functions (moved from ProjectCard)
const getProjectStatus = (project: Project): 'completed' | 'building' | 'failed' => {
  if (project.status === 'ACTIVE' && project.sandbox_status === 'ACTIVE') {
    return 'completed';
  } else if (project.status === 'BUILDING' || project.sandbox_status === 'BUILDING') {
    return 'building';
  } else {
    return 'failed';
  }
};

const getStatusIcon = (status: 'completed' | 'building' | 'failed') => {
  switch (status) {
    case 'completed':
      return <Icon name="CheckmarkCircle" size={24} color="#34C759" />;
    case 'building':
      return <Icon name="Time" size={24} color="#FF9500" />;
    case 'failed':
      return <Icon name="CloseCircle" size={24} color="#FF3B30" />;
    default:
      return null;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Utility':
      return '#FF6B9D';
    case 'Productivity':
      return '#4ECDC4';
    case 'Widget':
      return '#45B7D1';
    default:
      return '#FF6B9D';
  }
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: 'transparent',
    width: '100%',
    maxWidth: 400,
  },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 0,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  projectIconContainer: {
    marginRight: 16,
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  projectInfo: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  projectSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF9500',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#FF9500',
  },
  projectStatus: {
    marginLeft: 16,
  },
  actionSheet: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  lastActionItem: {
    borderBottomWidth: 0,
  },
  actionText: {
    fontSize: 16,
    color: '#000000',
  },
});
