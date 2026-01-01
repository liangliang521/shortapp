import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { CloseIcon, ChevronForwardIcon, StarIcon, SparkleIcon, PersonIcon, LogOutIcon, TrashIcon, DiscordIcon } from './icons/SvgIcons';
import { useAuth } from '../hooks/useAuth';
import { httpClient, UserUtils } from '@vibecoding/api-client';
import { APP_LINKS, openLink } from '../config/links';
import { useAuthStoreData } from '../stores/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SettingsScreenProps {
  onBack: () => void;
  onUpgrade: () => void;
  onLogout?: () => void;
  onDeleteAccount?: () => void;
  showHeader?: boolean;
}

export default function SettingsScreen({
  onBack,
  onUpgrade,
  onLogout,
  onDeleteAccount,
  showHeader = true,
}: SettingsScreenProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const { refreshUserProfile } = useAuthStoreData();
  const [loading, setLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const insets = useSafeAreaInsets();

  // 每次页面显示时刷新用户信息
  useFocusEffect(
    useCallback(() => {
      const refreshUser = async () => {
        if (!isAuthenticated) return;
        
        try {
          setLoading(true);
          console.log('🔄 [Settings] 刷新用户信息...');
          await refreshUserProfile();
          console.log('✅ [Settings] 用户信息已刷新');
        } catch (error) {
          console.error('❌ [Settings] 刷新用户信息失败:', error);
          // 静默失败，不打扰用户
        } finally {
          setLoading(false);
        }
      };

      refreshUser();
    }, [isAuthenticated, refreshUserProfile])
  );

  // 格式化日期
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Unknown';
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setLogoutLoading(true);
              await logout();
              onLogout?.();
            } catch (error) {
              console.error('Logout failed:', error);
              Alert.alert('Error', 'Failed to sign out');
            } finally {
              setLogoutLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. Are you sure you want to delete your account?\n\nAll your projects and data will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // 二次确认
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure? This will permanently delete your account and all associated data.',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: performAccountDeletion,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const performAccountDeletion = async () => {
    try {
      setDeleteLoading(true);
      console.log('🗑️ [SettingsScreen] Starting account deletion...');
      
      const response = await httpClient.deleteAccount();
      
      if (response.code === 0) {
        console.log('✅ [SettingsScreen] Account deleted successfully');
        Alert.alert(
          'Account Deleted',
          'Your account has been successfully deleted. Thank you for using ShortApp.',
          [
            {
              text: 'OK',
              onPress: async () => {
                try {
                  // 先清除用户状态
                  await logout();
                  console.log('✅ [SettingsScreen] User state cleared after account deletion');
                  
                  // 然后调用删除账号后的回调（会携带刷新参数返回首页）
                  onDeleteAccount?.();
                } catch (error) {
                  console.error('❌ [SettingsScreen] Error during logout after account deletion:', error);
                  // 即使logout失败，也要返回首页
                  onDeleteAccount?.();
                }
              },
            },
          ]
        );
      } else {
        console.error('❌ [SettingsScreen] Account deletion failed:', response.info);
        Alert.alert('Error', response.info || 'Failed to delete account. Please try again.');
      }
    } catch (error) {
      console.error('❌ [SettingsScreen] Error deleting account:', error);
      Alert.alert('Error', 'Failed to delete account. Please check your connection and try again.');
    } finally {
      setDeleteLoading(false);
    }
  };



  const handleManageAccount = async () => {
    try {
      let subscriptionUrl: string;
      
      if (Platform.OS === 'ios') {
        // iOS: 跳转到苹果App Store的订阅管理页面
        subscriptionUrl = APP_LINKS.IOS_SUBSCRIPTION_MANAGEMENT;
      } else if (Platform.OS === 'android') {
        // Android: 跳转到Google Play的订阅管理页面
        subscriptionUrl = APP_LINKS.ANDROID_SUBSCRIPTION_MANAGEMENT;
      } else {
        // 其他平台: 使用web版本
        subscriptionUrl = APP_LINKS.BILLING_MANAGEMENT;
      }
      
      console.log(`Opening subscription management for ${Platform.OS}:`, subscriptionUrl);
      await openLink(subscriptionUrl);
    } catch (error) {
      console.error('Error opening subscription management:', error);
      Alert.alert('Error', 'Failed to open subscription management page');
    }
  };

  const handleJoinDiscord = async () => {
    try {
      await openLink(APP_LINKS.DISCORD);
    } catch (error) {
      console.error('Error opening Discord:', error);
      Alert.alert('Error', 'Failed to open Discord link');
    }
  };

  // 计算用户信息
  const isVip = UserUtils.isVip(user);
  const packageName = UserUtils.getPackageName(user);
  const daysLeft = UserUtils.getDaysUntilExpiry(user);

  const totalCredits = user?.cycle_credit || 400;
  const usedCredits = user?.credits || 0;
  const usageProgress = totalCredits === 0 ? 0 : Math.min(usedCredits / totalCredits, 1);
  const username = user?.name || user?.email?.split('@')[0] || 'shortapp-user';
  const userInitial = username?.charAt(0)?.toUpperCase() || 'S';
  const formattedId =
    user?.user_id && user.user_id.length > 10
      ? `${user.user_id.slice(0, 5)}...${user.user_id.slice(-4)}`
      : user?.user_id || 'Unknown ID';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 40 + Math.max(insets.bottom, 60) },
        ]}
      >
        {/* Header */}
        {showHeader && (
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onBack}>
              <CloseIcon size={22} color="#1F2440" />
            </TouchableOpacity>
          </View>
        )}

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <LinearGradient
              colors={['#FFD9B5', '#FFBCA5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarInitial}>{userInitial}</Text>
            </LinearGradient>
            <View style={styles.statusDot} />
          </View>
          <Text style={styles.profileName}>{username}</Text>
          <Text style={styles.profileEmail}>{user?.email || 'shortapp@test.com'}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>{formattedId}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>{formatDate(user?.created_at)}</Text>
            </View>
          </View>
        </View>

        {/* Usage Card */}
        <View style={styles.usageCard}>
          <View style={styles.usageHeader}>
            <Text style={styles.usageLabel}>USAGE</Text>
            <View style={styles.planPill}>
              <Text style={styles.planPillText}>{packageName}</Text>
            </View>
          </View>
          <Text style={styles.usageTitle}>Credits</Text>
          <Text style={styles.usageCount}>
            {usedCredits.toFixed(0)} <Text style={styles.usageTotal}>/ {totalCredits}</Text>
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${usageProgress * 100}%` }]} />
          </View>
        </View>

        {/* Featured Banner */}
        <TouchableOpacity style={styles.featuredCard} onPress={onUpgrade} activeOpacity={0.9}>
          <LinearGradient
            colors={['#4A3F7A', '#1A0F2A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.featuredCardGradient}
          >
            <View style={styles.featuredLeftContent}>
              <View style={styles.featuredLabelContainer}>
                <SparkleIcon size={14} color="#F8C77D" />
                <Text style={styles.featuredLabel}>FEATURED</Text>
              </View>
              <Text style={styles.featuredTitle}>ShortApp Plans</Text>
              <Text style={styles.featuredSubTitle}>Plans for every kind of vibecoder</Text>
            </View>
            <View style={styles.featuredIconContainer}>
              <View style={styles.featuredIcon}>
                <ChevronForwardIcon size={20} color="#FFFFFF" />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Action List */}
        <View style={styles.listCard}>
          <TouchableOpacity style={styles.listItem} onPress={onUpgrade}>
            <View style={styles.listItemLeft}>
              <View style={styles.listIcon}>
                <StarIcon size={18} color="#4B4F6C" />
              </View>
              <Text style={styles.listItemText}>Upgrade Plan</Text>
            </View>
            <ChevronForwardIcon size={18} color="#C4C4D4" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.listItem} onPress={handleManageAccount}>
            <View style={styles.listItemLeft}>
              <View style={styles.listIcon}>
                <PersonIcon size={18} color="#4B4F6C" />
              </View>
              <Text style={styles.listItemText}>Manage Account</Text>
            </View>
            <ChevronForwardIcon size={18} color="#C4C4D4" />
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}>
          <TouchableOpacity
            style={styles.listItem}
            onPress={handleLogout}
            disabled={logoutLoading}
          >
            <View style={styles.listItemLeft}>
              <View style={styles.listIcon}>
                {logoutLoading ? (
                  <ActivityIndicator size="small" color="#4B4F6C" />
                ) : (
                  <LogOutIcon size={18} color="#4B4F6C" />
                )}
              </View>
              <Text style={styles.listItemText}>Sign Out</Text>
            </View>
            <ChevronForwardIcon size={18} color="#C4C4D4" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.listItem}
            onPress={handleDeleteAccount}
            disabled={deleteLoading}
          >
            <View style={styles.listItemLeft}>
              <View style={[styles.listIcon, styles.dangerIcon]}>
                {deleteLoading ? (
                  <ActivityIndicator size="small" color="#FF5E6C" />
                ) : (
                  <TrashIcon size={18} color="#FF5E6C" />
                )}
              </View>
              <Text style={[styles.listItemText, styles.dangerText]}>Delete Account</Text>
            </View>
            <ChevronForwardIcon size={18} color="#C4C4D4" />
          </TouchableOpacity>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpLabel}>Need help?</Text>
          <TouchableOpacity style={styles.helpButton} onPress={handleJoinDiscord}>
            <DiscordIcon size={18} color="#1F2440" />
            <Text style={styles.helpButtonText}>Join the Discord</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F1324',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF1F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 41,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FF7F3F',
  },
  statusDot: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#34C759',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F1324',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 15,
    color: '#6F7787',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    backgroundColor: '#F3F5FA',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  badgeLabel: {
    fontSize: 13,
    color: '#4B4F6C',
    fontWeight: '600',
  },
  usageCard: {
    backgroundColor: '#F7F8FB',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  usageLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9196AC',
    letterSpacing: 1,
  },
  planPill: {
    backgroundColor: '#E6F7EA',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  planPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3AA968',
  },
  usageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E2238',
  },
  usageCount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E2238',
    marginBottom: 12,
  },
  usageTotal: {
    fontSize: 18,
    color: '#A0A4BA',
    fontWeight: '500',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E6F3',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#51CF66',
  },
  featuredCard: {
    borderRadius: 28,
    marginBottom: 24,
    overflow: 'hidden',
  },
  featuredCardGradient: {
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 120,
  },
  featuredLeftContent: {
    flex: 1,
    padding: 16,
  },
  featuredLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  featuredLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8C77D',
    letterSpacing: 1,
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    lineHeight: 30,
  },
  featuredSubTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  featuredIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  listCard: {
    backgroundColor: '#F8F9FC',
    borderRadius: 24,
    marginBottom: 16,
    paddingVertical: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222638',
  },
  dangerIcon: {
    backgroundColor: '#FFEAEA',
  },
  dangerText: {
    color: '#FF5E6C',
  },
  helpSection: {
    alignItems: 'center',
    marginTop: 12,
  },
  helpLabel: {
    fontSize: 14,
    color: '#7C829C',
    marginBottom: 12,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF1F8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  helpButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2440',
  },
  badgeRowSingle: {
    justifyContent: 'center',
  },
  badgeHighlighted: {
    backgroundColor: '#EAF7FF',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  deleteText: {
    color: '#FF3B30',
  },
});
