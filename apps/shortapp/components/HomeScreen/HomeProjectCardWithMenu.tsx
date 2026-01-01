import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  LayoutChangeEvent,
  findNodeHandle,
  Platform,
  Vibration,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import LinearGradient from 'react-native-linear-gradient';
import { Project } from '@vibecoding/api-client/src/types';
type Layout = { x: number; y: number; width: number; height: number };

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  project: Project;
  onOpenProject: (project: Project) => void;
  // 长按时，把卡片在屏幕中的布局信息抛给外层，由外层控制放大卡片 + 菜单 + 背景
  onLongPressWithLayout?: (project: Project, layout: Layout) => void;
};

// 本文件单独复制一份渐变/首字母工具函数，避免你手动搬运
const generateRandomGradient = (seed?: string): string[] => {
  const gradients = [
    ['#FF6B6B', '#FFD93D'],
    ['#4ECDC4', '#44A08D'],
    ['#45B7D1', '#96C93D'],
    ['#FFA07A', '#FF6B9D'],
    ['#98D8C8', '#6BC5DB'],
    ['#F7DC6F', '#F1948A'],
    ['#BB8FCE', '#E74C3C'],
    ['#85C1E2', '#F4D03F'],
    ['#F8B739', '#E74C3C'],
    ['#52BE80', '#3498DB'],
    ['#EC7063', '#F7DC6F'],
    ['#5DADE2', '#58D68D'],
    ['#58D68D', '#F4D03F'],
    ['#F4D03F', '#E67E22'],
    ['#AF7AC5', '#5DADE2'],
    ['#85C1E9', '#F1948A'],
    ['#F1948A', '#52BE80'],
    ['#82E0AA', '#F39C12'],
    ['#F9E79F', '#EC7063'],
    ['#AED6F1', '#F7DC6F'],
  ];
  if (seed) {
    const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return gradients[hash % gradients.length];
  }
  return gradients[Math.floor(Math.random() * gradients.length)];
};

const getRandomGradientDirection = (seed?: string): {
  start: { x: number; y: number };
  end: { x: number; y: number };
} => {
  const directions = [
    { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    { start: { x: 0, y: 1 }, end: { x: 1, y: 0 } },
    { start: { x: 1, y: 0 }, end: { x: 0, y: 1 } },
    { start: { x: 1, y: 1 }, end: { x: 0, y: 0 } },
  ];

  if (seed) {
    const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return directions[hash % directions.length];
  }
  return directions[Math.floor(Math.random() * directions.length)];
};

const getProjectInitial = (name: string): string => {
  if (!name || name.trim().length === 0) {
    return '?';
  }
  const firstChar = name.trim().charAt(0).toUpperCase();
  return /[A-Z0-9]/.test(firstChar) ? firstChar : '?';
};

// 触觉反馈函数
const triggerHapticFeedback = () => {
  try {
    console.log('🔔 [HomeProjectCardWithMenu] Triggering haptic feedback...');
    
    const hapticOptions = {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    };
    
    // 使用 impactMedium 提供中等强度的触觉反馈
    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
    console.log('✅ [HomeProjectCardWithMenu] Haptic feedback triggered');
  } catch (error) {
    console.warn('⚠️ [HomeProjectCardWithMenu] Haptic feedback library not available, using Vibration fallback:', error);
    
    // 降级方案：使用 Vibration API
    try {
      if (Platform.OS === 'ios') {
        // iOS: 使用更明显的震动（200ms）
        Vibration.vibrate(200);
      } else if (Platform.OS === 'android') {
        // Android: 使用震动模式
        Vibration.vibrate(200);
      }
      console.log('✅ [HomeProjectCardWithMenu] Vibration fallback triggered');
    } catch (vibrationError) {
      console.error('❌ [HomeProjectCardWithMenu] Vibration also failed:', vibrationError);
    }
  }
};

export default function HomeProjectCardWithMenu({
  project,
  onOpenProject,
  onLongPressWithLayout,
}: Props) {
  const cardRef = useRef<View | null>(null);

  const gradientDir = getRandomGradientDirection(project.project_id);

  const handleLongPress = () => {
    console.log('🔔 [HomeProjectCardWithMenu] Long press detected');
    
    // 触发震动反馈
    triggerHapticFeedback();
    
    if (!onLongPressWithLayout || !cardRef.current) return;

    const handle = findNodeHandle(cardRef.current);
    if (!handle) return;

    // 使用 measureInWindow 获取卡片在屏幕中的绝对位置
    (cardRef.current as any).measureInWindow(
      (x: number, y: number, width: number, height: number) => {
        onLongPressWithLayout(project, { x, y, width, height });
      },
    );
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={() => {
          onOpenProject(project);
        }}
        onLongPress={handleLongPress}
        delayLongPress={400}
      >
        <View style={styles.card} ref={cardRef}>
          <View style={styles.appIconContainer}>
            <LinearGradient
              colors={generateRandomGradient(project.project_id)}
              start={gradientDir.start}
              end={gradientDir.end}
              style={styles.appIcon}
            >
              <Text style={styles.appIconText}>{getProjectInitial(project.name)}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.appCardName} numberOfLines={2}>
            {project.name}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const CARD_WIDTH = (SCREEN_WIDTH - 60) / 2;

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_WIDTH,
    marginBottom: 16,
  },
  scrim: {},
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    justifyContent: 'space-between',
    alignItems: 'center',
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
  appCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    height: 36,
  },
  menuContainer: {
    marginTop: 8,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 16,
    color: '#111',
  },
  menuItemDanger: {
    borderTopWidth: 8,
    borderTopColor: 'transparent',
  },
});


