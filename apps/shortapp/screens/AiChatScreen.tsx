import { useEffect } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AiChatCreateScreen from '../components/AiChatCreateScreen';
import { useAuth } from '../hooks/useAuth';

type AiChatScreenRouteProp = RouteProp<{
  AiChat: {
    initialPrompt?: string;
  };
}, 'AiChat'>;

export default function AiChatScreen() {
  const navigation = useNavigation();
  const route = useRoute<AiChatScreenRouteProp>();
  const { initialPrompt } = route.params || {};
  const { isAuthenticated, user, accessToken, loginType } = useAuth();

  // 确保未登录用户先去登录
  useEffect(() => {
      if (!isAuthenticated || !user || !accessToken) {
      console.log('❌ [AIChat] User not authenticated, redirecting to Login');
        (navigation as any).navigate('Login', { redirectTo: 'AiChat' });
    }
  }, [isAuthenticated, user, accessToken, navigation]);

  const handleBack = () => {
    // 返回首页
    navigation.goBack();
  };

  return (
    <AiChatCreateScreen
      onBack={handleBack}
      initialPrompt={initialPrompt}
    />
  );
}