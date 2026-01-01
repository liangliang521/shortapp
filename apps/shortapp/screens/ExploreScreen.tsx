/**
 * ExploreScreen - 发现页面
 * 完全按照UI设计实现，支持可滑动的分类切换和卡片跳转
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
  RefreshControl,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import PagerView from 'react-native-pager-view';
import { Category, Project, RankItem } from '@vibecoding/api-client/src/types';
import { httpClient } from '@vibecoding/api-client';
import { LiquidGlassBackdrop } from '../components/LiquidGlassBackdrop';
import LinearGradient from 'react-native-linear-gradient';
import { useProjectNavigation } from '../hooks/useProjectNavigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// 生成随机 users 数量（10-1000）
const generateRandomUsers = (seed?: string): number => {
  if (seed) {
    // 基于 seed 生成稳定的随机数
    const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 10 + (hash % 991); // 10-1000
  }
  return Math.floor(Math.random() * 991) + 10; // 10-1000
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

// 生成随机作者名
const generateRandomAuthor = (seed?: string): string => {
  const authors = [
    'Alex', 'Blake', 'Casey', 'Drew', 'Eden', 'Finley', 'Gray', 'Harper',
    'Ivy', 'Jordan', 'Kai', 'Logan', 'Morgan', 'Noah', 'Quinn', 'Riley',
    'Sage', 'Taylor', 'Quan', 'black', 'white', 'blue', 'green', 'red',
  ];
  if (seed) {
    const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return authors[hash % authors.length];
  }
  return authors[Math.floor(Math.random() * authors.length)];
};


// 单个分类的应用列表组件
interface CategoryAppListProps {
  category: Category;
  onCardPress: (project: Project) => void;
}

const CategoryAppList: React.FC<CategoryAppListProps> = ({ category, onCardPress }) => {
  const navigation = useNavigation();
  
  // 处理卡片点击：先获取最新的 project 信息，再跳转
  const handleCardPress = useCallback(async (rankItem: RankItem) => {
    try {
      // 调用 API 获取最新的 project 信息
      const response = await httpClient.getProject(rankItem.project_id);
      if (response.code === 0 && response.data) {
        onCardPress(response.data);
      } else {
        console.error('Failed to get project:', response.info);
        // 如果需要登录，跳转到登录页面
        const errorInfo = response.info || '';
        const needsLogin = response.code === 401 || 
                          errorInfo.toLowerCase().includes('login') || 
                          errorInfo.includes('Please login');
        
        if (needsLogin) {
          console.log('需要登录，跳转到登录页面');
          (navigation as any).navigate('Login', { 
            redirectTo: 'ProjectWebView',
            projectId: rankItem.project_id 
          });
        }
      }
    } catch (error) {
      console.error('Error getting project:', error);
    }
  }, [onCardPress, navigation]);
  const [apps, setApps] = useState<RankItem[]>([]);
  const [featuredApps, setFeaturedApps] = useState<RankItem[]>([]); // Banner 数据
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20; // 每页加载数量
  const scrollViewRef = useRef<ScrollView>(null);
  const offsetRef = useRef<number>(0);

  // 加载应用列表
  const loadApps = useCallback(async (reset: boolean = false) => {
    try {
      if (reset) {
        // 刷新时，如果是初始加载（不是下拉刷新），则设置 loading
        // 下拉刷新时，refreshing 状态由 handleRefresh 设置
        // 这里通过检查 refreshing 来判断是否是下拉刷新
        // 但由于状态更新是异步的，我们使用一个更简单的方法：
        // 在 handleRefresh 中已经设置了 refreshing，所以这里不需要再设置 loading
        offsetRef.current = 0;
      } else {
        setLoadingMore(true);
      }

      const currentOffset = offsetRef.current;

      // 获取该分类的应用榜单（featured=false 获取正常榜单数据）
      const response = await httpClient.getRankByCategory(category.key, false);
      
      console.log('📡 [ExploreScreen] API Response for category:', category.key, {
        code: response.code,
        info: response.info,
        data: JSON.stringify(response.data, null, 2),
        dataLength: response.data?.length || 0,
        offset: currentOffset,
        limit: limit,
      });
      
      if (response.code === 0 && response.data) {
        // 直接使用 RankItem 数据，不进行转换
        const rankItems = response.data;
        
        // 分页处理：根据 offset 和 limit 截取数据
        const startIndex = currentOffset;
        const endIndex = startIndex + limit;
        const paginatedItems = rankItems.slice(startIndex, endIndex);
        
        // 判断是否还有更多数据
        const hasMoreData = endIndex < rankItems.length;
        
        console.log('📊 [ExploreScreen] 数据处理完成', {
          reset,
          totalCount: rankItems.length,
          paginatedCount: paginatedItems.length,
          hasMoreData,
          currentOffset: offsetRef.current,
        });
        
        if (reset) {
          setApps(paginatedItems);
          offsetRef.current = paginatedItems.length;
        } else {
          setApps(prev => {
            const newApps = [...prev, ...paginatedItems];
            offsetRef.current = newApps.length;
            return newApps;
          });
        }
        
        setHasMore(hasMoreData);
      } else {
        // API 失败时
        if (reset) {
          setApps([]);
          offsetRef.current = 0;
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading apps for category:', category.key, error);
      if (reset) {
        setApps([]);
      }
      setHasMore(false);
    } finally {
      // 重置 loading 和 loadingMore 状态
      // refreshing 状态由 handleRefresh 的 finally 块管理，避免重复设置
      setLoading(false);
      setLoadingMore(false);
      console.log('🏁 [ExploreScreen] loadApps 完成，重置状态', { reset });
    }
  }, [category.key, limit]);

  // 加载 Banner 数据（featured=true）
  const loadFeaturedApps = useCallback(async () => {
    try {
      const response = await httpClient.getRankByCategory(category.key, true);
      
      console.log('📡 [ExploreScreen] Featured Apps API Response for category:', category.key, {
        code: response.code,
        info: response.info,
        dataLength: response.data?.length || 0,
      });
      
      if (response.code === 0 && response.data) {
        // 直接使用 RankItem 数据，不进行转换
        setFeaturedApps(response.data);
      } else {
        setFeaturedApps([]);
      }
    } catch (error) {
      console.error('Error loading featured apps for category:', category.key, error);
      setFeaturedApps([]);
    }
  }, [category.key]);

  // 初始加载
  useEffect(() => {
    offsetRef.current = 0;
    setLoading(true);
    loadApps(true);
    loadFeaturedApps(); // 同时加载 banner 数据
  }, [category.key, loadApps, loadFeaturedApps]);

  // 下拉刷新
  const handleRefresh = useCallback(async () => {
    console.log('🔄 [ExploreScreen] 开始下拉刷新');
    setRefreshing(true);
    try {
      await Promise.all([
        loadApps(true),
        loadFeaturedApps(), // 同时刷新 banner 数据
      ]);
    } catch (error) {
      console.error('❌ [ExploreScreen] 下拉刷新失败:', error);
    } finally {
      // 确保刷新状态被重置
      setRefreshing(false);
    }
  }, [loadApps, loadFeaturedApps]);

  // 上拉加载更多
  const handleLoadMore = useCallback(() => {
    console.log('📥 [ExploreScreen] handleLoadMore 被调用', {
      loadingMore,
      hasMore,
      loading,
      refreshing,
    });
    if (!loadingMore && hasMore && !loading && !refreshing) {
      console.log('✅ [ExploreScreen] 开始加载更多');
      loadApps(false);
    } else {
      console.log('⚠️ [ExploreScreen] 跳过加载更多，条件不满足');
    }
  }, [loadingMore, hasMore, loading, refreshing, loadApps]);

  // 监听滚动到底部
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    
    if (isCloseToBottom) {
      console.log('📜 [ExploreScreen] 滚动到底部，触发加载更多');
      handleLoadMore();
    }
  }, [handleLoadMore]);

  // 底部列表显示所有应用
  const regularApps = apps;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F75A01" />
      </View>
    );
  }

  const hasBanner = !loading && featuredApps.length > 0;

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.categoryScrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#F75A01"
        />
      }
      onScroll={handleScroll}
      scrollEventThrottle={400}
    >
      {/* 特色应用卡片 - 横向滚动 */}
      {hasBanner && (
        <View style={styles.featuredScrollView}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.featuredBannerScrollView}
          contentContainerStyle={styles.featuredScrollContent}
        >
            {featuredApps.map((featuredApp) => (
              <Pressable
                key={featuredApp.project_id}
                style={styles.featuredCard}
                onPress={() => handleCardPress(featuredApp)}
              >
                <Text style={styles.featuredTitle}>{featuredApp.name || 'Unnamed App'}</Text>
                <View style={styles.featuredInfoRow}>
                  {(() => {
                    const gradientDir = getRandomGradientDirection(featuredApp.project_id);
                    return (
                      <LinearGradient
                        colors={generateRandomGradient(featuredApp.project_id)}
                        start={gradientDir.start}
                        end={gradientDir.end}
                        style={styles.featuredIcon}
                      >
                        <Text style={styles.featuredIconText}>
                          {featuredApp.name?.charAt(0).toUpperCase() || 'A'}
                        </Text>
                      </LinearGradient>
                    );
                  })()}
                  <View style={styles.featuredRightColumn}>
                      <Text style={styles.featuredDescription} numberOfLines={2}>
                        {featuredApp.description || 'No description'}
                      </Text>
                    <View style={styles.featuredMetaRow}>
                      <View style={styles.featuredAuthorRow}>
                        <View style={styles.featuredAuthorDot} />
                        <Text style={styles.featuredAuthorName} numberOfLines={1} ellipsizeMode="tail">
                          {featuredApp.userName || featuredApp.name || 'Unknown'}
                        </Text>
                      </View>
                      <View style={styles.featuredActionButton}>
                        <Text style={styles.featuredActionText}>Experience</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
        </ScrollView>
        </View>

      )}

     {regularApps.length > 0 && (<View style={[styles.marketHeader, !hasBanner && styles.marketHeaderNoBanner]}>
        <Text style={styles.marketTitle}>Market</Text>
      </View>)}

      {/* 应用列表 */}
      <View style={[styles.appsList, !hasBanner && styles.appsListNoBanner]}>
        {regularApps.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No apps in this category</Text>
          </View>
        ) : (
          regularApps.map((app) => (
            <Pressable
              key={app.project_id}
              style={styles.appCard}
              onPress={() => handleCardPress(app)}
            >
              <View style={styles.appCardLeft}>
                {(() => {
                  const gradientDir = getRandomGradientDirection(app.project_id);
                  return (
                    <LinearGradient
                      colors={generateRandomGradient(app.project_id)}
                      start={gradientDir.start}
                      end={gradientDir.end}
                      style={styles.appIconPlaceholder}
                    >
                  <Text style={styles.appIconText}>
                    {app.name?.charAt(0).toUpperCase() || 'A'}
                  </Text>
                    </LinearGradient>
                  );
                })()}
              </View>
              <View style={styles.appCardRight}>
                <Text style={styles.appTitle}>{app.name || 'Unnamed App'}</Text>
                <Text style={styles.appAuthor}>
                  @{app.userName || app.name || 'Unknown'}
                </Text>
                <View style={styles.appDescriptionContainer}>
                <Text style={styles.appDescription} numberOfLines={2}>
                  {app.description || 'No description'}
                </Text>
                </View>
              </View>
            </Pressable>
          ))
        )}

        {/* 加载更多指示器 - 只在有数据时显示 */}
        {regularApps.length > 0 && loadingMore && hasMore && (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color="#F75A01" />
            <Text style={styles.loadMoreText}>Loading more...</Text>
          </View>
        )}

        {/* 没有更多数据提示 - 只在上拉加载时显示 */}
        {regularApps.length > 0 && loadingMore && !hasMore && (
          <View style={styles.loadMoreContainer}>
            <Text style={styles.loadMoreText}>No more apps</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export const ExploreScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const pagerRef = useRef<PagerView>(null);
  const categoriesScrollRef = useRef<ScrollView>(null);
  const categoryButtonLayouts = useRef<{ [key: number]: { x: number; width: number } }>({});
  const scrollViewLayout = useRef<{ width: number; contentWidth: number }>({ width: 0, contentWidth: 0 });
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // 加载分类数据
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        console.log('📡 [ExploreScreen] 开始加载分类数据...');
        const response = await httpClient.getCategorys();
        
        console.log('📡 [ExploreScreen] 分类数据 API 响应:', {
          code: response.code,
          info: response.info,
          hasData: !!response.data,
          dataType: typeof response.data,
          dataLength: Array.isArray(response.data) ? response.data.length : 'not array',
          data: JSON.stringify(response.data, null, 2),
        });
        
        if (response.code === 0 && response.data) {
          // 确保 data 是数组
          const categoriesData = Array.isArray(response.data) ? response.data : [];
          console.log('✅ [ExploreScreen] 成功加载分类数据，数量:', categoriesData.length);
          setCategories(categoriesData);
        } else {
          // API 返回错误，保持空数组
          console.error('❌ [ExploreScreen] 加载分类失败:', {
            code: response.code,
            info: response.info,
            data: response.data,
          });
          setCategories([]);
        }
      } catch (error) {
        console.error('❌ [ExploreScreen] 加载分类异常:', error);
        // 请求失败，保持空数组
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  // 滚动到选中按钮并居中
  const scrollToCategoryCenter = useCallback((index: number, immediate: boolean = false) => {
    // 清除之前的延迟滚动
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }

    const performScroll = () => {
      // 如果正在滚动中，等待完成
      if (isScrollingRef.current && !immediate) {
        scrollTimeoutRef.current = setTimeout(() => {
          scrollToCategoryCenter(index, true);
        }, 50) as unknown as NodeJS.Timeout;
        return;
      }

      const buttonLayout = categoryButtonLayouts.current[index];
      if (!buttonLayout || !scrollViewLayout.current.width) {
        // 如果布局还没准备好，延迟重试
        if (!immediate) {
          scrollTimeoutRef.current = setTimeout(() => {
            scrollToCategoryCenter(index, true);
          }, 50) as unknown as NodeJS.Timeout;
        }
        return;
      }

      const screenWidth = scrollViewLayout.current.width;
      const buttonCenter = buttonLayout.x + buttonLayout.width / 2;
      const screenCenter = screenWidth / 2;
      
      // 计算需要的滚动位置：按钮中心位置 - 屏幕中心位置
      let scrollX = buttonCenter - screenCenter;
      
      // 处理边界情况
      const maxScrollX = scrollViewLayout.current.contentWidth - screenWidth;
      if (scrollX < 0) {
        scrollX = 0; // 左边已经到头
      } else if (scrollX > maxScrollX) {
        scrollX = maxScrollX; // 右边已经到头
      }

      isScrollingRef.current = true;
      categoriesScrollRef.current?.scrollTo({
        x: scrollX,
        animated: !immediate,
      });

      // 动画完成后重置状态（动画大约300ms，增加延迟让滚动感觉更平滑）
      if (!immediate) {
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 450);
      } else {
        isScrollingRef.current = false;
      }
    };

    // 使用 requestAnimationFrame 确保在下一帧执行，布局已经更新
    // 添加延迟让滚动更平滑，速度更适中
    if (immediate) {
      performScroll();
    } else {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            performScroll();
          }, 50);
        });
      });
    }
  }, []);

  // 当分类加载完成或选中分类变化时，滚动到选中位置
  useEffect(() => {
    if (!loading && categories.length > 0) {
      // 使用 requestAnimationFrame 确保布局已完成
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToCategoryCenter(selectedCategoryIndex);
        });
      });
    }
  }, [loading, categories.length, selectedCategoryIndex, scrollToCategoryCenter]);

  // 处理分类选项卡点击
  const handleCategoryPress = useCallback((index: number) => {
    setSelectedCategoryIndex(index);
    pagerRef.current?.setPage(index);
    // 添加小延迟让滚动更平滑
    setTimeout(() => {
      scrollToCategoryCenter(index);
    }, 100);
  }, [scrollToCategoryCenter]);

  // 处理 PagerView 页面变化
  const handlePageSelected = useCallback((e: any) => {
    const index = e.nativeEvent.position;
    setSelectedCategoryIndex(index);
    // 添加小延迟让滚动更平滑
    setTimeout(() => {
      scrollToCategoryCenter(index);
    }, 100);
  }, [scrollToCategoryCenter]);

  // 项目导航相关（包含进度条逻辑）
  const { handleProjectPress, progress, isProcessing } = useProjectNavigation();

  // 处理卡片点击
  const handleCardPress = useCallback(async (project: Project) => {
    await handleProjectPress(project);
  }, [handleProjectPress]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LiquidGlassBackdrop />
      {/* 标题 */}
      <View style={styles.header}>
        <Text style={styles.title}>Apps</Text>
      </View>

      {/* 固定的分类筛选器 */}
      <View style={styles.stickyCategories}>
        <ScrollView
          ref={categoriesScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
          onLayout={(e) => {
            const { width } = e.nativeEvent.layout;
            scrollViewLayout.current.width = width;
          }}
          onContentSizeChange={(contentWidth) => {
            scrollViewLayout.current.contentWidth = contentWidth;
          }}
        >
          {categories.map((category, index) => (
            <LinearGradient
              key={category.id} 
              colors={['#FF6B20', '#FC9C6B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.categoryButtonGradient}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                categoryButtonLayouts.current[index] = { x, width };
              }}
            >
              <Pressable
                onPress={() => handleCategoryPress(index)}
                style={[
                  styles.categoryButton,
                  selectedCategoryIndex === index && styles.categoryButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategoryIndex === index && styles.categoryTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </Pressable>
            </LinearGradient>
          ))}
        </ScrollView>
      </View>

      {/* 可滑动的分类内容区域 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F75A01" />
        </View>
      ) : (
        <PagerView
          ref={pagerRef}
          style={styles.pagerView}
          initialPage={0}
          onPageSelected={handlePageSelected}
        >
          {categories.map((category) => (
            <View key={category.id} style={styles.page}>
              <CategoryAppList
                category={category}
                onCardPress={handleCardPress}
              />
            </View>
          ))}
        </PagerView>
      )}

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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
  },
  stickyCategories: {
    backgroundColor: 'transparent',
    paddingTop: 8,
    paddingBottom: 12, // 增加底部 padding 给阴影留空间
    zIndex: 100,
  },
  categoriesContainer: {
    marginBottom: 24,
    paddingBottom: 4, // 增加底部 padding 给阴影留空间
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryButtonActive: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  categoryButtonGradient: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  categoryScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 160, // 留出 “+ New App” 按钮和 TabBar 的空间，避免列表底部被遮挡
    paddingTop: 0,
    flexGrow: 1, // 允许内容容器增长以填充可用空间
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredScrollView: {
    marginBottom: 0,
    height: 185,
  },
  featuredBannerScrollView: {
  },
  featuredScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 16,
  },
  featuredCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    width: SCREEN_WIDTH - 40,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 6,
    gap: 16,
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 0,
  },
  featuredInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featuredIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    flexShrink: 0,
  },
  featuredIconText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  featuredRightColumn: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 80,
  },
  featuredDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#0D0D0D',
    marginBottom: 12,
  },
  featuredMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  featuredAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  featuredAuthorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#CCCCCC',
    flexShrink: 0,
  },
  featuredAuthorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    flex: 1,
    minWidth: 0,
  },
  featuredActionButton: {
    backgroundColor: '#F1701A',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    flexShrink: 0,
  },
  featuredActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  marketHeader: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  marketHeaderNoBanner: {
    paddingTop: 0, // 没有 banner 时减少顶部间距
  },
  marketTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0D0D0D',
  },
  appsList: {
    paddingHorizontal: 20,
    flex: 1,
  },
  appsListNoBanner: {
    marginTop: -12, // 减少没有 banner 时的间距
  },
  appCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  appCardLeft: {
    marginRight: 16,
  },
  appIconPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appIconText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appCardRight: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 64, // 与左侧 Icon 高度对齐
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  appAuthor: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 8,
  },
  appDescriptionContainer: {
    justifyContent: 'flex-end',
    flex: 1,
  },
  appDescription: {
    fontSize: 14,
    lineHeight: 14,
    fontWeight: '600',
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
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
