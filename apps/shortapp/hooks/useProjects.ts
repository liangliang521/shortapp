import { useState, useEffect } from 'react';
import { httpClient } from '@vibecoding/api-client';
import { Project } from '@vibecoding/api-client/src/types';

interface PaginationState {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
}

interface UseProjectsState {
    projects: Project[];
    loading: boolean;
    refreshing: boolean;
    loadingMore: boolean;
    error: string | null;
    pagination: PaginationState;
}

interface UseProjectsReturn extends UseProjectsState {
    fetchProjects: (page?: number, append?: boolean) => Promise<void>;
    refresh: () => Promise<void>;
    loadMore: () => Promise<void>;
    reset: () => void;
}

export function useProjects(isAuthenticated: boolean, shouldRefresh?: boolean): UseProjectsReturn {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginationState>({
        page: 1,
        limit: 20,
        total: 0,
        hasMore: true
    });

    const fetchProjects = async (page: number = 1, append: boolean = false) => {
        console.log('🔍 [useProjects] fetchProjects called, isAuthenticated:', isAuthenticated, 'page:', page, 'append:', append);

        // 如果用户未登录，不获取项目列表
        if (!isAuthenticated) {
            console.log('🔍 [useProjects] User not authenticated, skipping API call');
            setProjects([]);
            setLoading(false);
            setRefreshing(false);  // ✅ 重置 refreshing 状态
            setLoadingMore(false); // ✅ 重置 loadingMore 状态
            setError(null);
            setPagination({ page: 1, limit: 20, total: 0, hasMore: false });
            return;
        }

        try {
            console.log('🔍 [useProjects] Starting API call to getProjects...');

            if (!append) {
                setLoading(true);
            }
            setError(null);

            const response = await httpClient.getProjects();

            console.log('🔍 [useProjects] API response:', {
                code: response.code,
                hasData: !!response.data,
            });

            if (response.code === 0 && response.data) {
                // API返回的数据结构是 { limit, page, projects, total }
                const responseData = response.data as any;
                const projectsArray = responseData.projects || response.data;
                const total = responseData.total || projectsArray.length;

                console.log('✅ [useProjects] Projects fetched successfully:', projectsArray.length, 'projects');
                console.log('🔍 [useProjects] Projects data:', projectsArray);

                if (append) {
                    setProjects([...projects, ...projectsArray]);
                } else {
                    setProjects(projectsArray);
                }

                // 更新分页信息
                const hasMore = projectsArray.length === responseData.limit && (append ? projects.length + projectsArray.length : projectsArray.length) < total;
                setPagination({
                    page: responseData.page || page,
                    limit: responseData.limit || 20,
                    total: total,
                    hasMore: hasMore
                });

                console.log('🔍 [useProjects] Updated pagination:', {
                    page: responseData.page || page,
                    limit: responseData.limit || 20,
                    total: total,
                    hasMore: hasMore
                });
            } else {
                // ✅ 401 不显示错误（token过期会自动刷新）
                if (response.code === 401) {
                    console.log('⚠️ [useProjects] 401 Unauthorized');
                    setProjects([]);
                    setError(null);
                    setPagination({ page: 1, limit: 20, total: 0, hasMore: false });
                } else {
                    console.log('❌ [useProjects] API error:', response.info);
                setError(response.info || 'Failed to fetch projects');
                }
            }
        } catch (err) {
            console.error('❌ [useProjects] Error fetching projects:', err);
            // 如果用户未登录导致的错误，不显示错误信息
            if (!isAuthenticated) {
                setProjects([]);
                setError(null);
                setPagination({ page: 1, limit: 20, total: 0, hasMore: false });
            } else {
                setError('Failed to fetch projects');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    const refresh = async () => {
        console.log('🔄 [useProjects] Pull to refresh triggered');
        setRefreshing(true);
        setPagination({ page: 1, limit: 20, total: 0, hasMore: true });
        await fetchProjects(1, false);
    };

    const loadMore = async () => {
        if (!pagination.hasMore || loadingMore || loading || refreshing) {
            console.log('🚫 [useProjects] Cannot load more:', {
                hasMore: pagination.hasMore,
                loadingMore,
                loading,
                refreshing
            });
            return;
        }

        console.log('⬆️ [useProjects] Load more triggered, current page:', pagination.page);
        setLoadingMore(true);
        const nextPage = pagination.page + 1;
        await fetchProjects(nextPage, true);
    };

    const reset = () => {
        setProjects([]);
        setLoading(true);
        setRefreshing(false);
        setLoadingMore(false);
        setError(null);
        setPagination({ page: 1, limit: 20, total: 0, hasMore: true });
    };

    // 组件挂载时获取项目列表
    useEffect(() => {
        fetchProjects();
    }, [isAuthenticated]);

    // 当shouldRefresh为true时，重新获取项目列表
    useEffect(() => {
        if (shouldRefresh && isAuthenticated) {
            console.log('🔄 [useProjects] External refresh triggered');
            refresh();
        }
    }, [shouldRefresh, isAuthenticated]);

    return {
        projects,
        loading,
        refreshing,
        loadingMore,
        error,
        pagination,
        fetchProjects,
        refresh,
        loadMore,
        reset,
    };
}
