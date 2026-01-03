/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainer,
  Theme,
  useNavigationState,
  useNavigation,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { BlurView } from '@react-native-community/blur';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '@callstack/liquid-glass';
import LinearGradient from 'react-native-linear-gradient';
import React, { useEffect } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

// App Tracking Transparency
let requestTrackingPermission = null;
let getTrackingStatus = null;

// 注意：这里仅负责"尝试"加载模块；如果依赖未正确安装，会打印 warning，但不会导致崩溃
if (Platform.OS === 'ios') {
  try {
    // 使用 require 而不是 import，避免在 Web / 测试环境下打包失败
    // 在原生依赖正确安装（yarn install + pod install）后，这里会正常返回模块
    const trackingModule = require('react-native-tracking-transparency');
    requestTrackingPermission = trackingModule.requestTrackingPermission;
    getTrackingStatus = trackingModule.getTrackingStatus;

    if (requestTrackingPermission && getTrackingStatus) {
      console.log('✅ [App] react-native-tracking-transparency loaded successfully');
    } else {
      console.warn(
        '⚠️ [App] react-native-tracking-transparency loaded, but methods are missing',
        trackingModule,
      );
    }
  } catch (error) {
    // 仅在模块真实不存在或未正确安装时会进入这里
    console.warn('⚠️ [App] react-native-tracking-transparency not available:', error);
  }
}
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  LiquidGlassTabBar,
} from './components/LiquidGlassTabBar';
import { HomeScreen } from './screens/HomeScreen';
import { ExploreScreen } from './screens/ExploreScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SubscriptionScreen } from './screens/SubscriptionScreen';
import { AuthProvider } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import ProjectWebViewScreen from './screens/ProjectWebViewScreen';
import AiChatScreen from './screens/AiChatScreen';
import { useAuth } from './hooks/useAuth';
import { useDeepLink } from './hooks/useDeepLink';
import { configureAnalytics, analytics } from '@vibecoding/analytics';
import { OAUTH_CONFIG } from './config/oauth';
import { createThinkingDataDelegate } from './utils/thinkingDataDelegate';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const tabConfig = [
  {
    name: 'Home',
    title: 'Home',
    component: HomeScreen,
    icon: 'home',
  },
  {
    name: 'Explore',
    title: 'Explore',
    component: ExploreScreen,
    icon: 'explore',
  },
  {
    name: 'SettingsTab',
    title: 'Settings',
    component: SettingsScreen,
    icon: 'settings',
  },
];

const darkTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: '#7acbff',
    background: 'transparent',
    card: 'transparent',
    text: '#f3f4f6',
    border: 'transparent',
    notification: '#ffb7e8',
  },
};

const lightTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    primary: '#0075ff',
    background: 'transparent',
    card: 'transparent',
    text: '#0b1220',
    border: 'transparent',
    notification: '#ff85c4',
  },
};

function LiquidGlassScreen({ title }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.screenHint}>Liquid Glass</Text>
      <Text style={styles.screenTitle}>{title}</Text>
      <Text style={styles.screenCopy}>
        欢迎来到全新的液态玻璃体验。后续的模块都将延续这种动感和半透明的视觉语言。
      </Text>
    </View>
  );
}

// Context 用于共享路由状态
const NavigationStateContext = React.createContext({
  currentRoute: 'MainTabs',
  setCurrentRoute: () => {},
});

// 内部组件：用于在 NavigationContainer 内部获取路由状态
function FloatingNewAppButton() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { currentRoute } = React.useContext(NavigationStateContext);
  const { isAuthenticated } = useAuth();

  // 需要隐藏 New App 按钮的页面
  const hiddenPages = ['Login', 'Settings', 'SettingsTab', 'Subscription', 'ProjectWebView', 'AiChat'];
  const shouldShowNewAppButton = !hiddenPages.includes(currentRoute);

  const handleNewApp = () => {
    console.log('New App clicked, isAuthenticated:', isAuthenticated);
    if (!isAuthenticated) {
      // 未登录，跳转到登录页面
      console.log('User not authenticated, navigating to Login');
      navigation.navigate('Login', { redirectTo: 'AiChat' });
    } else {
      // 已登录，直接跳转到创建页面
      console.log('User authenticated, navigating to AiChat');
      navigation.navigate('AiChat');
    }
  };

  if (!shouldShowNewAppButton) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.floatingButtonWrapper,
        { bottom: insets.bottom + 60 },
      ]}
    >
      <Pressable
        onPress={handleNewApp}
        style={styles.floatingButtonPressable}
        accessibilityRole="button"
        accessibilityLabel="Create new app"
      >
        <NewAppButton />
      </Pressable>
    </View>
  );
}

// 内部组件：处理深链导航
function DeepLinkHandler() {
  console.log('🔗🔗🔗 [DeepLinkHandler] ===== COMPONENT RENDERED =====');
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const { processPendingDeepLink, deepLinkState } = useDeepLink();
  
  console.log('🔗 [DeepLinkHandler] Navigation ready:', !!navigation);
  console.log('🔗 [DeepLinkHandler] isAuthenticated:', isAuthenticated);
  console.log('🔗 [DeepLinkHandler] deepLinkState:', deepLinkState);

  // 处理待处理的深链 - 当 deepLinkState 变化时触发
  React.useEffect(() => {
    console.log('🔗🔗🔗 [DeepLinkHandler] ===== useEffect TRIGGERED =====');
    console.log('🔗 [DeepLinkHandler] deepLinkState:', deepLinkState);
    console.log('🔗 [DeepLinkHandler] isAuthenticated:', isAuthenticated);
    console.log('🔗 [DeepLinkHandler] navigation ready:', !!navigation);

    const handleDeepLink = () => {
      console.log('🔗 [DeepLinkHandler] ✅ Calling processPendingDeepLink...');
      processPendingDeepLink(
        (screen, params) => {
          console.log('🔗 [DeepLinkHandler] ✅ Navigate function called with:', { screen, params });
          navigation.navigate(screen, params);
          console.log('🔗 [DeepLinkHandler] ✅ Navigate executed');
        },
        (screen) => {
          console.log('🔗 [DeepLinkHandler] ✅ Reset function called with:', screen);
          navigation.reset({
            index: 0,
            routes: [{ name: screen }],
          });
        },
        () => {
          console.log('🔗 [DeepLinkHandler] ✅ Show login modal');
          navigation.navigate('Login');
        },
        (action) => {
          console.log('🔗 [DeepLinkHandler] ⚠️ Set pending action (not implemented)');
          // 保存待处理的操作，登录后执行
          // TODO: 实现登录后的回调机制
        }
      );
    };

    // 如果有待处理的深链，延迟处理确保导航已准备好
    if (deepLinkState.pendingProjectId && deepLinkState.isProcessing) {
      console.log('🔗 [DeepLinkHandler] ✅ Pending deep link found, scheduling handleDeepLink...');
      const timer = setTimeout(handleDeepLink, 500);
      return () => {
        console.log('🔗 [DeepLinkHandler] Cleanup: clearing timer');
        clearTimeout(timer);
      };
    } else {
      console.log('🔗 [DeepLinkHandler] ⚠️ No pending deep link to process');
    }
  }, [processPendingDeepLink, navigation, isAuthenticated, deepLinkState]);

  return null;
}

function AppContent() {
  console.log('🚀🚀🚀 [App] ===== AppContent RENDERED =====');
  // 强制使用 light 模式，禁用深夜模式适配
  const isDark = false;
  const [currentRoute, setCurrentRoute] = React.useState('MainTabs');
  
  useEffect(() => {
    console.log('🚀 [App] AppContent mounted');
  }, []);

  useEffect(() => {
    console.log('🚀 RootLayout mounted');
    const initStateAsync = async () => {
        // 请求 App Tracking Transparency 权限（仅 iOS 14.5+）
        if (Platform.OS === 'ios' && getTrackingStatus && requestTrackingPermission) {
          try {
            const trackingStatus = await getTrackingStatus();
            console.log('📊 [App] Current tracking status:', trackingStatus);
            
            // 如果状态是 'not-determined'，请求权限
            if (trackingStatus === 'not-determined') {
              const status = await requestTrackingPermission();
              console.log('📊 [App] Tracking permission requested, status:', status);
            } else {
              console.log('📊 [App] Tracking permission already determined, status:', trackingStatus);
            }
          } catch (error) {
            console.error('❌ [App] Failed to request tracking permission:', error);
          }
        }
        
        // 初始化数数分析
        await Promise.all([
          configureAnalytics({
            debug: __DEV__,
            thinking: {
              enabled: true,
              appId: OAUTH_CONFIG.analytics.thinkingData.appId,
              serverUrl: OAUTH_CONFIG.analytics.thinkingData.serverUrl,
              delegate: createThinkingDataDelegate(), // 添加 delegate 实现
            },
          }).then(() => {
            console.log('✅ Analytics initialized with ThinkingData');
            console.log('📊 ThinkingData App ID:', OAUTH_CONFIG.analytics.thinkingData.appId);
            console.log('📊 ThinkingData Server URL:', OAUTH_CONFIG.analytics.thinkingData.serverUrl);
          }).catch((error) => {
            console.error('❌ Failed to initialize analytics:', error);
          }),
        ]);
    };
    
    initStateAsync();
  }, []);

  const handleNavigationStateChange = React.useCallback((state) => {
    if (!state) {
      setCurrentRoute('MainTabs');
      return;
    }
    
    const route = state.routes[state.index];
    let currentScreenName;
    let routeParams = undefined;
    
    if (route.name === 'MainTabs' && route.state) {
      // 如果是 Tab Navigator，返回 Tab 的路由名称
      const tabRoute = route.state.routes[route.state.index || 0];
      currentScreenName = tabRoute.name;
      routeParams = tabRoute.params;
      setCurrentRoute(tabRoute.name);
    } else {
      currentScreenName = route.name;
      routeParams = route.params;
      setCurrentRoute(route.name);
    }

    // 上报导航事件到数数分析
    if (currentScreenName) {
      const eventParams = {
        screen_name: currentScreenName,
      };
      
      // 添加参数信息（如果有）
      if (routeParams) {
        try {
          // 只记录关键参数，避免记录敏感信息
          if (routeParams.redirectTo) eventParams.redirectTo = routeParams.redirectTo;
          if (routeParams.screen) eventParams.screen = routeParams.screen;
          if (routeParams.project?.project_id) eventParams.project_id = routeParams.project.project_id;
          if (routeParams.project?.name) eventParams.project_name = routeParams.project.name;
        } catch (error) {
          console.warn('⚠️ [App] Failed to parse route params:', error);
        }
      }

      analytics.track('screen_view', eventParams).catch((error) => {
        console.error('❌ [App] Failed to track navigation:', error);
      });
    }
  }, []);

  return (
    <View style={styles.appRoot}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />
      <AuthProvider>
        <NavigationStateContext.Provider value={{ currentRoute, setCurrentRoute }}>
          <NavigationContainer 
            theme={isDark ? darkTheme : lightTheme}
            onStateChange={handleNavigationStateChange}
          >
            <DeepLinkHandler />
            <View style={styles.appContent}>
              <Stack.Navigator 
                // 性能优化：确保屏幕按需加载，不预加载所有屏幕
                // Stack Navigator 默认就是懒加载的，只有在导航到屏幕时才会渲染
                detachInactiveScreens={true} // 卸载非活动屏幕以节省内存（默认 true，显式设置确保优化）
                screenOptions={{ 
                  headerShown: false, 
                  cardStyle: {
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    overflow: 'hidden',
                  },
                }}
              >
                <Stack.Screen name="MainTabs">
                  {() => (
                    <Tab.Navigator
                      screenOptions={{ 
                        headerShown: false,
                        // Tab Navigator 性能优化：懒加载标签页，避免预加载所有标签
                        lazy: true, // 只在切换到标签时才加载该屏幕
                      }}
                      tabBar={props => (
                        <LiquidGlassTabBar {...props} tabConfig={tabConfig} />
                      )}
                    >
                      {tabConfig.map(tab => (
                        <Tab.Screen
                          key={tab.name}
                          name={tab.name}
                          component={tab.component}
                          options={{ title: tab.title }}
                        />
                      ))}
                    </Tab.Navigator>
                  )}
                </Stack.Screen>
                <Stack.Screen
                  name="Settings"
                  component={SettingsScreen}
                  options={{
                    presentation: 'modal',
                  }}
                />
                <Stack.Screen
                  name="Subscription"
                  component={SubscriptionScreen}
                  options={{
                    presentation: 'transparentModal', // 使用透明 modal，避免默认动画与底部弹窗冲突
                  }}
                />
                <Stack.Screen
                  name="Login"
                  component={LoginScreen}
                  options={{
                    presentation: 'modal',
                  }}
                />
                <Stack.Screen
                  name="ProjectWebView"
                  component={ProjectWebViewScreen}
                  options={{
                    presentation: 'card',
                    // 禁用右滑返回手势，防止误触退出预览
                    gestureEnabled: false,
                  }}
                />
                <Stack.Screen
                  name="AiChat"
                  component={AiChatScreen}
                  options={{ presentation: 'card'}}
                />
              </Stack.Navigator>
            </View>
            {/* 全局悬浮的 New App 按钮 - 仅在非登录/设置/订阅页面显示 */}
            <FloatingNewAppButton />
          </NavigationContainer>
        </NavigationStateContext.Provider>
      </AuthProvider>
    </View>
  );
}

function App() {
  console.log('🚀🚀🚀 [App] ===== App COMPONENT RENDERED =====');
  
  React.useEffect(() => {
    console.log('🚀 [App] App component mounted');
  }, []);
  
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}


// New App 按钮组件（液态玻璃效果）
const NewAppButton = () => {
  const isIOS = Platform.OS === 'ios';

  const ButtonContainer = ({ children }) =>
    isIOS && isLiquidGlassSupported ? (
      <LiquidGlassView
        style={styles.newAppButton}
        interactive
        effect="clear"
      >
        {children}
      </LiquidGlassView>
    ) : (
      <View style={[styles.newAppButton, styles.newAppButtonFallback]}>
        <BlurView
          blurType="light"
          blurAmount={40}
          reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.9)"
          style={StyleSheet.absoluteFillObject}
        />
        {children}
      </View>
    );

  return (
    <ButtonContainer>
      <View style={styles.newAppButtonContent}>
        <Text style={styles.newAppButtonIcon}>+</Text>
        <Text style={styles.newAppButtonText}>New App</Text>
      </View>
    </ButtonContainer>
  );
};

const LiquidGlassTopBar = () => {
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  const topPadding = Math.max(insets.top, 20);

  // 创建按钮呼吸动画
  const createButtonBreathe = useSharedValue(0);
  React.useEffect(() => {
    createButtonBreathe.value = withRepeat(
      withTiming(1, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, []);

  const createButtonStyle = useAnimatedStyle(() => {
    const scale = interpolate(createButtonBreathe.value, [0, 1], [1, 1.05]);
    return {
      transform: [{ scale }],
    };
  });

  const handleCreate = () => {
    // TODO: 实现创建功能
    console.log('创建按钮被点击');
  };

  const TopBarContainer = ({ children }) =>
    isIOS && isLiquidGlassSupported ? (
      <LiquidGlassView
        style={styles.topBarSurface}
        interactive
        effect="clear"
      >
        {children}
      </LiquidGlassView>
    ) : (
      <View style={[styles.topBarSurface, styles.topBarFallback]}>
        <BlurView
          blurType="ultraThinMaterialDark"
          blurAmount={20}
          reducedTransparencyFallbackColor="rgba(15,17,24,0.05)"
          style={StyleSheet.absoluteFillObject}
        />
        {children}
      </View>
    );

  return (
    <View style={[styles.topBarContainer, { paddingTop: topPadding }]}>
      <TopBarContainer>
        <View style={styles.topBarContent}>
          <View style={styles.topBarSpacer} />
          <Animated.View style={createButtonStyle}>
            <Pressable
              onPress={handleCreate}
              style={styles.createButton}
              accessibilityRole="button"
              accessibilityLabel="创建"
            >
              <LinearGradient
                colors={['#7acbff', '#a778ff', '#ffb7e8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createButtonGradient}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.createButtonShine}
                  pointerEvents="none"
                />
                <Text style={styles.createButtonText}>+</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </TopBarContainer>
    </View>
  );
};


const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: 'transparent', // 背景色由 LiquidGlassBackdrop 组件提供
  },
  appContent: {
    flex: 1,
  },
  backdropHalo: {
    position: 'absolute',
    width: '120%',
    height: '80%',
    top: '-10%',
    left: '-10%',
  },
  backdropOrb: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255, 183, 232, 0.5)',
    opacity: 0.5,
    shadowColor: 'rgba(255,255,255,0.6)',
    shadowOpacity: 0.8,
    shadowRadius: 80,
    shadowOffset: { width: 0, height: 20 },
    elevation: 20,
  },
  backdropOrbLeft: {
    top: 100,
    left: -80,
    backgroundColor: 'rgba(255, 183, 232, 0.5)',
  },
  backdropOrbRight: {
    bottom: 120,
    right: -100,
    backgroundColor: 'rgba(122, 203, 255, 0.5)',
  },
  backdropOrbCenter: {
    top: '40%',
    left: '50%',
    marginLeft: -140,
    backgroundColor: 'rgba(167, 120, 255, 0.4)',
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 32,
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
  },
  screenHint: {
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
  },
  screenTitle: {
    fontSize: 42,
    fontWeight: '700',
    color: '#ffffff',
    marginVertical: 16,
  },
  screenCopy: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.72)',
  },
  topBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  topBarSurface: {
    width: '90%',
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  topBarFallback: {
    backgroundColor: 'rgba(15,17,24,0.05)',
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 56,
  },
  topBarSpacer: {
    flex: 1,
  },
  createButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#7acbff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  createButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    position: 'relative',
  },
  createButtonShine: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  createButtonText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#ffffff',
    lineHeight: 32,
  },
  floatingButtonWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
    zIndex: 1000,
  },
  floatingButtonPressable: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  newAppButton: {
    width: SCREEN_WIDTH - 100, // 减小宽度，左右各留 50
    height: 58, // 增加高度
    borderRadius: 28, // 最大圆角（高度的一半），形成胶囊形状
    overflow: 'hidden',
    backgroundColor: 'transparent', // 完全透明，让液态玻璃效果显示
    borderWidth: 0, // 移除边框，让效果更纯净
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  newAppButtonFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  newAppButtonContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  newAppButtonIcon: {
    fontSize: 28,
    fontWeight: '400',
    color: '#000000',
    marginRight: 8,
    lineHeight: 28,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  newAppButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});

export default App;
