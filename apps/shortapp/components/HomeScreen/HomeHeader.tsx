
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { analytics } from '@vibecoding/analytics';

interface HomeHeaderProps {
  onAddProject: () => void;
  onOpenSettings: () => void;
}

// 加号图标（SVG）
const PlusIcon = ({ size = 20, color = '#FFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 5v14m-7-7h14"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

// 人像图标（SVG）
const UserIcon = ({ size = 20, color = '#000' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
    <Path
      d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export default function HomeHeader({ onAddProject, onOpenSettings }: HomeHeaderProps) {
  const handleSettingsPress = () => {
    // 上报设置页面访问事件
    analytics.track('screen_view', {
      screen_name: 'settings',
      from: 'home',
    }).catch((error) => {
      console.error('❌ [Analytics] Failed to track settings view:', error);
    });
    
    // 执行导航
    onOpenSettings();
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {/* <View style={styles.logoContainer}>
          <Text style={styles.logoText}>V</Text>
        </View> */}
        <Text style={styles.headerTitle}>ShortApp</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.addButton} onPress={onAddProject}>
          <PlusIcon size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.profileButton} onPress={handleSettingsPress}>
          <UserIcon size={20} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
