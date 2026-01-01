/**
 * ProfileScreen - 我的页面
 * 完全按照UI设计实现，支持可滑动的 Public/Private 切换和卡片跳转
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import PagerView from 'react-native-pager-view';
import { Project } from '@vibecoding/api-client/src/types';
import { httpClient } from '@vibecoding/api-client';
import { useAuth } from '../hooks/useAuth';
import { LiquidGlassBackdrop } from '../components/LiquidGlassBackdrop';
import { useProjectNavigation } from '../hooks/useProjectNavigation';
import LinearGradient from 'react-native-linear-gradient';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import Svg, { Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop, Path } from 'react-native-svg';
import { useProjectActions } from '../hooks/useProjectActions';
import ProjectActionSheet from '../components/HomeScreen/ProjectActionSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 60) / 2; // 两列布局，左右各20，中间20

// 生成随机颜色
const generateRandomColor = (): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
    '#EC7063', '#5DADE2', '#58D68D', '#F4D03F', '#AF7AC5',
    '#85C1E9', '#F1948A', '#82E0AA', '#F9E79F', '#AED6F1',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// 生成随机渐变色（使用对比度更大的颜色对，让渐变更明显）
const generateRandomGradient = (seed?: string): string[] => {
  const gradients = [
    ['#FF6B6B', '#FFD93D'], // 红色到黄色
    ['#4ECDC4', '#44A08D'], // 青色到深绿
    ['#45B7D1', '#96C93D'], // 蓝色到绿色
    ['#FFA07A', '#FF6B9D'], // 橙色到粉色
    ['#98D8C8', '#6BC5DB'], // 浅绿到蓝色
    ['#F7DC6F', '#F1948A'], // 黄色到红色
    ['#BB8FCE', '#E74C3C'], // 紫色到红色
    ['#85C1E2', '#F4D03F'], // 蓝色到黄色
    ['#F8B739', '#E74C3C'], // 橙色到红色
    ['#52BE80', '#3498DB'], // 绿色到蓝色
    ['#EC7063', '#F7DC6F'], // 红色到黄色
    ['#5DADE2', '#58D68D'], // 蓝色到绿色
    ['#58D68D', '#F4D03F'], // 绿色到黄色
    ['#F4D03F', '#E67E22'], // 黄色到橙色
    ['#AF7AC5', '#5DADE2'], // 紫色到蓝色
    ['#85C1E9', '#F1948A'], // 浅蓝到红色
    ['#F1948A', '#52BE80'], // 红色到绿色
    ['#82E0AA', '#F39C12'], // 绿色到橙色
    ['#F9E79F', '#EC7063'], // 浅黄到红色
    ['#AED6F1', '#F7DC6F'], // 浅蓝到黄色
  ];
  // 如果有seed，使用seed来生成稳定的颜色
  if (seed) {
    const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return gradients[hash % gradients.length];
  }
  return gradients[Math.floor(Math.random() * gradients.length)];
};

// 生成随机斜对角渐变方向
const getRandomGradientDirection = (seed?: string): { start: { x: number; y: number }; end: { x: number; y: number } } => {
  const directions = [
    { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }, // 左上到右下
    { start: { x: 0, y: 1 }, end: { x: 1, y: 0 } }, // 左下到右上
    { start: { x: 1, y: 0 }, end: { x: 0, y: 1 } }, // 右上到左下
    { start: { x: 1, y: 1 }, end: { x: 0, y: 0 } }, // 右下到左上
  ];
  
  if (seed) {
    const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return directions[hash % directions.length];
  }
  return directions[Math.floor(Math.random() * directions.length)];
};

// 获取用户名字的首字母
const getUserInitial = (name: string): string => {
  if (!name || name.trim().length === 0) {
    return '?';
  }
  const firstChar = name.trim().charAt(0).toUpperCase();
  return /[A-Z0-9]/.test(firstChar) ? firstChar : '?';
};

// 获取项目名称的首字母
const getProjectInitial = (name: string): string => {
  if (!name || name.trim().length === 0) {
    return '?';
  }
  const firstChar = name.trim().charAt(0).toUpperCase();
  return /[A-Z0-9]/.test(firstChar) ? firstChar : '?';
};

// 生成随机评星（3-5星，只返回整数）
const getRandomRating = (seed?: string): number => {
  const ratings = [3, 4, 5];
  
  if (seed) {
    const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return ratings[hash % ratings.length];
  }
  return ratings[Math.floor(Math.random() * ratings.length)];
};

// 渲染评星组件
const renderStars = (rating: number) => {
  return [1, 2, 3, 4, 5].map((star) => {
    if (star <= rating) {
      // 完全填充的星星
      return (
        <Text key={star} style={[styles.star, styles.starFilled]}>
          ★
        </Text>
      );
    } else {
      // 空星
      return (
        <Text key={star} style={[styles.star, styles.starEmpty]}>
          ☆
        </Text>
      );
    }
  });
};

// 眼睛图标组件
const EyeIcon = ({ width = 20, height = 13, color = '#000000' }) => (
  <Svg width={width} height={height} viewBox="0 0 20 13" fill="none">
    <Path
      d="M10.0222 2.21564e-06C13.1252 -0.00220677 16.2262 1.64735 19.325 4.94856L19.4189 5.0491C20.1969 5.88628 20.1933 7.19144 19.4107 8.02422C16.2958 11.3392 13.173 12.9978 10.0424 13C6.93445 13.0022 3.81881 11.3833 0.695452 8.1432L0.600803 8.04451C-0.194401 7.21132 -0.201035 5.89362 0.585728 5.05228C3.73336 1.68632 6.87885 0.00223659 10.0222 2.21564e-06H10.0222ZM9.98057 2.1582C7.6144 2.1582 5.69625 4.0964 5.69625 6.4873C5.69625 8.87821 7.6144 10.8164 9.98057 10.8164C12.3467 10.8164 14.2649 8.87821 14.2649 6.4873C14.2649 4.0964 12.3467 2.1582 9.98057 2.1582ZM10.0174 3.93555C11.4189 3.93555 12.5551 5.08371 12.5551 6.5C12.5551 7.91629 11.4189 9.06445 10.0174 9.06445C8.61587 9.06445 7.47968 7.91629 7.47968 6.5C7.47968 5.08371 8.61587 3.93555 10.0174 3.93555Z"
      fill={color}
    />
  </Svg>
);

// 小锁图标组件
const LockIcon = ({ width = 14, height = 17, color = '#333333' }) => (
  <Svg width={width} height={height} viewBox="0 0 14 17" fill="none">
    <Path
      d="M7 1.58211C7.36767 1.58211 7.73174 1.65368 8.07142 1.79273C8.4111 1.93178 8.71975 2.13559 8.97973 2.39252C9.23971 2.64946 9.44594 2.95448 9.58664 3.29018C9.72734 3.62587 9.79976 3.98567 9.79976 4.34903V5.58246C8.90571 5.55163 7.98766 5.53502 7 5.53502C6.01234 5.53502 5.09429 5.55163 4.20024 5.58246V4.34903C4.20024 3.6152 4.49521 2.91142 5.02027 2.39252C5.54533 1.87363 6.25746 1.58211 7 1.58211ZM2.59935 4.34903V5.75443C1.97526 5.94748 1.41985 6.31248 0.998329 6.80658C0.576805 7.30067 0.306662 7.90336 0.219612 8.54388C0.0996055 9.41321 0 10.3276 0 11.2669C0 12.2074 0.100806 13.1206 0.219612 13.9911C0.435625 15.5863 1.7737 16.8458 3.4202 16.9205C4.56266 16.9727 5.72433 17 7 17C8.27687 17 9.43614 16.9727 10.5798 16.9205C12.2263 16.8458 13.5632 15.5863 13.7804 13.9911C13.9004 13.1206 14 12.2062 14 11.2669C14 10.3276 13.8992 9.41321 13.7804 8.54388C13.6935 7.90331 13.4234 7.30055 13.0018 6.80643C12.5803 6.31231 12.0248 5.94735 11.4007 5.75443V4.34903C11.4007 3.1956 10.937 2.0894 10.1117 1.2738C9.28645 0.4582 8.16713 0 7 0C5.83287 0 4.71355 0.4582 3.88827 1.2738C3.06299 2.0894 2.59935 3.1956 2.59935 4.34903ZM7.80045 10.477V12.058C7.80045 12.2678 7.71611 12.469 7.566 12.6173C7.41589 12.7657 7.21229 12.849 7 12.849C6.78771 12.849 6.58411 12.7657 6.434 12.6173C6.28389 12.469 6.19955 12.2678 6.19955 12.058V10.477C6.19955 10.2672 6.28389 10.066 6.434 9.91769C6.58411 9.76933 6.78771 9.68599 7 9.68599C7.21229 9.68599 7.41589 9.76933 7.566 9.91769C7.71611 10.066 7.80045 10.2672 7.80045 10.477Z"
      fill={color}
    />
  </Svg>
);

// 假数据（用于未登录或没有数据时展示）
const MOCK_PUBLIC_PROJECTS: Partial<Project>[] = [
  {
    project_id: 'mock-public-1',
    project_uuid: 'mock-uuid-public-1',
    user_id: 'mock-user-1',
    name: 'Automatic clicker',
    description: 'Automate your clicks with AI-powered precision.',
    category: 'productivity',
    isPublic: true,
    addCount: 432,
    sandbox_id: 'mock-sandbox-1',
    sandbox_status: 'ACTIVE',
    sandbox_last_activity_timestamp: new Date().toISOString(),
    is_deleted: false,
    deleted_at: null,
    status: 'ACTIVE',
    startup_info: {
      preview_url: 'https://example.com/preview',
      web_preview_url: 'https://example.com/preview',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deployment_id: null,
    in_good_standings: true,
    project_api_key: 'mock-key',
    ssh_password: 'mock-password',
    ssh_active: false,
    is_published: true,
    app_store_configured: false,
    supports_tablet: false,
    type: 'AGENT',
  },
  {
    project_id: 'mock-public-2',
    project_uuid: 'mock-uuid-public-2',
    user_id: 'mock-user-1',
    name: 'App 2',
    description: 'A beautiful app for your daily needs.',
    category: 'lifestyle',
    isPublic: true,
    addCount: 289,
    sandbox_id: 'mock-sandbox-2',
    sandbox_status: 'ACTIVE',
    sandbox_last_activity_timestamp: new Date().toISOString(),
    is_deleted: false,
    deleted_at: null,
    status: 'ACTIVE',
    startup_info: {
      preview_url: 'https://example.com/preview',
      web_preview_url: 'https://example.com/preview',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deployment_id: null,
    in_good_standings: true,
    project_api_key: 'mock-key',
    ssh_password: 'mock-password',
    ssh_active: false,
    is_published: true,
    app_store_configured: false,
    supports_tablet: false,
    type: 'AGENT',
  },
  {
    project_id: 'mock-public-3',
    project_uuid: 'mock-uuid-public-3',
    user_id: 'mock-user-1',
    name: 'App 3',
    description: 'Gaming app with amazing features.',
    category: 'entertainment',
    isPublic: true,
    addCount: 567,
    sandbox_id: 'mock-sandbox-3',
    sandbox_status: 'ACTIVE',
    sandbox_last_activity_timestamp: new Date().toISOString(),
    is_deleted: false,
    deleted_at: null,
    status: 'ACTIVE',
    startup_info: {
      preview_url: 'https://example.com/preview',
      web_preview_url: 'https://example.com/preview',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deployment_id: null,
    in_good_standings: true,
    project_api_key: 'mock-key',
    ssh_password: 'mock-password',
    ssh_active: false,
    is_published: true,
    app_store_configured: false,
    supports_tablet: false,
    type: 'AGENT',
  },
  {
    project_id: 'mock-public-4',
    project_uuid: 'mock-uuid-public-4',
    user_id: 'mock-user-1',
    name: 'App 4',
    description: 'Creative tools for artists and designers.',
    category: 'lifestyle',
    isPublic: true,
    addCount: 234,
    sandbox_id: 'mock-sandbox-4',
    sandbox_status: 'ACTIVE',
    sandbox_last_activity_timestamp: new Date().toISOString(),
    is_deleted: false,
    deleted_at: null,
    status: 'ACTIVE',
    startup_info: {
      preview_url: 'https://example.com/preview',
      web_preview_url: 'https://example.com/preview',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deployment_id: null,
    in_good_standings: true,
    project_api_key: 'mock-key',
    ssh_password: 'mock-password',
    ssh_active: false,
    is_published: true,
    app_store_configured: false,
    supports_tablet: false,
    type: 'AGENT',
  },
];

const MOCK_PRIVATE_PROJECTS: Partial<Project>[] = [
  {
    project_id: 'mock-private-1',
    project_uuid: 'mock-uuid-private-1',
    user_id: 'mock-user-1',
    name: 'Private App 1',
    description: 'My private project for personal use.',
    category: 'productivity',
    isPublic: false,
    addCount: 0,
    sandbox_id: 'mock-sandbox-p1',
    sandbox_status: 'ACTIVE',
    sandbox_last_activity_timestamp: new Date().toISOString(),
    is_deleted: false,
    deleted_at: null,
    status: 'ACTIVE',
    startup_info: {
      preview_url: 'https://example.com/preview',
      web_preview_url: 'https://example.com/preview',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deployment_id: null,
    in_good_standings: true,
    project_api_key: 'mock-key',
    ssh_password: 'mock-password',
    ssh_active: false,
    is_published: false,
    app_store_configured: false,
    supports_tablet: false,
    type: 'AGENT',
  },
  {
    project_id: 'mock-private-2',
    project_uuid: 'mock-uuid-private-2',
    user_id: 'mock-user-1',
    name: 'Private App 2',
    description: 'Another private project.',
    category: 'education',
    isPublic: false,
    addCount: 0,
    sandbox_id: 'mock-sandbox-p2',
    sandbox_status: 'ACTIVE',
    sandbox_last_activity_timestamp: new Date().toISOString(),
    is_deleted: false,
    deleted_at: null,
    status: 'ACTIVE',
    startup_info: {
      preview_url: 'https://example.com/preview',
      web_preview_url: 'https://example.com/preview',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deployment_id: null,
    in_good_standings: true,
    project_api_key: 'mock-key',
    ssh_password: 'mock-password',
    ssh_active: false,
    is_published: false,
    app_store_configured: false,
    supports_tablet: false,
    type: 'AGENT',
  },
];

// 单个标签页的应用列表组件
interface TabAppListProps {
  isPublic: boolean;
  onCardPress: (project: Project) => void;
  onCardLongPress: (project: Project) => void;
}

const TabAppList: React.FC<TabAppListProps> = ({ isPublic, onCardPress, onCardLongPress }) => {
  const [apps, setApps] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const loadApps = async () => {
      if (!isAuthenticated) {
        // 未登录时使用假数据
        const mockProjects = (isPublic ? MOCK_PUBLIC_PROJECTS : MOCK_PRIVATE_PROJECTS) as Project[];
        setApps(mockProjects);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await httpClient.getUserMiniapps(100, 0);
        console.log('📡 [ProfileScreen] API Response for', isPublic ? 'Public' : 'Private', ':', {
          code: response.code,
          info: response.info,
          hasData: !!response.data,
          ownerCount: response.data?.owner?.length || 0,
          otherCount: response.data?.other?.length || 0,
        });
        
        if (response.code === 0 && response.data) {
          // 我的页面只显示自己创建的项目（owner），不包含其他人创建的（other）
          // 根据 isPublic 筛选应用
          const ownerProjects = response.data.owner || [];
          console.log('📦 [ProfileScreen] Owner projects:', {
            total: ownerProjects.length,
            projects: ownerProjects.map(p => ({
              project_id: p.project_id,
              name: p.name,
              isPublic: p.isPublic,
            })),
          });
          
          const filteredProjects = ownerProjects.filter(project => {
            // 处理 isPublic 可能是 boolean 或 undefined 的情况
            // 优先使用 app.isPublic，向后兼容 project.isPublic
            const projectIsPublic = (project.app?.isPublic ?? project.isPublic) === true;
            return projectIsPublic === isPublic;
          });
          
          console.log('✅ [ProfileScreen] Filtered projects for', isPublic ? 'Public' : 'Private', ':', filteredProjects.length);
            setApps(filteredProjects);
        } else {
          console.error('❌ [ProfileScreen] Failed to load miniapps:', response.info);
          setApps([]);
        }
      } catch (error) {
        console.error('❌ [ProfileScreen] Error loading apps:', error);
        setApps([]);
      } finally {
        setLoading(false);
      }
    };

    loadApps();
  }, [isPublic, isAuthenticated]);

  // 为每个应用生成随机颜色
  const appsWithColors = apps.map((app, index) => ({
    ...app,
    color: generateRandomColor(),
  }));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.tabScrollView}
      contentContainerStyle={styles.tabScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.appsGrid}>
        {appsWithColors.map((app) => {
          const gradientDir = getRandomGradientDirection(app.project_id);
          const rating = getRandomRating(app.project_id);
          return (
          <Pressable
            key={app.project_id}
            style={styles.appCard}
            onPress={() => onCardPress(app)}
              onLongPress={() => onCardLongPress(app)}
            >
              <Text style={styles.appCardName} numberOfLines={2}>
                {app.name || 'Unnamed App'}
                </Text>
            <View style={styles.appIconContainer}>
                <LinearGradient
                  colors={generateRandomGradient(app.project_id)}
                  start={gradientDir.start}
                  end={gradientDir.end}
                  style={styles.appIcon}
                >
                <Text style={styles.appIconText}>
                    {getProjectInitial(app.name || 'A')}
                </Text>
                </LinearGradient>
              </View>
            <View style={styles.ratingContainer}>
                {renderStars(rating)}
            </View>
          </Pressable>
          );
        })}
        {/* 占位卡片（如果应用数量是奇数） */}
        {appsWithColors.length % 2 !== 0 && (
          <View style={styles.appCardPlaceholder} />
        )}
      </View>
    </ScrollView>
  );
};

export const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const pagerRef = useRef<PagerView>(null);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0); // 0 = public, 1 = private
  const [userStats, setUserStats] = useState({ appsCount: 0, income: 0 });
  const [refreshKey, setRefreshKey] = useState(0); // 用于强制刷新 TabAppList
  const { isAuthenticated, user } = useAuth();

  // 加载用户统计数据
  const loadUserStats = useCallback(async () => {
      if (!isAuthenticated) {
        setUserStats({ appsCount: 10, income: 68 });
        return;
      }

      try {
        const response = await httpClient.getUserMiniapps(100, 0);
        if (response.code === 0 && response.data) {
        // 我的页面只统计自己创建的项目（owner）
        const ownerProjects = response.data.owner || [];
          setUserStats({
          appsCount: ownerProjects.length,
          income: ownerProjects.reduce((sum, app) => sum + (app.app?.addCount || app.addCount || 0), 0),
          });
        } else {
        setUserStats({ appsCount: 0, income: 0 });
        }
      } catch (error) {
        console.error('Error loading user stats:', error);
      setUserStats({ appsCount: 0, income: 0 });
      }
  }, [isAuthenticated]);

  // 初始加载用户统计数据
  useEffect(() => {
    loadUserStats();
  }, [loadUserStats]);

  // 每次页面获得焦点时刷新数据
  useFocusEffect(
    useCallback(() => {
      // 刷新用户统计数据
      loadUserStats();
      // 通过改变 refreshKey 来强制刷新 TabAppList
      setRefreshKey(prev => prev + 1);
    }, [loadUserStats])
  );

  // 处理标签页点击
  const handleTabPress = useCallback((index: number) => {
    setSelectedTabIndex(index);
    pagerRef.current?.setPage(index);
  }, []);

  // 处理 PagerView 页面变化
  const handlePageSelected = useCallback((e: any) => {
    const index = e.nativeEvent.position;
    setSelectedTabIndex(index);
  }, []);

  // 项目操作相关
  const {
    selectedProject,
    actionSheetVisible,
    showActionSheet,
    hideActionSheet,
    handleRename,
    handleDelete,
    handleTogglePublic,
    handleCategoryChange,
  } = useProjectActions();

  // 项目导航相关（包含进度条逻辑）
  const { handleProjectPress, progress, isProcessing } = useProjectNavigation();

  // 处理卡片点击
  const handleCardPress = useCallback(async (project: Project) => {
    await handleProjectPress(project);
  }, [handleProjectPress]);

  // 处理卡片长按
  const handleCardLongPress = useCallback((project: Project) => {
    showActionSheet(project);
  }, [showActionSheet]);

  // 处理项目重命名
  const handleProjectRename = useCallback(async (projectId: string, newName: string) => {
    try {
      await handleRename(projectId, newName);
      // 重命名成功后可以刷新数据
    } catch (error) {
      // 错误已在useProjectActions中处理
    }
  }, [handleRename]);

  // 处理项目删除
  const handleProjectDelete = useCallback(async (projectId: string) => {
    try {
      await handleDelete(projectId);
      // 删除成功后可以刷新数据
    } catch (error) {
      // 错误已在useProjectActions中处理
    }
  }, [handleDelete]);

  // 处理切换公开/未公开
  const handleProjectTogglePublic = useCallback(async (projectId: string, isPublic: boolean) => {
    try {
      await handleTogglePublic(projectId, isPublic);
      // 切换成功后刷新数据
      // 通过改变 key 来强制重新渲染 TabAppList
      setRefreshKey((prev: number) => prev + 1);
    } catch (error) {
      // 错误已在useProjectActions中处理
    }
  }, [handleTogglePublic]);

  // 处理分类变更
  const handleProjectCategoryChange = useCallback(async (projectId: string, categoryKey: string) => {
    try {
      await handleCategoryChange(projectId, categoryKey);
      // 变更成功后刷新数据
      // 通过改变 key 来强制重新渲染 TabAppList
      setRefreshKey((prev: number) => prev + 1);
    } catch (error) {
      // 错误已在useProjectActions中处理
    }
  }, [handleCategoryChange]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LiquidGlassBackdrop />
      {/* 个人资料部分 */}
      <View style={styles.profileSection}>
        {/* 左侧：头像和名字 */}
        <View style={styles.profileLeft}>
          {/* 头像 */}
          <View style={styles.avatarContainer}>
            {user?.avatar && user.avatar.trim() !== '' ? (
              <Image
                source={{ uri: user.avatar }}
                style={styles.avatar}
              />
            ) : (
              isLiquidGlassSupported ? (
                <LiquidGlassView
                  effect="clear"
                  style={styles.avatarLiquidGlass}
                >
                  <View style={styles.avatarInner}>
                    {(() => {
                      const userName = user?.name || 'Name';
                      const initial = getUserInitial(userName);
                      const gradientColors = generateRandomGradient(userName);
                      const gradientDir = getRandomGradientDirection(userName);
                      return (
                      <View style={styles.avatarGradient}>
                        <Svg width={80} height={80} style={styles.avatarSvg}>
                          <Defs>
                            <SvgLinearGradient
                              id="avatarGradient"
                              x1={`${gradientDir.start.x * 100}%`}
                              y1={`${gradientDir.start.y * 100}%`}
                              x2={`${gradientDir.end.x * 100}%`}
                              y2={`${gradientDir.end.y * 100}%`}
                            >
                              <Stop offset="0%" stopColor={gradientColors[0]} />
                              <Stop offset="100%" stopColor={gradientColors[1]} />
                            </SvgLinearGradient>
                          </Defs>
                          <SvgText
                            x="40"
                            y="40"
                            fontSize="32"
                            fontWeight="600"
                            fill="url(#avatarGradient)"
                            textAnchor="middle"
                            dy="0.3em"
                          >
                            {initial}
                          </SvgText>
                        </Svg>
                      </View>
                      );
                    })()}
                  </View>
                </LiquidGlassView>
              ) : (
                <View style={styles.avatarFallback}>
                  {(() => {
                    const userName = user?.name || 'Name';
                    const initial = getUserInitial(userName);
                    const gradientColors = generateRandomGradient(userName);
                    const gradientDir = getRandomGradientDirection(userName);
                    return (
                    <View style={styles.avatarGradient}>
                      <Svg width={80} height={80} style={styles.avatarSvg}>
                        <Defs>
                          <SvgLinearGradient
                            id="avatarGradientFallback"
                            x1={`${gradientDir.start.x * 100}%`}
                            y1={`${gradientDir.start.y * 100}%`}
                            x2={`${gradientDir.end.x * 100}%`}
                            y2={`${gradientDir.end.y * 100}%`}
                          >
                            <Stop offset="0%" stopColor={gradientColors[0]} />
                            <Stop offset="100%" stopColor={gradientColors[1]} />
                          </SvgLinearGradient>
                        </Defs>
                        <SvgText
                          x="40"
                          y="40"
                          fontSize="32"
                          fontWeight="600"
                          fill="url(#avatarGradientFallback)"
                          textAnchor="middle"
                          dy="0.3em"
                        >
                          {initial}
                        </SvgText>
                      </Svg>
                    </View>
                    );
                  })()}
                </View>
              )
            )}
          </View>

          {/* 姓名 */}
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
            {user?.name || 'Name'}
          </Text>
        </View>

        {/* 右侧：统计信息 */}
        <View style={styles.profileRight}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.appsCount}</Text>
            <Text style={styles.statLabel}>Apps</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.income}</Text>
            <Text style={styles.statLabel}>Income</Text>
          </View>
        </View>
      </View>

      {/* 内容选择标签 */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabWrapper}>
        <Pressable
          onPress={() => handleTabPress(0)}
            style={styles.tab}
          >
            {selectedTabIndex === 0 ? (
              isLiquidGlassSupported ? (
                <LiquidGlassView
                  effect="clear"
                  style={styles.tabActiveLiquidGlass}
        >
                  <View style={styles.tabInner}>
                    <EyeIcon width={20} height={13} color="#000000" />
                    <Text style={styles.tabTextActive}>
            Public
          </Text>
                  </View>
                </LiquidGlassView>
              ) : (
                <View style={styles.tabActive}>
                  <EyeIcon width={20} height={13} color="#000000" />
                  <Text style={styles.tabTextActive}>
                    Public
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.tabInactive}>
                <EyeIcon width={20} height={13} color="#666666" />
                <Text style={styles.tabText}>
                  Public
                </Text>
              </View>
            )}
        </Pressable>
        </View>
        <View style={styles.tabWrapper}>
        <Pressable
          onPress={() => handleTabPress(1)}
            style={styles.tab}
          >
            {selectedTabIndex === 1 ? (
              isLiquidGlassSupported ? (
                <LiquidGlassView
                  effect="clear"
                  style={styles.tabActiveLiquidGlass}
        >
                  <View style={styles.tabInner}>
                    <LockIcon width={14} height={17} color="#000000" />
                    <Text style={styles.tabTextActive}>
            Private
          </Text>
                  </View>
                </LiquidGlassView>
              ) : (
                <View style={styles.tabActive}>
                  <LockIcon width={14} height={17} color="#000000" />
                  <Text style={styles.tabTextActive}>
                    Private
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.tabInactive}>
                <LockIcon width={14} height={17} color="#666666" />
                <Text style={styles.tabText}>
                  Private
                </Text>
              </View>
            )}
        </Pressable>
        </View>
      </View>

      {/* 可滑动的标签页内容区域 */}
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={handlePageSelected}
      >
        <View style={styles.page} key={`public-${refreshKey}`}>
          <TabAppList isPublic={true} onCardPress={handleCardPress} onCardLongPress={handleCardLongPress} />
        </View>
        <View style={styles.page} key={`private-${refreshKey}`}>
          <TabAppList isPublic={false} onCardPress={handleCardPress} onCardLongPress={handleCardLongPress} />
        </View>
      </PagerView>

      {/* Project Action Sheet */}
      <ProjectActionSheet
        visible={actionSheetVisible}
        project={selectedProject}
        onClose={hideActionSheet}
        onRename={handleProjectRename}
        onDelete={handleProjectDelete}
        onTogglePublic={handleProjectTogglePublic}
        onCategoryChange={handleProjectCategoryChange}
      />

      {/* 进度条（处理项目启动时显示） */}
      {isProcessing && (
        <View style={styles.progressOverlay}>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Starting project...</Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 20,
    position: 'relative',
  },
  profileLeft: {
    alignItems: 'center',
  },
  profileRight: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 40,
    marginLeft: 12,
    height: 80, // 与头像高度一致，确保底部对齐
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E5E5',
  },
  avatarLiquidGlass: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#E5E5E5',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  avatarSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 80,
    height: 80,
  },
  avatarTextContainer: {
    position: 'absolute',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
    maxWidth: 150,
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666666',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    paddingVertical: 6,
    marginBottom: 24,
    marginHorizontal: 20,
    gap: 8,
    borderRadius: 999, // 椭圆背景
    backgroundColor: '#E7E7E7',
  },
  tabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tab: {
     width: '100%', // 固定宽度
     paddingHorizontal: 8,
  },
  tabActiveLiquidGlass: {
    width: '100%',
    borderRadius: 999, // 最大圆角
    overflow: 'hidden',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999, // 最大圆角
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 6,
  },
  tabInactive: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999, // 最大圆角
    backgroundColor: 'transparent',
    gap: 6,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
  },
  tabTextActive: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  tabScrollView: {
    flex: 1,
  },
  tabScrollContent: {
    paddingBottom: 150, // 留出按钮和TabBar的空间
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  appCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH, // 正方形卡片
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0, // 防止卡片被压缩
    overflow: 'hidden', // 防止内容溢出
  },
  appCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  appIconContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appIconText: {
    fontSize: 40,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    marginTop: 8,
  },
  star: {
    fontSize: 14,
  },
  starFilled: {
    color: '#000000',
  },
  starEmpty: {
    color: '#D5D5D5',
  },
  appCardPlaceholder: {
    width: CARD_WIDTH,
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: SCREEN_WIDTH - 80,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#F75A01',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
});
