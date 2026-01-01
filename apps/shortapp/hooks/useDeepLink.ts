import React, { useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import { useAuth } from './useAuth';
import { httpClient } from '@vibecoding/api-client';
import { Project } from '@vibecoding/api-client/src/types';

interface DeepLinkParams {
    projectId?: string;
    [key: string]: string | undefined;
}

interface DeepLinkState {
    pendingProjectId: string | null;
    isProcessing: boolean;
}

export function useDeepLink() {
    const { isAuthenticated } = useAuth();
    const [deepLinkState, setDeepLinkState] = React.useState<DeepLinkState>({
        pendingProjectId: null,
        isProcessing: false,
    });

    // 解析深度链接URL
    const parseDeepLink = useCallback((url: string): DeepLinkParams | null => {
        try {
            console.log('🔗 [DeepLink] Parsing URL:', url);

            // 支持的URL格式：
            // dev.shortapp.vibe.code.ai.app.builder://project/123
            // dev.shortapp.vibe.code.ai.app.builder://?projectId=123
            // exp+vibecoding://project/123
            // exp+vibecoding://?projectId=123
            // https://vibecode.app/project/123
            // https://shortapp.dev/preview/project_id

            const params: DeepLinkParams = {};

            // 检查是否是我们的scheme或域名
            const isOurScheme = url.includes('vibecoding') || 
                               url.includes('dev.shortapp.vibe.code.ai.app.builder') ||
                               url.includes('shortapp.dev');
            
            if (!isOurScheme) {
                console.log('🔗 [DeepLink] URL does not contain recognized scheme or domain');
                return null;
            }

            // 处理自定义scheme的URL (dev.shortapp.vibe.code.ai.app.builder://project/123)
            if (url.includes('://')) {
                const parts = url.split('://');
                if (parts.length === 2) {
                    let pathAndQuery = parts[1];

                    // iOS系统可能会将URL规范化，处理 /// 和 ? 被转换为 / 的情况
                    console.log('🔗 [DeepLink] Raw pathAndQuery:', pathAndQuery);

                    // 检查是否有查询参数，处理 iOS 系统规范化后的URL
                    // 例如: dev.shortapp.vibe.code.ai.app.builder:///?projectId=test123 -> /?projectId=test123
                    // 或者: dev.shortapp.vibe.code.ai.app.builder://projectId=test123 -> projectId=test123
                    if (pathAndQuery.includes('projectId=')) {
                        // 查找projectId=的位置
                        const projectIdIndex = pathAndQuery.indexOf('projectId=');
                        if (projectIdIndex !== -1) {
                            // 提取projectId值
                            const projectIdPart = pathAndQuery.substring(projectIdIndex + 'projectId='.length);
                            // 移除可能的额外路径部分
                            const projectId = projectIdPart.split('/')[0];
                            params.projectId = projectId;
                            console.log('🔗 [DeepLink] Extracted projectId from path:', projectId);
                        }
                    } else if (pathAndQuery.startsWith('?') || pathAndQuery.includes('?')) {
                        // 处理标准的查询参数格式
                        const queryIndex = pathAndQuery.indexOf('?');
                        const queryString = pathAndQuery.substring(queryIndex + 1);
                        const urlParams = new URLSearchParams(queryString);
                        urlParams.forEach((value, key) => {
                            params[key] = value;
                        });
                    } else {
                        // 处理路径参数 (dev.shortapp.vibe.code.ai.app.builder://project/123)
                        const pathParts = pathAndQuery.split('/').filter(Boolean);
                        if (pathParts[0] === 'project' && pathParts[1]) {
                            params.projectId = pathParts[1];
                        }
                    }
                }
            }

            // 如果是标准HTTP URL，使用URL对象解析
            if (url.startsWith('http')) {
                try {
                    const urlObj = new URL(url);
                    const pathParts = urlObj.pathname.split('/').filter(Boolean);

                    // 支持 /project/123 格式
                    if (pathParts[0] === 'project' && pathParts[1]) {
                        params.projectId = pathParts[1];
                    }
                    // 支持 /preview/project_id 格式 (https://shortapp.dev/preview/project_id)
                    else if (pathParts[0] === 'preview' && pathParts[1]) {
                        params.projectId = pathParts[1];
                    }

                    // 处理查询参数
                    urlObj.searchParams.forEach((value, key) => {
                        params[key] = value;
                    });
                } catch (urlError) {
                    console.error('🔗 [DeepLink] Error parsing HTTP URL:', urlError);
                }
            }

            console.log('🔗 [DeepLink] Parsed params:', params);
            return params;
        } catch (error) {
            console.error('🔗 [DeepLink] Error parsing URL:', error);
            return null;
        }
    }, []);

    // 处理深度链接导航
    const handleDeepLinkNavigation = useCallback(async (
        projectId: string,
        navigate: (screen: any, params?: any) => void,
        resetTo: (screen: any) => void,
        showLoginModal: () => void,
        setPendingAction: (action: () => void) => void
    ) => {
        console.log('🔗🔗🔗 [DeepLink] ===== handleDeepLinkNavigation CALLED =====');
        console.log('🔗 [DeepLink] projectId:', projectId);
        console.log('🔗 [DeepLink] isAuthenticated:', isAuthenticated);
        console.log('🔗 [DeepLink] navigate function:', typeof navigate);

        if (!isAuthenticated) {
            // 用户未登录，设置待处理的项目ID并显示登录弹窗
            console.log('🔗 [DeepLink] ⚠️ User not authenticated, setting pending action');
            setPendingAction(async () => {
                await handleDeepLinkNavigation(projectId, navigate, resetTo, showLoginModal, setPendingAction);
            });
            showLoginModal();
            return;
        }

        // 用户已登录，获取项目信息并跳转到项目预览
        try {
            console.log('🔗 [DeepLink] ✅ User authenticated, fetching project info for:', projectId);
            const response = await httpClient.getProject(projectId);
            console.log('🔗 [DeepLink] API response:', {
                code: response.code,
                hasData: !!response.data,
                info: response.info,
            });
            
            if (response.code === 0 && response.data) {
                const project: Project = response.data;
                console.log('✅ [DeepLink] ✅ Project fetched successfully:', {
                    project_id: project.project_id,
                    name: project.name,
                    hasPreviewUrl: !!(project.startup_info?.web_preview_url || project.startup_info?.preview_url),
                });
                console.log('🔗 [DeepLink] ✅ About to navigate to ProjectWebView with project');
                navigate('ProjectWebView', { project });
                console.log('🔗 [DeepLink] ✅ Navigate called, waiting for navigation to complete...');
            } else {
                console.error('❌ [DeepLink] ❌ Failed to fetch project:', response.info);
                // TODO: 显示错误提示
            }
        } catch (error) {
            console.error('❌ [DeepLink] ❌ Error fetching project:', error);
            // TODO: 显示错误提示
        }
    }, [isAuthenticated]);

    // 监听深度链接
    useEffect(() => {
        console.log('🔗🔗🔗 [DeepLink] ===== useDeepLink HOOK INITIALIZED =====');
        console.log('🔗 [DeepLink] Hook mounted, setting up listeners...');

        // 1. 处理冷启动 (App 之前被杀死了，现在通过 URL 打开)
        const handleInitialURL = async () => {
            try {
                console.log('🔗🔗🔗 [DeepLink] ===== CHECKING INITIAL URL =====');
                const initialUrl = await Linking.getInitialURL();
                console.log('🔗 [DeepLink] Linking.getInitialURL() returned:', initialUrl);
                
                if (initialUrl) {
                    console.log('🔗 [DeepLink] ✅ App opened with URL:', initialUrl);
                    const params = parseDeepLink(initialUrl);
                    console.log('🔗 [DeepLink] ✅ Parsed params:', params);
                    if (params?.projectId) {
                        console.log('🔗 [DeepLink] ✅ Setting pending projectId:', params.projectId);
                        setDeepLinkState({
                            pendingProjectId: params.projectId,
                            isProcessing: true,
                        });
                    } else {
                        console.log('🔗 [DeepLink] ⚠️ No projectId found in parsed params');
                    }
                } else {
                    console.log('🔗 [DeepLink] ⚠️ No initial URL found (app not opened via deep link)');
                }
            } catch (error) {
                console.error('🔗 [DeepLink] ❌ Error getting initial URL:', error);
            }
        };

        // 2. 处理热启动 (App 在后台，再次被 URL 唤起)
        const handleURL = (event: { url: string }) => {
            console.log('🔗🔗🔗 [DeepLink] ===== RECEIVED URL EVENT =====');
            console.log('🔗 [DeepLink] ✅ Received URL event:', event);
            console.log('🔗 [DeepLink] ✅ URL:', event.url);
            const params = parseDeepLink(event.url);
            console.log('🔗 [DeepLink] ✅ Parsed params:', params);
            if (params?.projectId) {
                console.log('🔗 [DeepLink] ✅ Setting pending projectId:', params.projectId);
                setDeepLinkState({
                    pendingProjectId: params.projectId,
                    isProcessing: true,
                });
            } else {
                console.log('🔗 [DeepLink] ⚠️ No projectId found in parsed params');
            }
        };

        // 调用处理初始 URL
        console.log('🔗 [DeepLink] Calling handleInitialURL...');
        handleInitialURL();

        // 设置 URL 事件监听器
        console.log('🔗 [DeepLink] Setting up URL event listener...');
        const subscription = Linking.addEventListener('url', handleURL);
        console.log('🔗 [DeepLink] ✅ URL event listener registered');

        return () => {
            console.log('🔗 [DeepLink] Cleanup: removing URL event listener');
            subscription?.remove();
        };
    }, [parseDeepLink]);

    // 处理待处理的深度链接
    const processPendingDeepLink = useCallback((
        navigate: (screen: any, params?: any) => void,
        resetTo: (screen: any) => void,
        showLoginModal: () => void,
        setPendingAction: (action: () => void) => void
    ) => {
        console.log('🔗🔗🔗 [DeepLink] ===== processPendingDeepLink CALLED =====');
        console.log('🔗 [DeepLink] deepLinkState:', {
            pendingProjectId: deepLinkState.pendingProjectId,
            isProcessing: deepLinkState.isProcessing,
        });
        
        if (deepLinkState.pendingProjectId && deepLinkState.isProcessing) {
            console.log('🔗 [DeepLink] ✅ Processing pending deep link for projectId:', deepLinkState.pendingProjectId);

            handleDeepLinkNavigation(
                deepLinkState.pendingProjectId,
                navigate,
                resetTo,
                showLoginModal,
                setPendingAction
            );

            // 清除待处理状态
            setDeepLinkState({
                pendingProjectId: null,
                isProcessing: false,
            });
        } else {
            console.log('🔗 [DeepLink] ⚠️ No pending deep link to process');
        }
    }, [deepLinkState, handleDeepLinkNavigation]);

    // 清除待处理的深度链接
    const clearPendingDeepLink = useCallback(() => {
        setDeepLinkState({
            pendingProjectId: null,
            isProcessing: false,
        });
    }, []);

    return {
        deepLinkState,
        processPendingDeepLink,
        clearPendingDeepLink,
        parseDeepLink,
        handleDeepLinkNavigation,
    };
}
