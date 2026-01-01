/**
 * Login Screen
 * Supports Google and Apple login
 */
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Alert,
    Modal,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { ChevronBackIcon, GoogleIcon, AppleIcon } from './icons/SvgIcons';
import { APP_LINKS, openLink } from '../config/links';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';

interface LoginScreenProps {
    visible: boolean;
    onLoginSuccess: () => void;
    onRequestClose?: () => void;
}

export default function LoginScreen({ visible, onLoginSuccess, onRequestClose }: LoginScreenProps) {
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

    // Navigate after successful login
    useEffect(() => {
        if (isAuthenticated) {
            onLoginSuccess();
        }
    }, [isAuthenticated, onLoginSuccess]);

    // Show error message
    useEffect(() => {
        if (error) {
            Alert.alert('Login Failed', error, [
                { text: 'OK', onPress: clearError },
            ]);
        }
    }, [error, clearError]);

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
        } catch (err) {
            console.error('Google login error:', err);
        }
    };

    const handleAppleLogin = async () => {
        try {
            await loginWithApple();
        } catch (err) {
            console.error('Apple login error:', err);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onRequestClose}
            presentationStyle="fullScreen"
        >
            <SafeAreaProvider>
                <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                    <View style={styles.content}>
                    {/* Header with back button */}
                    {onRequestClose && (
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={onRequestClose}
                                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                            >
                                <ChevronBackIcon size={24} color="#000" />
                            </TouchableOpacity>
                        </View>
                    )}
                {/* Logo area */}
                <View style={styles.logoContainer}>
                    <Text style={styles.logoEmoji}>🚀</Text>
                    <Text style={styles.appName}>ShortApp</Text>
                    <Text style={styles.tagline}>Build any iPhone app you imagine</Text>
                </View>

                {/* Login button area */}
                <View style={styles.buttonsContainer}>
                    {/* Google login */}
                    <TouchableOpacity
                        style={[styles.loginButton, styles.googleButton]}
                        onPress={handleGoogleLogin}
                        disabled={isGoogleLoading || isAppleLoading}
                    >
                        {isGoogleLoading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <>
                                <GoogleIcon size={24} color="#000" />
                                <Text style={styles.googleButtonText}>Sign in with Google</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Apple login (iOS only) */}
                    {Platform.OS === 'ios' && (
                        <TouchableOpacity
                            style={[styles.loginButton, styles.appleButton]}
                            onPress={handleAppleLogin}
                            disabled={isGoogleLoading || isAppleLoading}
                        >
                            {isAppleLoading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <AppleIcon size={24} color="#FFF" />
                                    <Text style={styles.appleButtonText}>Sign in with Apple</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Bottom notice */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        By signing in, you agree to our
                    </Text>
                    <View style={styles.footerLinks}>
                        <TouchableOpacity onPress={() => openLink(APP_LINKS.TERMS_OF_SERVICE)}>
                            <Text style={styles.link}>Terms of Service</Text>
                        </TouchableOpacity>
                        <Text style={styles.footerText}> and </Text>
                        <TouchableOpacity onPress={() => openLink(APP_LINKS.PRIVACY_POLICY)}>
                            <Text style={styles.link}>Privacy Policy</Text>
                        </TouchableOpacity>
                    </View>
                    </View>
                    </View>
                </SafeAreaView>
            </SafeAreaProvider>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 32,
        paddingVertical: 48,
    },
    header: {
        position: 'absolute',
        top: 8,
        left: 16,
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
    logoContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    logoEmoji: {
        fontSize: 80,
        marginBottom: 24,
    },
    appName: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
    },
    tagline: {
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
    },
    buttonsContainer: {
        gap: 16,
    },
    loginButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        gap: 12,
    },
    googleButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DEDEDE',
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    appleButton: {
        backgroundColor: '#000',
    },
    appleButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    footer: {
        alignItems: 'center',
        marginTop: 32,
    },
    footerText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    footerLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    link: {
        fontSize: 12,
        color: '#4ECDC4',
        fontWeight: '600',
    },
});


