/**
 * HomeScreen - 首页
 * 完全按照UI设计实现
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  TextInput,
  Alert,
  Share,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useAnimatedRef,
  interpolate,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchIcon, ShortappLogo } from '../components/icons/Icons';
import Icon from '../components/icons/SvgIcons';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { BlurView } from '@react-native-community/blur';
import { LiquidGlassBackdrop } from '../components/LiquidGlassBackdrop';
import { useAuth } from '../hooks/useAuth';
import { Project, Category } from '@vibecoding/api-client/src/types';
import { httpClient } from '@vibecoding/api-client';
import { useProjectActions } from '../hooks/useProjectActions';
import ProjectActionSheet from '../components/HomeScreen/ProjectActionSheet';
import CategoryModal from '../components/HomeScreen/CategoryModal';
import HomeProjectCardWithMenu from '../components/HomeScreen/HomeProjectCardWithMenu';
import { useProjectNavigation } from '../hooks/useProjectNavigation';
import IdeaStarterEmptyState from '../components/IdeaStarterEmptyState';
import { ensurePublishedAndShare } from '../utils/shareUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// 预估菜单高度（越接近实际高度，上下显示时与卡片的间距越一致）
const APPROX_MENU_HEIGHT = 240;
const DEFAULT_CARD_SIZE = 178;
const HEADER_HEIGHT = 120;
const HEADER_INITIAL_HEIGHT = 120; // 初始header高度（包含logo+name+搜索）
const HEADER_FINAL_HEIGHT = 68; // 最终header高度（只有搜索+设置）
const HEADER_COLLAPSE_GAP = HEADER_INITIAL_HEIGHT - HEADER_FINAL_HEIGHT;
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

// 获取项目名称的首字母
const getProjectInitial = (name: string): string => {
  if (!name || name.trim().length === 0) {
    return '?';
  }
  const firstChar = name.trim().charAt(0).toUpperCase();
  return /[A-Z0-9]/.test(firstChar) ? firstChar : '?';
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

export const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isAuthenticated, user } = useAuth();
  
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

  // 处理卡片点击事件（使用 useProjectNavigation hooks）
  const handleCardPress = useCallback(async (project: Project) => {
    // 判断是否是自己的项目（通过检查是否在 owner 列表中）
    // 这里我们需要从 allApps 中判断，但为了简化，让 hooks 内部判断
    await handleProjectPress(project);
  }, [handleProjectPress]);

  // 处理创建新应用事件
  const handleCreateNewApp = useCallback((prompt?: string) => {
    if (!isAuthenticated) {
      // 未登录，跳转到登录页面
      (navigation as any).navigate('Login', { redirectTo: 'AiChat', initialPrompt: prompt });
    } else {
      // 已登录，直接跳转到创建页面
      (navigation as any).navigate('AiChat', { initialPrompt: prompt });
    }
  }, [isAuthenticated, navigation]);


  const [apps, setApps] = useState<Project[]>([]);
  const [allApps, setAllApps] = useState<Project[]>([]); // 存储所有数据，用于搜索过滤
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>(''); // 搜索关键词
  const [isCardMenuOpen, setIsCardMenuOpen] = useState(false); // 是否有卡片菜单打开
  const [categoryDrawerVisible, setCategoryDrawerVisible] = useState(false);
  const [categoryDrawerProject, setCategoryDrawerProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  type CardLayout = { x: number; y: number; width: number; height: number };
  const [cardMenuOverlay, setCardMenuOverlay] = useState<{
    project: Project;
    layout: CardLayout;
  } | null>(null);

  // 覆盖层动画 shared values
  const overlayCardScale = useSharedValue(1);
  const overlayCardTranslateY = useSharedValue(0);
  const overlayCardShadow = useSharedValue(0);
  const overlayMenuOpacity = useSharedValue(0);
  const overlayMenuTranslateY = useSharedValue(-8);
  const overlayScrimOpacity = useSharedValue(0);

  const HEADER_HEIGHT = 120;
  const HEADER_INITIAL_HEIGHT = 120; // 初始header高度（包含logo+name+搜索）
  const HEADER_FINAL_HEIGHT = 68; // 最终header高度（只有搜索+设置）
  const HEADER_COLLAPSE_GAP = HEADER_INITIAL_HEIGHT - HEADER_FINAL_HEIGHT;
  const scrollY = useSharedValue(0);
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.value = Math.max(event.contentOffset.y, 0);
    },
  });

  // Header容器高度动画：从初始高度缩小到最终高度
  const headerContainerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT],
      [HEADER_INITIAL_HEIGHT, HEADER_FINAL_HEIGHT],
      'clamp'
    );
    return { height };
  });

  // Header区域背景色动画：滚动时逐渐显示背景
  const headerBackgroundStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, HEADER_HEIGHT / 2, HEADER_HEIGHT], [0, 0.5, 1], 'clamp');
    return {
      opacity,
    };
  });

  // Logo和Name的透明度及位移动画：滚动时逐渐隐藏并向左移出
  const logoNameStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, HEADER_HEIGHT / 2, HEADER_HEIGHT], [1, 0.5, 0], 'clamp');
    const translateX = interpolate(scrollY.value, [0, HEADER_HEIGHT], [0, -60], 'clamp');
    return {
      opacity,
      transform: [{ translateX }],
    };
  });


  // Header顶部区域高度动画（包含 logo + name + 设置按钮）
  const headerTopAreaStyle = useAnimatedStyle(() => {
    const height = interpolate(scrollY.value, [0, HEADER_HEIGHT], [52, 0], 'clamp');
    return {
      height,
    };
  });

  // Header区域的padding动画：滚动时减少padding
  const headerStyle = useAnimatedStyle(() => ({
    paddingTop: 12,
  }));
  
  // 覆盖层样式
  const overlayCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: overlayCardTranslateY.value },
      { scale: overlayCardScale.value },
    ],
    shadowOpacity: 0.08 + overlayCardShadow.value * 0.27,
    shadowRadius: 8 + overlayCardShadow.value * 4,
    shadowOffset: { width: 0, height: 4 + overlayCardShadow.value * 4 },
    elevation: 2 + overlayCardShadow.value * 4,
  }));

  const overlayMenuStyle = useAnimatedStyle(() => ({
    opacity: overlayMenuOpacity.value,
    transform: [{ translateY: overlayMenuTranslateY.value }],
  }));

  const overlayScrimStyle = useAnimatedStyle(() => ({
    opacity: overlayScrimOpacity.value,
  }));

  // 分类列表加载（与 ProjectActionSheet 中逻辑保持一致）
  const loadCategories = useCallback(async () => {
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
  }, []);

  const getCategoryNameForProject = useCallback(
    (project: Project): string => {
      const key = project.app?.category || project.category || null;
      if (!key) return 'None';
      const found = categories.find(c => c.key === key);
      return found ? found.name : key;
    },
    [categories],
  );

  const openCardMenuOverlay = useCallback((project: Project, layout: CardLayout) => {
    setCardMenuOverlay({ project, layout });
    setIsCardMenuOpen(true);

    // 初始状态
    overlayCardScale.value = 1;
    overlayCardTranslateY.value = 0;
    overlayCardShadow.value = 0;
    overlayMenuOpacity.value = 0;
    overlayMenuTranslateY.value = -8;
    overlayScrimOpacity.value = 0;

    // 阶段1：轻微按下
    overlayCardScale.value = withTiming(
      0.98,
      { duration: 80, easing: Easing.out(Easing.quad) },
      () => {
        // 阶段2：抬起浮起
        overlayCardScale.value = withTiming(1.06, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
        });
        // 位置保持与原卡片一致，不再向上偏移，避免露出底部原卡片
        overlayCardTranslateY.value = withTiming(
          0,
          {
            duration: 200,
            easing: Easing.out(Easing.cubic),
          },
        );
        overlayCardShadow.value = withTiming(1, { duration: 200 });
      },
    );

    // 菜单 & scrim
    overlayMenuOpacity.value = withDelay(
      120,
      withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),
    );
    overlayMenuTranslateY.value = withDelay(
      120,
      withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) }),
    );
    overlayScrimOpacity.value = withDelay(
      100,
      withTiming(0.22, { duration: 180, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const closeCardMenuOverlay = useCallback(() => {
    if (!cardMenuOverlay) return;

    // 反向动画
    overlayMenuOpacity.value = withTiming(0, {
      duration: 160,
      easing: Easing.in(Easing.cubic),
    });
    overlayMenuTranslateY.value = withTiming(-8, {
      duration: 160,
      easing: Easing.in(Easing.cubic),
    });
    overlayScrimOpacity.value = withTiming(0, { duration: 160 });

    overlayCardScale.value = withDelay(
      60,
      withTiming(1, { duration: 200, easing: Easing.in(Easing.cubic) }),
    );
    overlayCardTranslateY.value = withDelay(
      60,
      withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) }),
    );
    overlayCardShadow.value = withDelay(
      60,
      withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) }),
    );

    setTimeout(() => {
      setIsCardMenuOpen(false);
      setCardMenuOverlay(null);
    }, 260);
  }, [cardMenuOverlay]);

  // 加载数据
  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setApps([]);
      setAllApps([]);
      // 未登录时也需要结束 loading 状态，否则空状态组件不会显示
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // 加载更多数据以支持搜索（加载前 100 条）
      const response = await httpClient.getUserMiniapps(100, 0);
      
      console.log('📡 [HomeScreen] API Response:', {
        code: response.code,
        info: response.info,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        ownerCount: response.data?.owner?.length || 0,
        otherCount: response.data?.other?.length || 0,
      });
      
      if (response.code === 0 && response.data) {
        // 合并自己创建的和添加的 MiniApps
        const allProjects = [
          ...(response.data.owner || []),
          ...(response.data.other || []),
        ];
        
        // 打印第一个项目的数据结构
        if (allProjects.length > 0) {
          const firstProject = allProjects[0];
          console.log('📦 [HomeScreen] First Project Data:', {
            project_id: firstProject.project_id,
            name: firstProject.name,
            hasStartupInfo: !!firstProject.startup_info,
            startupInfoKeys: firstProject.startup_info ? Object.keys(firstProject.startup_info) : [],
            web_preview_url: firstProject.startup_info?.web_preview_url,
            preview_url: firstProject.startup_info?.preview_url,
            fullStartupInfo: firstProject.startup_info,
            fullProject: JSON.stringify(firstProject, null, 2),
          });
        }
        
        setAllApps(allProjects);
        // 初始显示所有数据
        setApps(allProjects);
      } else {
        console.error('Failed to load miniapps:', response.info);
        setApps([]);
        setAllApps([]);
      }
    } catch (error) {
      console.error('Error loading miniapps:', error);
      setApps([]);
      setAllApps([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // 处理项目重命名
  const handleProjectRename = useCallback(async (projectId: string, newName: string) => {
    try {
      await handleRename(projectId, newName);
      // 重命名成功后刷新数据
      await loadData();
    } catch (error) {
      // 错误已在useProjectActions中处理
    }
  }, [handleRename, loadData]);

  // 处理项目删除
  const handleProjectDelete = useCallback(async (projectId: string) => {
    try {
      await handleDelete(projectId);
      // 删除成功后刷新数据
      await loadData();
    } catch (error) {
      // 错误已在useProjectActions中处理
    }
  }, [handleDelete, loadData]);

  // 处理切换公开/未公开
  const handleProjectTogglePublic = useCallback(async (projectId: string, isPublic: boolean) => {
    try {
      await handleTogglePublic(projectId, isPublic);
      // 切换成功后刷新数据
      await loadData();
    } catch (error) {
      // 错误已在useProjectActions中处理
    }
  }, [handleTogglePublic, loadData]);

  // 处理分类变更
  const handleProjectCategoryChange = useCallback(async (projectId: string, categoryKey: string) => {
    try {
      await handleCategoryChange(projectId, categoryKey);
      // 变更成功后刷新数据
      await loadData();
    } catch (error) {
      // 错误已在useProjectActions中处理
    }
  }, [handleCategoryChange, loadData]);

  // 搜索过滤逻辑
  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) {
      return allApps;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return allApps.filter((app) => {
      const name = (app.name || '').toLowerCase();
      const description = (app.app?.description || app.description || '').toLowerCase();
      const category = (app.app?.category || app.category || '').toLowerCase();
      
      return name.includes(query) || description.includes(query) || category.includes(query);
    });
  }, [allApps, searchQuery]);

  // 当搜索过滤结果变化时，更新显示的 apps
  useEffect(() => {
    setApps(filteredApps);
  }, [filteredApps]);

  // 初始加载数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      // 每次页面获得焦点时重新加载数据（只在没有搜索查询时）
      if (!searchQuery.trim()) {
        loadData();
      }
    }, [loadData, searchQuery])
  );

  const hasData = apps.length > 0;
  const hasAllData = allApps.length > 0;
  const isSearching = searchQuery.trim().length > 0;
  
  const showDefaultCard = !loading && !hasAllData && !isSearching && !hasData;
  const showSearchEmpty = !loading && isSearching && !hasData;
  const showList = hasData;

  const contentPaddingTop = HEADER_FINAL_HEIGHT + insets.top;
  // 需要为底部 “+ New App” 按钮预留更多空间，避免最后一张卡片被遮挡
  const NEW_APP_BUTTON_HEIGHT = 64;
  const NEW_APP_BUTTON_MARGIN = 50; // 加 10px，让底部更宽松
  const contentPaddingBottom = insets.bottom + NEW_APP_BUTTON_HEIGHT + NEW_APP_BUTTON_MARGIN;

  return (
    <View style={[styles.container, { paddingTop: contentPaddingTop }]}>
      <LiquidGlassBackdrop />
      <Animated.View style={[styles.headerSticky, { paddingTop: insets.top }]}>
        <Animated.View style={[styles.headerContainer, headerContainerStyle]}>
          {/* Header背景层 */}
          <Animated.View style={[styles.headerBackground, headerBackgroundStyle]} />

          <View style={styles.tabbarContent}>
            <Animated.View style={[styles.headerTopArea, headerTopAreaStyle]}>
              <Animated.View style={[styles.header, headerStyle]}>
                <Animated.View style={[styles.headerLeft, logoNameStyle]}>
              {isLiquidGlassSupported ? (
                <LiquidGlassView
                  effect="clear"
                  style={styles.logoContainerLiquidGlass}
                >
                  <View style={styles.logoContainerInner}>
                    <ShortappLogo width={24} height={22} color="#F75A01" />
                  </View>
                </LiquidGlassView>
              ) : (
                <View style={styles.logoContainer}>
                  <ShortappLogo width={24} height={22} color="#F75A01" />
                </View>
              )}
              <Text style={styles.appNameHeader}>ShortApp</Text>
                </Animated.View>

              </Animated.View>
            </Animated.View>

            <Animated.View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <SearchIcon width={19} height={19} color="#5C5C5C" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search"
                placeholderTextColor="#999999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
            </Animated.View>
          </View>
        </Animated.View>
        </Animated.View>

      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
        showsVerticalScrollIndicator={false}
        bounces
        alwaysBounceVertical
        contentInsetAdjustmentBehavior="never"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* 占位：用于抵消 header 折叠前的额外高度 */}
        <View style={styles.headerScrollSpacer} />

        {/* Section Title - Only show when there are apps */}
        {showList && (
          <Text style={styles.sectionTitle}>Your apps</Text>
        )}

        {/* Cards Area */}
        <View style={styles.cardsContainer}>
          {showDefaultCard && !loading && (
            <IdeaStarterEmptyState
              footerHint={'Click the "+" button below to create\na mini app.'}
              onBannerPress={handleCreateNewApp}
            />
          )}

          {/* 搜索无结果提示 */}
          {showSearchEmpty && (
            <View style={styles.searchEmptyContainer}>
              <Text style={styles.searchEmptyText}>
                No apps found for "{searchQuery}"
              </Text>
              <Text style={styles.searchEmptyHint}>
                Try a different search term
              </Text>
            </View>
          )}

          {/* 应用列表 */}
          {showList && (
            <View style={styles.appsList}>
              {apps.map((project) => (
                <HomeProjectCardWithMenu
                  key={project.project_id}
                  project={project}
                  onOpenProject={handleCardPress}
                  onLongPressWithLayout={(p, layout) => openCardMenuOverlay(p, layout)}
                />
              ))}
            </View>
          )}
        </View>

      </Animated.ScrollView>

      {/* 卡片菜单覆盖层：灰色背景 + 放大卡片 + 菜单 */}
      {cardMenuOverlay && (
        <View style={styles.cardMenuOverlay} pointerEvents="box-none">
          {/* 灰色背景：整屏变暗，可点击关闭 */}
          <Animated.View style={[styles.cardMenuScrim, overlayScrimStyle]}>
            <Pressable style={{ flex: 1 }} onPress={closeCardMenuOverlay} />
          </Animated.View>

          {/* 放大的卡片：点击卡片本身也会收起菜单并打开 App */}
          <Pressable
            onPress={() => {
              closeCardMenuOverlay();
              //handleCardPress(cardMenuOverlay.project);
            }}
          >
            <Animated.View
              style={[
                styles.overlayCard,
                overlayCardStyle,
                {
                  left: cardMenuOverlay.layout.x,
                  top: cardMenuOverlay.layout.y,
                  width: cardMenuOverlay.layout.width,
                  height: cardMenuOverlay.layout.height,
                },
              ]}
            >
              <View style={styles.appIconContainer}>
                <LinearGradient
                  colors={generateRandomGradient(cardMenuOverlay.project.project_id)}
                  start={getRandomGradientDirection(cardMenuOverlay.project.project_id).start}
                  end={getRandomGradientDirection(cardMenuOverlay.project.project_id).end}
                  style={styles.appIcon}
                >
                  <Text style={styles.appIconText}>
                    {getProjectInitial(cardMenuOverlay.project.name)}
                  </Text>
                </LinearGradient>
              </View>
              <Text style={styles.appCardName} numberOfLines={2}>
                {cardMenuOverlay.project.name}
              </Text>
            </Animated.View>
          </Pressable>

          {/* 菜单：贴在卡片下方，最外层使用 LiquidGlassView 效果 */}
          <Animated.View
            style={[
              styles.cardMenuContainer,
              overlayMenuStyle,
              (() => {
                const rawWidth = cardMenuOverlay.layout.width + 24;
                const width = Math.min(rawWidth, SCREEN_WIDTH - 40);
                const cardCenter =
                  cardMenuOverlay.layout.x + cardMenuOverlay.layout.width / 2;

                // 计算是显示在卡片上方还是下方
                const cardBottom =
                  cardMenuOverlay.layout.y + cardMenuOverlay.layout.height;
                const availableBelow = SCREEN_HEIGHT - cardBottom;
                const reservedBottom = insets.bottom + 120; // 预留给底部 nav 和 New App 区域
                const showAbove =
                  availableBelow < APPROX_MENU_HEIGHT + reservedBottom &&
                  cardMenuOverlay.layout.y > APPROX_MENU_HEIGHT + 40;

                // 横向位置：左列左对齐，右列右对齐
                let left: number;
                if (cardCenter < SCREEN_WIDTH / 2) {
                  // 左列：整体略向左扩展，尽量左对齐，但不出屏幕
                  left = Math.max(14, cardMenuOverlay.layout.x - 8);
                  left = Math.min(left, SCREEN_WIDTH - 14 - width);
                } else {
                  // 右列：右对齐，让菜单右边与卡片右边对齐
                  const desiredRight =
                    cardMenuOverlay.layout.x + cardMenuOverlay.layout.width+8;
                  left = Math.min(
                    Math.max(14, desiredRight - width),
                    SCREEN_WIDTH - 14 - width,
                  );
                }

                return {
                  left,
                  top: showAbove
                    ? cardMenuOverlay.layout.y - 14 - APPROX_MENU_HEIGHT
                    : cardBottom + 14,
                  width,
                };
              })(),
            ]}
          >
            {isLiquidGlassSupported ? (
              <LiquidGlassView effect="clear" style={styles.cardMenuLiquid}>
                {/* Rename */}
                <Pressable
                  style={styles.cardMenuItem}
                  onPress={() => {
                    closeCardMenuOverlay();
                    Alert.prompt(
                      'Rename Project',
                      'Enter new project name:',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Rename',
                          onPress: (newName?: string) => {
                            if (newName && newName.trim()) {
                              handleProjectRename(
                                cardMenuOverlay.project.project_id,
                                newName.trim(),
                              );
                            }
                          },
                        },
                      ],
                      'plain-text',
                      cardMenuOverlay.project.name,
                    );
                  }}
                >
                  <View style={styles.cardMenuItemContent}>
                    <View style={styles.cardMenuIcon}>
                      <Icon name="Create" size={20} color="#111111" />
                    </View>
                    <Text style={styles.cardMenuText}>Rename</Text>
                  </View>
                </Pressable>

                {/* Publish / Published */}
                <Pressable
                  style={styles.cardMenuItem}
                  onPress={() => {
                    const isPublic =
                      cardMenuOverlay.project.app?.isPublic ??
                      cardMenuOverlay.project.isPublic ??
                      false;
                    if (isPublic) {
                      return; // 已发布，禁止反向操作
                    }
                    const newIsPublic = true;
                    closeCardMenuOverlay();
                    Alert.alert(
                      'Publish Project',
                      'Do you want to publish this project?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Confirm',
                          onPress: () =>
                            handleProjectTogglePublic(
                              cardMenuOverlay.project.project_id,
                              newIsPublic,
                            ),
                        },
                      ],
                    );
                  }}
                >
                  <View style={styles.cardMenuItemContent}>
                    <View style={styles.cardMenuIcon}>
                      <Icon
                        name="Eye"
                        size={20}
                        color="#111111"
                      />
                    </View>
                    <Text style={styles.cardMenuText}>
                      {(cardMenuOverlay.project.app?.isPublic ??
                        cardMenuOverlay.project.isPublic ??
                        false)
                        ? 'Published'
                        : 'Publish'}
                    </Text>
                  </View>
                </Pressable>

                {/* Category：LiquidGlass 抽屉 + 当前分类名称 */}
                <Pressable
                  style={styles.cardMenuItem}
                  onPress={() => {
                    closeCardMenuOverlay();
                    setCategoryDrawerProject(cardMenuOverlay.project);
                    setCategoryDrawerVisible(true);
                    if (categories.length === 0 && !loadingCategories) {
                      loadCategories();
                    }
                  }}
                >
                  <View style={styles.cardMenuItemContent}>
                    <View style={styles.cardMenuIcon}>
                      <Icon name="Tag" size={20} color="#111111" />
                    </View>
                    <Text
                      style={styles.cardMenuText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {`Category: ${getCategoryNameForProject(cardMenuOverlay.project)}`}
                    </Text>
                  </View>
                </Pressable>

                {/* Share */}
                <Pressable
                  style={styles.cardMenuItem}
                  onPress={async () => {
                    closeCardMenuOverlay();
                    try {
                      const project = cardMenuOverlay.project;
                      const isPublic = project.app?.isPublic ?? project.isPublic ?? false;
                      
                      await ensurePublishedAndShare({
                        project,
                        isPublic,
                        currentUserId: user?.user_id ?? null,
                        publish: () => handleProjectTogglePublic(project.project_id, true),
                      });
                    } catch (e) {
                      console.error('❌ [HomeScreen] Error sharing project:', e);
                      Alert.alert('Error', 'Failed to share project');
                    }
                  }}
                >
                  <View style={styles.cardMenuItemContent}>
                    <View style={styles.cardMenuIcon}>
                      <Icon name="Share" size={20} color="#111111" />
                    </View>
                    <Text style={styles.cardMenuText}>Share</Text>
                  </View>
                </Pressable>

                {/* Delete */}
                <Pressable
                  style={[styles.cardMenuItem, styles.cardMenuItemDanger]}
                  onPress={() => {
                    closeCardMenuOverlay();
                    Alert.alert(
                      'Delete Project',
                      `Are you sure you want to delete "${cardMenuOverlay.project.name}"? This action cannot be undone.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () =>
                            handleProjectDelete(cardMenuOverlay.project.project_id),
                        },
                      ],
                    );
                  }}
                >
                  <View style={styles.cardMenuItemContent}>
                    <View style={styles.cardMenuIcon}>
                      <Icon name="Trash" size={20} color="#d32f2f" />
                    </View>
                    <Text style={[styles.cardMenuText, { color: '#d32f2f' }]}>Delete</Text>
                  </View>
                </Pressable>
              </LiquidGlassView>
            ) : null}
          </Animated.View>
        </View>
      )}

      {/* Project Action Sheet */}
      <ProjectActionSheet
        visible={actionSheetVisible}
        project={selectedProject}
        onClose={hideActionSheet}
        onRename={handleProjectRename}
        onDelete={handleProjectDelete}
        onTogglePublic={handleProjectTogglePublic}
        onCategoryChange={handleProjectCategoryChange}
        currentUserId={user?.user_id ?? null}
      />

      {/* 进度条（处理项目启动时显示） */}
      {isProcessing && (
        <View style={styles.progressOverlay}>
          {isLiquidGlassSupported ? (
            <LiquidGlassView effect="regular" style={styles.progressContainer}>
              <View style={styles.progressContainerInner}>
                <Text style={styles.progressText}>Starting project...</Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
              </View>
            </LiquidGlassView>
          ) : (
            <BlurView
              style={styles.progressContainer}
              blurType="light"
              blurAmount={20}
              reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.9)"
            >
              <View style={styles.progressContainerInner}>
                <Text style={styles.progressText}>Starting project...</Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
              </View>
            </BlurView>
          )}
        </View>
      )}

      {/* 分类选择抽屉：使用 LiquidGlass 效果的 CategoryModal */}
      {categoryDrawerProject && (
        <CategoryModal
          visible={categoryDrawerVisible}
          selectedCategoryKey={
            categoryDrawerProject.app?.category ||
            categoryDrawerProject.category ||
            null
          }
          categories={categories}
          onClose={() => setCategoryDrawerVisible(false)}
          onCategorySelect={(categoryKey: string) => {
            setCategoryDrawerVisible(false);
            handleProjectCategoryChange(categoryDrawerProject.project_id, categoryKey);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  headerSticky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'transparent',
  },
  headerContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  tabbarContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  headerTopArea: {
    overflow: 'hidden',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F3F2F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerScrollSpacer: {
    height: HEADER_COLLAPSE_GAP,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoContainerLiquidGlass: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
  },
  logoContainerInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appNameHeader: {
    fontSize: 24,
    fontWeight: '500',
    color: '#000000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    padding: 0,
    marginLeft: 8,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: '#999999',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#484848',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  cardsContainer: {
    paddingHorizontal: 20,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'flex-start', // 改为 flex-start，让列表从顶部开始
  },
  searchEmptyContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  searchEmptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#484848',
    textAlign: 'center',
    marginBottom: 8,
  },
  searchEmptyHint: {
    fontSize: 15,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#999999',
  },
  expandingContainer: {
    width: '100%', // 与 appsList 一致，使用 100% 宽度
    minHeight: 400,
    height: 400, // 固定高度，用于居中计算
    position: 'relative',
    alignItems: 'center', // 改为 center，用于居中显示
    justifyContent: 'center', // 改为 center，用于居中显示
  },
  expandingCard: {
    position: 'absolute',
    width: (SCREEN_WIDTH - 60) / 2,
    height: (SCREEN_WIDTH - 60) / 2, // 正方形卡片
    // 初始位置在容器正中心
    // 使用 left 和 top 定位，通过 transform 进行动画
    left: '50%',
    top: '50%', // 容器高度的50%，居中显示
    marginLeft: -((SCREEN_WIDTH - 60) / 4), // 卡片宽度的一半，使卡片中心对齐容器中心
    marginTop: -((SCREEN_WIDTH - 60) / 4), // 卡片高度的一半，使卡片中心对齐容器中心
  },
  cardPlaceholder: {
    width: '100%',
    height: '100%',
    // backgroundColor 将在组件中动态设置
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  appsList: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  appCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    height: (SCREEN_WIDTH - 60) / 2, // 正方形卡片
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
  },
  appCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginTop: 8,
    // 固定两行高度，即便只有一行也预留空间
    lineHeight: 18,
    height: 36, // 2 * lineHeight
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
  starHalf: {
    color: '#666666',
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  progressContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    width: SCREEN_WIDTH - 80,
  },
  progressContainerInner: {
    padding: 24,
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
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
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
  cardMenuScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
  },
  cardMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  overlayCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
  },
  cardMenuContainer: {
    position: 'absolute',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    overflow: 'hidden',
  },
  cardMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cardMenuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMenuIcon: {
    marginRight: 10,
  },
  cardMenuText: {
    fontSize: 16,
    color: '#111',
  },
  cardMenuItemDanger: {
    borderTopWidth: 8,
    borderTopColor: 'transparent',
  },
  cardMenuLiquid: {
    borderRadius: 18,
    paddingVertical: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});

