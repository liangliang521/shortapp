import { useEffect, useRef, useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert, Modal, TextInput, KeyboardAvoidingView, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/icons/SvgIcons';
import { GoogleIcon, AppleIcon } from '../components/icons/Icons';
import { APP_LINKS, openLink } from '../config/links';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../stores/authStore';
import { ModalScreenWrapper } from '../components/ModalScreenWrapper';

type LoginRouteParams = {
  Login: {
    redirectTo?: string;
    screen?: string; // 用于 Tab Navigator 中的具体 Tab
  };
};

export default function LoginScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<LoginRouteParams, 'Login'>>();
  const redirectTo = route.params?.redirectTo;
  const redirectScreen = route.params?.screen; // Tab Navigator 中的具体 Tab
  const insets = useSafeAreaInsets();
  const {
    loginWithGoogle,
    loginWithApple,
    isLoading,
    isGoogleLoading,
    isAppleLoading,
    error,
    clearError,
    isAuthenticated,
  } = useAuth();

  // 隐藏邮箱登录状态
  const [emailLoginVisible, setEmailLoginVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { loginWithEmail: storeLoginWithEmail } = useAuthStore();
  
  // 隐私协议复选框状态，默认选中
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  
  // 协议提示弹窗状态
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  const handleLoginSuccess = () => {
    console.log('🔐 [Login] Login successful, redirecting to:', redirectTo, 'screen:', redirectScreen);
    
    // 登录成功后跳转到指定页面或首页
    if (redirectTo && redirectTo !== '/') {
      // 先关闭登录页面
      navigation.goBack();
      // 然后跳转到目标页面
      setTimeout(() => {
        // 如果指定了 screen 参数，说明要跳转到 Tab Navigator 中的具体 Tab
        if (redirectScreen) {
          (navigation as any).navigate(redirectTo, { screen: redirectScreen });
        } else {
          (navigation as any).navigate(redirectTo);
        }
      }, 100);
    } else {
      navigation.goBack();
    }
  };

  const handleRequestClose = () => {
    console.log('🔐 [Login] Login cancelled, redirecting to home');
    navigation.goBack();
  };

  // Navigate after successful login
  useEffect(() => {
    if (isAuthenticated) {
      handleLoginSuccess();
    }
  }, [isAuthenticated]);

  // Show error message
  useEffect(() => {
    if (error) {
      Alert.alert('Login Error', error, [
        {
          text: 'OK',
          onPress: clearError,
        },
      ]);
    }
  }, [error, clearError]);

  const handleGoogleLogin = async () => {
    // 检查是否同意协议
    if (!agreedToTerms) {
      setShowAgreementModal(true);
      return;
    }
    
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Google login failed:', error);
    }
  };

  // 启用 Apple 登录
  const ENABLE_APPLE_LOGIN = true;

  const handleAppleLogin = async () => {
    // 检查是否同意协议
    if (!agreedToTerms) {
      setShowAgreementModal(true);
      return;
    }
    
    try {
      await loginWithApple();
    } catch (error) {
      console.error('Apple login failed:', error);
    }
  };
  
  const handleAgreementModalOK = () => {
    setAgreedToTerms(true);
    setShowAgreementModal(false);
  };

  // 处理空白区域点击（激活隐藏登录）
  const handleBackgroundTap = () => {
    tapCount.current += 1;

    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
    }

    // 5次点击激活
    if (tapCount.current >= 5) {
      console.log('🔐 [Login] Hidden email login activated');
      setEmailLoginVisible(true);
      tapCount.current = 0;
      return;
    }

    // 1秒内未达到5次，重置
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 1000);
  };

  // 处理邮箱登录
  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    try {
      setEmailLoading(true);
      console.log('🔐 [Login] Email login attempt');
      
      await storeLoginWithEmail(email, password);
      
      console.log('✅ [Login] Email login successful');
      setEmailLoginVisible(false);
      setEmail('');
      setPassword('');
      
      Alert.alert('Success', 'Login successful');
    } catch (error: any) {
      console.error('❌ [Login] Email login error:', error);
      Alert.alert('Login Failed', error.message || 'Network error');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <ModalScreenWrapper edges={['top', 'bottom']} style={styles.container}>
          {/* Header with back button */}
      <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleRequestClose}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            >
              <Icon name="ChevronBack" size={24} color="#000" />
            </TouchableOpacity>
          </View>

      {/* 隐藏触发层 - 覆盖整个背景，但不影响子元素点击 */}
      <Pressable 
        style={styles.pressableArea}
        onPress={handleBackgroundTap}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content} pointerEvents="box-none">

          {/* Logo area */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🚀</Text>
            <Text style={styles.appName}>ShortApp</Text>
            <Text style={styles.tagline}>Build any iPhone app you imagine</Text>
          </View>

        {/* Login buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.loginButton, styles.googleButton]}
            onPress={handleGoogleLogin}
            disabled={isGoogleLoading || isAppleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <GoogleIcon width={24} height={24} />
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {ENABLE_APPLE_LOGIN && Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.loginButton, styles.appleButton]}
              onPress={handleAppleLogin}
              disabled={isGoogleLoading || isAppleLoading}
            >
              {isAppleLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <AppleIcon width={24} height={24} color="#FFF" />
                  <Text style={styles.appleButtonText}>Sign in with Apple</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                {agreedToTerms && (
                  <Icon name="Checkmark" size={12} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.footerTextContainer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our{' '}
          </Text>
              <Text 
                style={styles.link}
                onPress={() => openLink(APP_LINKS.TERMS_OF_SERVICE)}
              >
                Terms of Service
              </Text>
          <Text style={styles.footerText}> and </Text>
              <Text 
                style={styles.link}
                onPress={() => openLink(APP_LINKS.PRIVACY_POLICY)}
              >
                Privacy Policy
              </Text>
            </Text>
        </View>
        </View>
        </ScrollView>
      </Pressable>

      {/* 隐藏邮箱登录弹窗 */}
      <Modal
        visible={emailLoginVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEmailLoginVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setEmailLoginVisible(false)}
          />
          
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Review Login</Text>
            <Text style={styles.modalSubtitle}>For review purposes only</Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.emailLoginButton, emailLoading && styles.buttonDisabled]}
              onPress={handleEmailLogin}
              disabled={emailLoading}
            >
              <Text style={styles.emailLoginButtonText}>
                {emailLoading ? 'Logging in...' : 'Login'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEmailLoginVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 协议提示弹窗 */}
      <Modal
        visible={showAgreementModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAgreementModal(false)}
      >
        <Pressable
          style={styles.modalContainer}
          onPress={() => setShowAgreementModal(false)}
        >
          <Pressable style={styles.agreementModalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.agreementModalTitle}>Agreement Required</Text>
            <Text style={styles.agreementModalText}>
              Please agree to the{' '}
              <Text 
                style={styles.agreementModalLink}
                onPress={() => {
                  setShowAgreementModal(false);
                  openLink(APP_LINKS.TERMS_OF_SERVICE);
                }}
              >
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text 
                style={styles.agreementModalLink}
                onPress={() => {
                  setShowAgreementModal(false);
                  openLink(APP_LINKS.PRIVACY_POLICY);
                }}
              >
                Privacy Policy
              </Text>
              {' '}to continue.
            </Text>
            <TouchableOpacity
              style={styles.agreementModalButton}
              onPress={handleAgreementModalOK}
            >
              <Text style={styles.agreementModalButtonText}>OK</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ModalScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressableArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  content: {
    alignItems: 'center',
    minHeight: '100%',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginTop: 40,
    paddingHorizontal: 10,
    maxWidth: '100%',
  },
  checkboxContainer: {
    marginRight: 8,
    marginTop: 2,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#8E8E93',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#F75A01',
    borderColor: '#F75A01',
  },
  footerTextContainer: {
    flex: 1,
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  link: {
    fontSize: 14,
    color: '#F75A01',
    textDecorationLine: 'underline',
  },
  // 隐藏邮箱登录样式
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  emailLoginButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  emailLoginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
  },
  // 协议提示弹窗样式
  agreementModalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  agreementModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  agreementModalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  agreementModalLink: {
    fontSize: 16,
    color: '#F75A01',
    textDecorationLine: 'underline',
  },
  agreementModalButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#F75A01',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agreementModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

