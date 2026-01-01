/**
 * ServerImage 组件
 * 用于加载需要认证的服务器图片
 * 自动添加 Authorization header，服务器验证权限后返回图片数据
 */

import  { useState, useEffect } from 'react';
import { Image, ImageProps, ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuthStoreData } from '../stores/authStore';
import { apiConfig } from '@vibecoding/api-client';

interface ServerImageProps extends Omit<ImageProps, 'source'> {
  projectId: string;  // 项目ID
  imagePath: string;  // 图片路径（服务端返回的path）
  placeholder?: React.ReactNode;
}

export default function ServerImage({ projectId, imagePath, placeholder, style, ...restProps }: ServerImageProps) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { accessToken } = useAuthStoreData();

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      if (!projectId || !imagePath || !accessToken) {
        console.warn('⚠️ [ServerImage] Missing projectId, imagePath or accessToken');
        setLoading(false);
        setError(true);
        return;
      }

      try {
        // 判断是完整URL还是相对路径
        let fullUrl: string;
        let needsAuth: boolean;
        
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          // 完整URL（如 OSS URL），直接使用，不需要认证
          fullUrl = imagePath;
          needsAuth = false;
        } else {
          // 相对路径，拼接 API URL，需要认证
          const baseURL = apiConfig.getBaseURL();
          fullUrl = `${baseURL}/api/v1/projects/${projectId}/images/${imagePath}`;
          needsAuth = true;
        }
        
        setLoading(true);
        setError(false);

        const headers: HeadersInit = needsAuth ? {
          'Authorization': `Bearer ${accessToken}`,
        } : {};
        
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          console.error(`❌ [ServerImage] Failed to load image: ${response.status} ${response.statusText}`);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // 获取图片数据并转换为 base64
        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onloadend = () => {
          if (isMounted && reader.result) {
            const base64data = reader.result as string;
            setImageData(base64data);
            setLoading(false);
          }
        };

        reader.onerror = () => {
          console.error('❌ [ServerImage] Failed to convert image to base64');
          throw new Error('Failed to convert image to base64');
        };

        reader.readAsDataURL(blob);

      } catch (err) {
        console.error('❌ [ServerImage] Error:', err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [projectId, imagePath, accessToken]);

  // 加载中状态
  if (loading) {
    return (
      <View style={[styles.container, style]}>
        {placeholder || <ActivityIndicator size="small" color="#007AFF" />}
      </View>
    );
  }

  // 加载失败状态
  if (error || !imageData) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        {placeholder || <View style={styles.errorPlaceholder} />}
      </View>
    );
  }

  // 成功加载，显示图片
  return (
    <Image
      {...restProps}
      source={{ uri: imageData }}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  errorPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(142, 142, 147, 0.2)',
  },
});

