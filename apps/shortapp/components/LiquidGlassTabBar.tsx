/**
 * LiquidGlassTabBar - iOS 26 风格的液态玻璃底部导航栏组件
 * 
 * 使用示例:
 * ```tsx
 * <Tab.Navigator
 *   tabBar={props => <LiquidGlassTabBar {...props} tabConfig={tabConfig} />}
 * >
 *   {tabConfig.map(tab => (
 *     <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
 *   ))}
 * </Tab.Navigator>
 * ```
 */

import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from '@react-native-community/blur';
import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { HomeIcon, ExploreIcon, ProfileIcon, SettingsTabIcon } from '../components/icons/Icons';
import { useAuth } from '../hooks/useAuth';

export type TabConfig = {
  name: string;
  title: string;
  icon: 'home' | 'explore' | 'profile' | 'settings';
};

export interface LiquidGlassTabBarProps extends BottomTabBarProps {
  tabConfig?: TabConfig[];
}

export const LiquidGlassTabBar = ({
  state,
  descriptors,
  navigation,
  tabConfig = [],
}: LiquidGlassTabBarProps) => {
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  const { isAuthenticated } = useAuth();
  const stackNavigation = useNavigation();
  
  const configMap = React.useMemo(() => {
    const map: Record<string, TabConfig> = {};
    tabConfig.forEach(tab => {
      map[tab.name] = tab;
    });
    return map;
  }, [tabConfig]);

  // 图标组件
  const AnimatedIcon = React.memo(
    ({
      icon,
      isFocused,
    }: {
      icon: 'home' | 'explore' | 'profile' | 'settings';
      isFocused: boolean;
    }) => {
      const IconComponent = {
        home: HomeIcon,
        explore: ExploreIcon,
        profile: ProfileIcon,
        settings: SettingsTabIcon,
      }[icon];
      const iconSize = icon === 'home' ? 23 : icon === 'settings' ? 29 : 27;

      return (
        <View style={styles.iconBadge}>
          <View
            style={[
              styles.iconSurface,
              isFocused && styles.iconSurfaceActive,
            ]}
          >
            <View style={styles.iconWrapper}>
              <IconComponent
                width={iconSize}
                height={iconSize}
                color={isFocused ? '#000000' : '#999999'}
              />
            </View>
          </View>
        </View>
      );
    }
  );

  const Container = ({ children }: { children: React.ReactNode }) => {
    return (
      <View style={styles.blurContainer}>
        {isIOS ? (
          <BlurView
            blurType="light"
            blurAmount={20}
            reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.95)"
            style={StyleSheet.absoluteFillObject}
          />
        ) : null}
        <View style={styles.blurSurface}>
          {children}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.tabShell}>
      <Container>
        <View
          style={[
            styles.tabRow,
            { paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel ??
              options.title ??
              configMap[route.name]?.title ??
              (route.name as string);
            const icon = configMap[route.name]?.icon ?? 'home';
            const displayLabel =
              typeof label === 'string'
                ? label
                : configMap[route.name]?.title ?? route.name;

            const onPress = () => {
              // 如果点击的是 Settings Tab 且未登录，先跳转到登录页面
              if (route.name === 'SettingsTab' && !isAuthenticated) {
                (stackNavigation as any).navigate('Login', { redirectTo: 'MainTabs', screen: 'SettingsTab' });
                return;
              }

              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={onPress}
                style={styles.tabButton}
              >
                <AnimatedIcon
                  icon={icon}
                  isFocused={isFocused}
                />
              </Pressable>
            );
          })}
        </View>
      </Container>
    </View>
  );
};

const styles = StyleSheet.create({
  tabShell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  blurContainer: {
    width: '100%',
    borderRadius: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 255, 255, 0.95)',
  },
  blurSurface: {
    width: '100%',
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.95)',
    borderWidth: 0,
    borderTopWidth: Platform.OS === 'android' ? 1 : 0,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    position: 'relative',
    zIndex: 2,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    opacity: 0,
  },
  iconSurface: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSurfaceActive: {
    backgroundColor: 'transparent',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#999999',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#000000',
  },
});

