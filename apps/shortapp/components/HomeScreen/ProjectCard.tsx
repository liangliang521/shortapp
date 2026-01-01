import  { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, Platform } from 'react-native';
import { CheckmarkCircleIcon, TimeIcon, CloseCircleIcon } from '../icons/SvgIcons';
import { Project } from '@vibecoding/api-client/src/types';
import { httpClient } from '@vibecoding/api-client';

// 触觉反馈函数
const triggerHapticFeedback = () => {
  try {
    console.log('🔔 [ProjectCard] Triggering haptic feedback...');
    
    // 尝试使用 react-native-haptic-feedback
    const ReactNativeHapticFeedback = require('react-native-haptic-feedback').default;
    const hapticOptions = {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    };
    
    // 使用 selection 类型提供触觉反馈
    ReactNativeHapticFeedback.trigger('selection', hapticOptions);
    console.log('✅ [ProjectCard] Haptic feedback triggered via react-native-haptic-feedback');
  } catch (error) {
    console.warn('⚠️ [ProjectCard] Haptic feedback library not available, using Vibration fallback:', error);
    
    // 降级方案：使用 Vibration API
    try {
      if (Platform.OS === 'ios') {
        // iOS: 使用短震动
        Vibration.vibrate(100);
      } else if (Platform.OS === 'android') {
        // Android: 使用震动模式
        Vibration.vibrate(100);
      }
      console.log('✅ [ProjectCard] Vibration fallback triggered');
    } catch (vibrationError) {
      console.error('❌ [ProjectCard] Vibration also failed:', vibrationError);
    }
  }
};

interface ProjectCardProps {
  project: Project;
  onPress: (projectId: string, updatedProject?: Project) => void;
  onLongPress?: (project: Project) => void;
  onStarted?: () => void; // 启动成功后的回调
}

// 项目状态映射
const getProjectStatus = (project: Project): 'completed' | 'building' | 'failed' => {
  if (project.status === 'ACTIVE' && project.sandbox_status === 'ACTIVE') {
    return 'completed';
  } else if (project.status === 'BUILDING' || project.sandbox_status === 'BUILDING') {
    return 'building';
  } else {
    return 'failed';
  }
};

// 格式化时间显示
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};

const getStatusIcon = (status: 'completed' | 'building' | 'failed') => {
  switch (status) {
    case 'completed':
      return <CheckmarkCircleIcon size={24} color="#34C759" />;
    case 'building':
      return <TimeIcon size={24} color="#FF9500" />;
    case 'failed':
      return <CloseCircleIcon size={24} color="#FF3B30" />;
    default:
      return null;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Utility':
      return '#FF6B9D';
    case 'Productivity':
      return '#4ECDC4';
    case 'Widget':
      return '#45B7D1';
    default:
      return '#FF6B9D';
  }
};

export default function ProjectCard({ project, onPress, onLongPress, onStarted }: ProjectCardProps) {
  const status = getProjectStatus(project);
  const [isStarting, setIsStarting] = useState(false);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const pollingInterval = useRef<number | null>(null);

  // 清理函数
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  // 启动沙盒
  const startSandbox = async () => {
    console.log(`🚀 [ProjectCard] Starting sandbox for project: ${project.project_id}`);
    
    if (isStarting) {
      console.log(`⚠️ [ProjectCard] Project ${project.project_id} is already starting`);
      return;
    }

    setIsStarting(true);
    progressAnimation.setValue(0);

    try {
      // 调用启动接口
      console.log(`📡 [ProjectCard] Calling startProject API for ${project.project_id}`);
      const response = await httpClient.startProject(project.project_id);
      
      if (response.code !== 0) {
        console.error(`❌ [ProjectCard] Failed to start project ${project.project_id}:`, response.info);
        setIsStarting(false);
        return;
      }

      console.log(`✅ [ProjectCard] Start command sent for ${project.project_id}, beginning polling...`);

      // 开始假进度条动画（60秒）
      Animated.timing(progressAnimation, {
        toValue: 100,
        duration: 60000, // 60秒
        useNativeDriver: false,
      }).start();

      // 开始轮询检查状态（每2秒一次）
      const startTime = Date.now();
      const intervalId = setInterval(async () => {
        const elapsedTime = Date.now() - startTime;
        
        // 超过60秒，停止轮询
        if (elapsedTime >= 60000) {
          console.log(`⏱️ [ProjectCard] Timeout for project ${project.project_id}, stopping polling`);
          clearInterval(intervalId);
          pollingInterval.current = null;
          setIsStarting(false);
          return;
        }

        // 查询项目状态
        try {
          console.log(`🔄 [ProjectCard] Polling project status for ${project.project_id}`);
          const projectResponse = await httpClient.getProject(project.project_id);
          
          if (projectResponse.code === 0 && projectResponse.data) {
            const projectData = projectResponse.data;
            console.log(`📊 [ProjectCard] Project ${project.project_id} status:`, {
              status: projectData.status,
              sandbox_status: projectData.sandbox_status,
              preview_url: projectData.startup_info?.preview_url,
            });

            console.log(`🔄 [ProjectCard] Project Old ${project.project_id} preview URL:`, project.startup_info?.preview_url);

            // 检查是否启动成功
            if (projectData.status === 'ACTIVE' && projectData.sandbox_status === 'ACTIVE') {
              clearInterval(intervalId);
              pollingInterval.current = null;
              setIsStarting(false);
              
              // 通知父组件启动成功
              onStarted?.();
              // 自动进入预览，传递最新的 projectData
              onPress(project.project_id, projectData);
            }
          }
        } catch (pollError) {
          console.error(`❌ [ProjectCard] Failed to poll project ${project.project_id}:`, pollError);
        }
      }, 2000); // 每2秒轮询一次

      pollingInterval.current = intervalId as unknown as number;

    } catch (error) {
      console.error(`❌ [ProjectCard] Error starting sandbox for ${project.project_id}:`, error);
      setIsStarting(false);
    }
  };

  // 处理点击事件
  const handlePress = () => {
    // 🚨 临时注释：直接跳转，不检查沙盒状态
    // onPress(project.project_id);
    
    // 如果状态是 failed 且不在启动中，则启动沙盒
    if (status === 'failed' && !isStarting) {
      startSandbox();
    } else if (status === 'completed') {
      // 正常状态，直接进入预览
      onPress(project.project_id);
    }
    // building 状态不做处理
  };

  // 处理长按事件
  const handleLongPress = () => {
    console.log('🔔 [ProjectCard] Long press detected, triggering haptic feedback');
    // 触发震动反馈
    triggerHapticFeedback();
    // 调用父组件的长按回调
    onLongPress?.(project);
  };

  return (
    <View>
      <TouchableOpacity 
        style={styles.projectCard}
        onPress={handlePress}
        onLongPress={onLongPress ? handleLongPress : undefined}
        delayLongPress={500}
        activeOpacity={0.95}
      >
        <View style={styles.projectIconContainer}>
          <View 
            style={[
              styles.projectIcon, 
              { backgroundColor: getTypeColor(project.type) }
            ]}
          >
            <Text style={styles.projectIconText}>
              {project.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={styles.projectInfo}>
          <Text style={styles.projectTitle}>{project.name}</Text>
          <Text style={styles.projectSubtitle}>{formatTimeAgo(project.created_at)}</Text>
        </View>
        
        <View style={styles.projectStatus}>
          {getStatusIcon(status)}
        </View>
      </TouchableOpacity>

      {/* 启动进度条 */}
      {isStarting && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnimation.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>Starting sandbox...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  projectIconContainer: {
    marginRight: 16,
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  projectInfo: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  projectSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  projectStatus: {
    marginLeft: 16,
  },
  // Progress bar styles
  progressContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF9500', // 橙色
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#FF9500',
    textAlign: 'center',
    fontWeight: '500',
  },
});
