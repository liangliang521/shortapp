import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import Icon from '../icons/SvgIcons';
import { Project } from '@vibecoding/api-client/src/types';
import ProjectCard from './ProjectCard';

interface ProjectListProps {
  projects: Project[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  isAuthenticated: boolean;
  searchText: string;
  hasMore: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  onProjectPress: (projectId: string, updatedProject?: Project) => void;
  onProjectLongPress: (project: Project) => void;
  onProjectDelete: (projectId: string) => void;
  onRetry: () => void;
}

export default function ProjectList({
  projects,
  loading,
  refreshing,
  loadingMore,
  error,
  isAuthenticated,
  searchText,
  hasMore,
  onRefresh,
  onLoadMore,
  onProjectPress,
  onProjectLongPress,
  onProjectDelete,
  onRetry,
}: ProjectListProps) {
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="FolderOpen" size={48} color="#8E8E93" />
      <Text style={styles.emptyText}>
        {!isAuthenticated ? 'Please sign in to view your projects' : 'No projects found'}
      </Text>
      <Text style={styles.emptySubtext}>
        {!isAuthenticated 
          ? 'Sign in to create and manage your projects'
          : searchText 
            ? 'Try adjusting your search terms' 
            : 'Create your first project to get started'
        }
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Icon name="AlertCircle" size={48} color="#FF3B30" />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading projects...</Text>
    </View>
  );

  const renderLoadMoreIndicator = () => (
    <View style={styles.loadMoreContainer}>
      <ActivityIndicator size="small" color="#007AFF" />
      <Text style={styles.loadMoreText}>Loading more projects...</Text>
    </View>
  );

  const renderNoMoreDataIndicator = () => (
    <View style={styles.noMoreContainer}>
      <Text style={styles.noMoreText}>No more projects to load</Text>
    </View>
  );

  const renderProjectCard = (project: Project) => {
    return (
      <ProjectCard
        key={project.project_id}
        project={project}
        onPress={onProjectPress}
        onLongPress={onProjectLongPress}
        onStarted={onRefresh} // 启动成功后刷新列表
      />
    );
  };

  // 统一使用 ScrollView，确保在任何状态下都能下拉刷新和上拉加载
  return (
    <ScrollView 
      style={styles.projectsList}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#007AFF"
          title="Pull to refresh"
          titleColor="#8E8E93"
        />
      }
      onScroll={({ nativeEvent }) => {
        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
        const paddingToBottom = 20;
        
        // 检测是否滚动到底部
        if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
          if (hasMore && !loadingMore && projects.length > 0) {
            onLoadMore();
          }
        }
      }}
      scrollEventThrottle={400}
    >
      {/* 初始加载状态 */}
      {loading && projects.length === 0 && renderLoadingState()}
      
      {/* 错误状态 */}
      {error && renderErrorState()}
      
      {/* 空状态 */}
      {!loading && !error && projects.length === 0 && renderEmptyState()}
      
      {/* 项目列表 */}
      {projects.map(renderProjectCard)}
      
      {/* Load More Indicator */}
      {loadingMore && renderLoadMoreIndicator()}
      
      {/* No More Data Indicator */}
      {!hasMore && projects.length > 0 && !loading && renderNoMoreDataIndicator()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  projectsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    flexGrow: 1, // 确保内容可以填满并超出屏幕，使得下拉刷新和上拉加载都可用
    paddingBottom: 40, // 额外的底部内边距，确保最后一个元素下方有足够空间触发上拉加载
  },
  contentContainerEmpty: {
    flexGrow: 1, // 确保内容可以填满屏幕，使得下拉刷新可用
  },
  // Loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  loadMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  noMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noMoreText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
});
