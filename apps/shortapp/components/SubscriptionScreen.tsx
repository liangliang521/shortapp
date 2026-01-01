import  { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from './icons/SvgIcons';
import { usePayment } from '../hooks/usePayment';
import { trackCheckout, trackPurchase } from '@vibecoding/analytics';
import { APP_LINKS, openLink } from '../config/links';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// 检测 iPad：屏幕宽度 >= 768 或使用 Platform.isPad（如果可用）
const isTablet = Platform.OS === 'ios' && (SCREEN_WIDTH >= 768 || (Platform as any).isPad === true);

interface SubscriptionScreenProps {
  onBack: () => void;
  onUpgrade: () => void;
}

// 套餐定义
type PlanTier = 'starter' | 'pro' | 'scale';

interface PlanConfig {
  id: PlanTier;
  name: string;
  description: string;
  monthlyPrice: number; // 月付价格（每月）
  yearlyPrice: number;  // 年付价格（每月，实际收费 × 12）
  productIds: {
    monthly: string;
    yearly: string;
  };
  features: string[];
  isFree: boolean;
}

const PLANS: PlanConfig[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for trying out',
    monthlyPrice: 0,
    yearlyPrice: 0,
    productIds: {
      monthly: '',
      yearly: '',
    },
    features: [
      '1 Vibe Coding App',
      '10 AI credits per month',
      '3 Basic Templates',
      'Broadcast Push Notifications',
      'Basic Analytics',
      'Community Support',
    ],
    isFree: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For serious creators',
    monthlyPrice: 49, // $49/month
    yearlyPrice: 49,  // 不使用年付
    productIds: {
      monthly: 'short_monthly_49',
      yearly: 'short_monthly_49',
    },
    features: [
      '5 Vibe Coding Apps',
      '100 AI credits per month',
      'All Standard Templates',
      'Tag/Segment-based Push',
      'Core Business Analytics',
      'Notion, LLM, AI integrations',
      'Email Support (48h)',
      'Landing Page Generator',
      'Promo AI Agent',
      'App Store Submission',
    ],
    isFree: false,
  },
  {
    id: 'scale',
    name: 'Scale',
    description: 'For power users',
    monthlyPrice: 199, // $199/month
    yearlyPrice: 199,  // 不使用年付
    productIds: {
      monthly: 'short_monthly_199',
      yearly: 'short_monthly_199',
    },
    features: [
      'Unlimited Vibe Coding Apps',
      '400 AI credits per month',
      'All Templates + Industry-specific',
      'Behavior-triggered Push',
      'Advanced Analytics + Segmentation',
      'Zapier, N8N, Notion, LLM integrations',
      'Priority Support (24h)',
      'Advanced Landing Pages',
      'Advanced Promo AI Agent',
      'App Store Submission',
    ],
    isFree: false,
  },
];

export default function SubscriptionScreen({ onBack, onUpgrade }: SubscriptionScreenProps) {
  const { 
    loading, 
    purchasing, 
    restoring,
    error, 
    initialized,
    lastVerifiedPurchase,
    loadProducts, 
    purchase, 
    restore,
    clearLastVerifiedPurchase,
  } = usePayment();

  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('pro');

  // Load products
  useEffect(() => {
    if (initialized) {
      loadProducts();
    }
  }, [initialized, loadProducts]);

  // 监听购买校验成功，上报 analytics
  useEffect(() => {
    if (lastVerifiedPurchase) {
      const { productId, transactionId, price } = lastVerifiedPurchase;
      
      // ✅ 立即清除，防止重复触发
      clearLastVerifiedPurchase();
      
      // 找到对应的套餐信息
      const plan = PLANS.find(p => 
        p.productIds.monthly === productId || p.productIds.yearly === productId
      );
      
      console.log('📊 [SubscriptionScreen] 购买校验成功，上报 analytics');
      console.log('  - Product ID:', productId);
      console.log('  - Transaction ID:', transactionId);
      console.log('  - Price:', price);
      console.log('  - Plan:', plan?.name);

      // 上报 purchase 事件（只在校验成功时上报）
      trackPurchase(price, 'USD', transactionId, [{ 
        id: productId, 
        title: plan?.name || '' 
      }]);

      // 显示成功提示
      Alert.alert(
        'Purchase Successful!',
        `You have successfully subscribed to ${plan?.name}`,
        [
          {
            text: 'OK',
            onPress: () => {
              onUpgrade();
              onBack();
            },
          },
        ]
      );
    }
  }, [lastVerifiedPurchase, onUpgrade, onBack, clearLastVerifiedPurchase]);

  // Get current product ID
  const getCurrentProductId = (): string => {
    const plan = PLANS.find(p => p.id === selectedPlan);
    if (!plan || plan.isFree) return '';
    
    return plan.productIds.monthly; // 只使用月付
  };

  // Get current price (always per month)
  const getCurrentPrice = (): number => {
    const plan = PLANS.find(p => p.id === selectedPlan);
    if (!plan) return 0;
    
    return plan.monthlyPrice;
  };

  // Handle purchase
  const handlePurchase = async () => {
    const productId = getCurrentProductId();
    
    if (!productId) {
      Alert.alert('Error', 'Invalid product selection');
      return;
    }

    const price = getCurrentPrice();

    // analytics: begin checkout
    trackCheckout(price, 'USD', [{ id: productId, title: PLANS.find(p => p.id === selectedPlan)?.name || '' }]);

    const result = await purchase(productId);

    // 注意：购买成功的提示和 analytics 上报已经移到 lastVerifiedPurchase 的监听中
    // 只有在后端校验成功时才会上报 trackPurchase 和显示成功提示
    if (!result.success && result.error) {
      // 用户取消不显示错误
      if (result.error.toLowerCase().includes('cancel') || result.error === 'user_cancelled') {
        console.log('ℹ️ [SubscriptionScreen] User cancelled purchase');
        return;
      }
      
      // 其他错误显示提示
      console.error('❌ [SubscriptionScreen] Purchase error:', result.error);
      Alert.alert('Purchase Failed', result.error);
    }
  };

  // Handle restore purchase
  const handleRestore = async () => {
    const result = await restore();

    if (result.success) {
      if (result.products.length > 0) {
        Alert.alert(
          'Restore Successful',
          `Restored ${result.products.length} purchase(s)`,
          [
            {
              text: 'OK',
              onPress: () => {
                onUpgrade();
                onBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Notice', 'No restorable purchases found');
      }
    } else {
      Alert.alert('Restore Failed', result.error || 'Error occurred while restoring purchases');
    }
  };

  // 获取当前选中套餐的信息
  const currentPlan = PLANS.find(p => p.id === selectedPlan) || PLANS[1];
  const currentPrice = getCurrentPrice();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onBack}>
          <Icon name="Close" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <View style={[styles.content, isTablet && styles.contentTablet]}>
        {/* Title */}
        <Text style={styles.title}>{currentPlan.name}</Text>
        <Text style={styles.subtitle}>{currentPlan.description}</Text>

        {/* Plan Selector Tabs */}
          <View style={[styles.planTabs, isTablet && styles.planTabsTablet]}>
          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planTab, selectedPlan === plan.id && styles.planTabActive]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              <Text style={[styles.planTabText, selectedPlan === plan.id && styles.planTabTextActive]}>
                {plan.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Price Display */}
        <View style={styles.priceSection}>
          {currentPlan.isFree ? (
            <Text style={styles.priceText}>Free</Text>
          ) : (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.priceText}>${currentPrice}</Text>
                <Text style={styles.pricePeriod}>/month</Text>
              </View>
              <Text style={styles.billingNote}>Charged monthly. Cancel anytime.</Text>
            </>
          )}
        </View>

        {/* Features List */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>What's Included</Text>
          <View style={styles.featuresContainer}>
            {currentPlan.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.checkmarkContainer}>
                  <Icon name="Checkmark" size={14} color="#FFFFFF" />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Error Message */}
        {error && !loading && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Upgrade Button */}
        {!currentPlan.isFree && (
          <TouchableOpacity
            style={[styles.upgradeButton, (purchasing || loading) && styles.upgradeButtonDisabled]}
            onPress={handlePurchase}
            disabled={purchasing || loading}
          >
            {purchasing ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={[styles.upgradeButtonText, { marginLeft: 8 }]}>
                  Processing...
                </Text>
              </>
            ) : loading ? (
              <>
              <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={[styles.upgradeButtonText, { marginLeft: 8 }]}>
                  Loading products...
                </Text>
              </>
            ) : (
              <Text style={styles.upgradeButtonText}>
                Subscribe to {currentPlan.name}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {currentPlan.isFree && (
          <View style={styles.freeNote}>
            <Text style={styles.freeNoteText}>
              ✨ Free plan is active
            </Text>
          </View>
        )}

        {/* Footer Links */}
        <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.footerLink}
              onPress={handleRestore} 
              disabled={restoring}
            >
            {restoring ? (
              <ActivityIndicator size="small" color="#8E8E93" />
            ) : (
                <Text style={styles.footerLinkText}>Restore</Text>
            )}
          </TouchableOpacity>
            
            <View style={styles.footerDivider} />
            
            <TouchableOpacity 
              style={styles.footerLink}
              onPress={() => openLink(APP_LINKS.TERMS_OF_SERVICE)}
            >
              <Text style={styles.footerLinkText}>Terms</Text>
            </TouchableOpacity>
            
            <View style={styles.footerDivider} />
            
            <TouchableOpacity 
              style={styles.footerLink}
              onPress={() => openLink(APP_LINKS.PRIVACY_POLICY)}
            >
              <Text style={styles.footerLinkText}>Privacy</Text>
            </TouchableOpacity>
          </View>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'flex-start',
    zIndex: 10,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 20,
  },
  contentTablet: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
  },
  // Plan Tabs
  planTabs: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 3,
    marginBottom: 20,
  },
  planTabsTablet: {
    maxWidth: 500,
    alignSelf: 'center',
  },
  planTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  planTabActive: {
    backgroundColor: '#FF5C00',
  },
  planTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  planTabTextActive: {
    color: '#FFFFFF',
  },
  // Price Section
  priceSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000000',
  },
  pricePeriod: {
    fontSize: 18,
    color: '#8E8E93',
    marginLeft: 4,
  },
  billingNote: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 6,
  },
  // Toggle Section
  toggleSection: {
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 3,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#34C759',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  // Features Section
  featuresSection: {
    marginBottom: 24,
    minHeight: 200,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  featuresContainer: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkmarkContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
    lineHeight: 20,
  },
  // Spacer (removed, using paddingBottom in scrollContent instead)
  // Error
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 16,
  },
  // Free Note
  freeNote: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  freeNoteText: {
    fontSize: 14,
    color: '#34C759',
    textAlign: 'center',
  },
  // Upgrade Button
  upgradeButton: {
    backgroundColor: '#FF5C00',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },
  upgradeButtonDisabled: {
    opacity: 0.5,
  },
  upgradeButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  footerLink: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  footerLinkText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  footerDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#8E8E93',
    opacity: 0.3,
  },
});
