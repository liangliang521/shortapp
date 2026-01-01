
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProjects } from '../hooks/useProjects';
import { useProjectFilters } from '../hooks/useProjectFilters';
import { useHomeNavigation } from '../hooks/useHomeNavigation';
import { useProjectActions } from '../hooks/useProjectActions';
import { useColdStartDeepLink } from '../hooks/useColdStartDeepLink';
import { HomeHeader, SearchBar, ProjectList } from './HomeScreen/index';
import ProjectActionSheet from './HomeScreen/ProjectActionSheet';

interface HomeScreenProps {
  shouldRefresh?: boolean;
}

export default function HomeScreen({ shouldRefresh = false }: HomeScreenProps) {
  const { isAuthenticated } = useAuth();
  
  // 使用自定义hooks管理状态和逻辑
  const {
    projects,
    loading,
    refreshing,
    loadingMore,
    error,
    pagination,
    refresh,
    loadMore,
    fetchProjects,
  } = useProjects(isAuthenticated, shouldRefresh);

  const {
    searchText,
    sortOrder,
    filteredProjects,
    setSearchText,
    toggleSortOrder,
  } = useProjectFilters(projects);

  const {
    handleAddProject,
    handleOpenSettings,
    handleOpenProjectPreview,
  } = useHomeNavigation();

  const {
    selectedProject,
    actionSheetVisible,
    showActionSheet,
    hideActionSheet,
    handleRename,
    handleDelete,
  } = useProjectActions();

  // // 处理冷启动深链接
  // const { pendingProjectId, clearPendingProjectId } = useColdStartDeepLink({
  //   onDeepLinkDetected: (projectId) => {
  //     console.log('🔗 [HomeScreen] Cold start deep link detected:', projectId);
  //   },
  //   enabled: isAuthenticated, // 只有用户已登录时才处理
  // });

  // // 当检测到冷启动深链接且项目列表已加载时，自动导航
  // useEffect(() => {
  //   if (pendingProjectId && projects.length > 0 && !loading) {
  //     console.log('🔗 [HomeScreen] Processing cold start deep link for project:', pendingProjectId);
      
  //     // 查找对应的项目
  //     const project = projects.find(p => p.project_id === pendingProjectId);
      
  //     if (project) {
  //       console.log('✅ [HomeScreen] Found project, navigating to preview');
  //       // 延迟一小段时间，确保 UI 已经渲染
  //       setTimeout(() => {
  //         handleOpenProjectPreview(project);
  //         clearPendingProjectId();
  //       }, 300);
  //     } else {
  //       console.warn('⚠️ [HomeScreen] Project not found in list:', pendingProjectId);
  //       // 项目不在列表中，可能需要从API单独获取
  //       // TODO: 可以考虑调用 API 获取单个项目详情
  //       clearPendingProjectId();
  //     }
  //   }
  // }, [pendingProjectId, projects, loading, handleOpenProjectPreview, clearPendingProjectId]);

  // // 每次页面显示时刷新项目列表
  // useFocusEffect(
  //   useCallback(() => {
  //     const refreshProjects = async () => {
  //       if (!isAuthenticated) return;
        
  //       try {
  //         console.log('🔄 [HomeScreen] 页面显示，刷新项目列表...');
  //         await fetchProjects();
  //         console.log('✅ [HomeScreen] 项目列表已刷新');
  //       } catch (error) {
  //         console.error('❌ [HomeScreen] 刷新项目列表失败:', error);
  //         // 静默失败，不打扰用户
  //       }
  //     };

  //     refreshProjects();
  //   }, [isAuthenticated, fetchProjects])
  // );

  // 处理项目删除后的刷新
  const handleProjectDelete = async (projectId: string) => {
    try {
      await handleDelete(projectId);
      // 删除成功后刷新项目列表
      await fetchProjects();
    } catch (error) {
      // 错误已在useProjectActions中处理
    }
  };

  // 处理项目重命名后的刷新
  const handleProjectRename = async (projectId: string, newName: string) => {
    try {
      await handleRename(projectId, newName);
      // 重命名成功后刷新项目列表
      await fetchProjects();
    } catch (error) {
      // 错误已在useProjectActions中处理
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <HomeHeader 
        onAddProject={handleAddProject}
        onOpenSettings={handleOpenSettings}
      />
      
      <SearchBar 
        searchText={searchText}
        sortOrder={sortOrder}
        onSearchChange={setSearchText}
        onSortToggle={toggleSortOrder}
      />
      
      <ProjectList
        projects={filteredProjects}
        loading={loading}
        refreshing={refreshing}
        loadingMore={loadingMore}
        error={error}
        isAuthenticated={isAuthenticated}
        searchText={searchText}
        hasMore={pagination.hasMore}
        onRefresh={refresh}
        onLoadMore={loadMore}
        onProjectPress={(projectId, updatedProject) => {
          // 优先使用最新的 updatedProject（从启动后轮询获取）
          // 如果没有，则从列表中查找
          const project = updatedProject || projects.find(p => p.project_id === projectId);
          if (project) {
            console.log('🔍 [HomeScreen] Opening project with preview_url:', project.startup_info?.preview_url);
            handleOpenProjectPreview(project);
          }
        }}
        onProjectLongPress={showActionSheet}
        onProjectDelete={handleProjectDelete}
        onRetry={() => fetchProjects()}
      />
      
      <ProjectActionSheet
        visible={actionSheetVisible}
        project={selectedProject}
        onClose={hideActionSheet}
        onRename={handleProjectRename}
        onDelete={handleProjectDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
