import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { Project } from '@vibecoding/api-client/src/types';
import { httpClient } from '@vibecoding/api-client';

interface UseProjectActionsReturn {
    selectedProject: Project | null;
    actionSheetVisible: boolean;
    showActionSheet: (project: Project) => void;
    hideActionSheet: () => void;
    handleRename: (projectId: string, newName: string) => Promise<void>;
    handleDelete: (projectId: string) => Promise<void>;
    handleTogglePublic: (projectId: string, isPublic: boolean) => Promise<void>;
    handleCategoryChange: (projectId: string, categoryKey: string) => Promise<void>;
}

export function useProjectActions(): UseProjectActionsReturn {
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [actionSheetVisible, setActionSheetVisible] = useState(false);

    const showActionSheet = useCallback((project: Project) => {
        setSelectedProject(project);
        setActionSheetVisible(true);
    }, []);

    const hideActionSheet = useCallback(() => {
        setActionSheetVisible(false);
        setSelectedProject(null);
    }, []);

    const handleRename = useCallback(async (projectId: string, newName: string) => {
        try {
            console.log('\n╔════════════════════════════════════════╗');
            console.log('║  🔄 [useProjectActions] RENAMING      ║');
            console.log('╚════════════════════════════════════════╝');
            console.log('🔄 [useProjectActions] Project ID:', projectId);
            console.log('🔄 [useProjectActions] New name:', newName);

            const response = await httpClient.renameProject(projectId, newName);

            console.log('📨 [useProjectActions] Response code:', response.code);
            console.log('📨 [useProjectActions] Response info:', response.info);
            console.log('📨 [useProjectActions] Response data:', response.data);

            if (response.code === 0) {
                console.log('✅ [useProjectActions] Project renamed successfully');
                console.log('========================================\n');
                // 这里可以触发项目列表刷新
                // 或者更新本地状态
            } else {
                console.error('❌ [useProjectActions] Server returned error code:', response.code);
                console.error('❌ [useProjectActions] Error message:', response.info);
                throw new Error(response.info || 'Failed to rename project');
            }
        } catch (error) {
            console.error('\n❌❌❌ [useProjectActions] RENAME FAILED ❌❌❌');
            console.error('❌ [useProjectActions] Error:', error);
            console.error('❌ [useProjectActions] Error type:', typeof error);
            console.error('❌ [useProjectActions] Error message:', error instanceof Error ? error.message : 'Unknown');
            console.error('========================================\n');
            
            const errorMessage = error instanceof Error ? error.message : 'Failed to rename project. Please try again.';
            Alert.alert('Error', errorMessage);
            throw error;
        }
    }, []);

    const handleDelete = useCallback(async (projectId: string) => {
        try {
            console.log('🗑️ [useProjectActions] Deleting project:', projectId);

            const response = await httpClient.deleteProject(projectId);

            if (response.code === 0) {
                console.log('✅ [useProjectActions] Project deleted successfully');
                // 这里可以触发项目列表刷新
                // 或者从本地状态中移除项目
            } else {
                throw new Error(response.info || 'Failed to delete project');
            }
        } catch (error) {
            console.error('❌ [useProjectActions] Error deleting project:', error);
            Alert.alert('Error', 'Failed to delete project. Please try again.');
            throw error;
        }
    }, []);

    const handleTogglePublic = useCallback(async (projectId: string, isPublic: boolean) => {
        try {
            console.log('\n╔════════════════════════════════════════╗');
            console.log('║  🔄 [useProjectActions] TOGGLE PUBLIC  ║');
            console.log('╚════════════════════════════════════════╝');
            console.log('🔄 [useProjectActions] Project ID:', projectId);
            console.log('🔄 [useProjectActions] New isPublic:', isPublic);

            const response = await httpClient.configureMiniapp(projectId, { isPublic });

            console.log('📨 [useProjectActions] Response code:', response.code);
            console.log('📨 [useProjectActions] Response info:', response.info);
            console.log('📨 [useProjectActions] Response data:', response.data);

            if (response.code === 0) {
                console.log('✅ [useProjectActions] Project visibility updated successfully');
                console.log('========================================\n');
                // 更新本地 selectedProject 的 isPublic
                if (selectedProject && selectedProject.project_id === projectId) {
                    const updatedProject = {
                        ...selectedProject,
                        app: selectedProject.app ? {
                            ...selectedProject.app,
                            isPublic: isPublic,
                        } : {
                            // 如果 app 不存在，创建一个最小化的 app 对象
                            name: selectedProject.name,
                            description: '',
                            category: selectedProject.category || '',
                            language: '',
                            ageRating: {
                                global: '',
                                brazil: '',
                                korea: '',
                            },
                            isPublic: isPublic,
                            addCount: selectedProject.addCount || 0,
                        },
                        isPublic: isPublic, // 向后兼容
                    };
                    console.log('🔄 [useProjectActions] Updating selectedProject:', {
                        oldIsPublic: selectedProject.app?.isPublic ?? selectedProject.isPublic,
                        newIsPublic: updatedProject.app?.isPublic ?? updatedProject.isPublic,
                        hasApp: !!updatedProject.app,
                    });
                    setSelectedProject(updatedProject);
                }
            } else {
                console.error('❌ [useProjectActions] Server returned error code:', response.code);
                console.error('❌ [useProjectActions] Error message:', response.info);
                throw new Error(response.info || 'Failed to update project visibility');
            }
        } catch (error) {
            console.error('\n❌❌❌ [useProjectActions] TOGGLE PUBLIC FAILED ❌❌❌');
            console.error('❌ [useProjectActions] Error:', error);
            console.error('❌ [useProjectActions] Error type:', typeof error);
            console.error('❌ [useProjectActions] Error message:', error instanceof Error ? error.message : 'Unknown');
            console.error('========================================\n');
            
            const errorMessage = error instanceof Error ? error.message : 'Failed to update project visibility. Please try again.';
            Alert.alert('Error', errorMessage);
            throw error;
        }
    }, [selectedProject]);

    const handleCategoryChange = useCallback(async (projectId: string, categoryKey: string) => {
        try {
            console.log('\n╔════════════════════════════════════════╗');
            console.log('║  🔄 [useProjectActions] CHANGE CATEGORY ║');
            console.log('╚════════════════════════════════════════╝');
            console.log('🔄 [useProjectActions] Project ID:', projectId);
            console.log('🔄 [useProjectActions] New category:', categoryKey);

            const response = await httpClient.configureMiniapp(projectId, { category: categoryKey });

            console.log('📨 [useProjectActions] Response code:', response.code);
            console.log('📨 [useProjectActions] Response info:', response.info);
            console.log('📨 [useProjectActions] Response data:', response.data);

            if (response.code === 0) {
                console.log('✅ [useProjectActions] Project category updated successfully');
                console.log('========================================\n');
                // 更新本地 selectedProject 的 category
                if (selectedProject && selectedProject.project_id === projectId) {
                    setSelectedProject({
                        ...selectedProject,
                        app: selectedProject.app ? {
                            ...selectedProject.app,
                            category: categoryKey,
                        } : {
                            // 如果 app 不存在，创建一个最小化的 app 对象
                            name: selectedProject.name,
                            description: '',
                            category: categoryKey,
                            language: '',
                            ageRating: {
                                global: '',
                                brazil: '',
                                korea: '',
                            },
                            isPublic: selectedProject.isPublic ?? false,
                            addCount: 0,
                        },
                        category: categoryKey, // 向后兼容
                    });
                }
            } else {
                console.error('❌ [useProjectActions] Server returned error code:', response.code);
                console.error('❌ [useProjectActions] Error message:', response.info);
                throw new Error(response.info || 'Failed to update project category');
            }
        } catch (error) {
            console.error('\n❌❌❌ [useProjectActions] CHANGE CATEGORY FAILED ❌❌❌');
            console.error('❌ [useProjectActions] Error:', error);
            console.error('❌ [useProjectActions] Error type:', typeof error);
            console.error('❌ [useProjectActions] Error message:', error instanceof Error ? error.message : 'Unknown');
            console.error('========================================\n');
            
            const errorMessage = error instanceof Error ? error.message : 'Failed to update project category. Please try again.';
            Alert.alert('Error', errorMessage);
            throw error;
        }
    }, [selectedProject]);

    return {
        selectedProject,
        actionSheetVisible,
        showActionSheet,
        hideActionSheet,
        handleRename,
        handleDelete,
        handleTogglePublic,
        handleCategoryChange,
    };
}
