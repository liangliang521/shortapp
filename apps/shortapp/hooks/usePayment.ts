// React Hook for Payment Service

import { useState, useEffect, useCallback } from 'react';
import { paymentService } from '../services/paymentService';
import {
  Product,
  PurchaseResult,
  RestoreResult,
  SubscriptionStatus,
} from '../services/paymentTypes';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../utils/toast';

export function usePayment() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [lastVerifiedPurchase, setLastVerifiedPurchase] = useState<{
    productId: string;
    transactionId: string;
    price: number;                        
  } | null>(null);

  // 获取 authStore 的 refreshUserProfile 方法
  const refreshUserProfile = useAuthStore((state) => state.refreshUserProfile);

  // 初始化支付服务
  useEffect(() => {
    let mounted = true;

    const initializePayment = async () => {
      try {
        // 设置用户信息刷新回调
        paymentService.setOnUserProfileNeedsRefresh(async () => {
          if (mounted) {
            await refreshUserProfile();
          }
        });

        // 设置购买校验成功回调
        paymentService.setOnPurchaseVerified((productId, transactionId, price) => {
          if (mounted) {
            setLastVerifiedPurchase({ productId, transactionId, price });
          }
        });

        // 设置校验失败回调
        paymentService.setOnVerificationError((errorMessage) => {
          if (mounted) {
            toast.error(errorMessage, 'Payment');
          }
        });

        const success = await paymentService.initialize();
        if (mounted) {
          setInitialized(success);
          if (!success) {
            setError('支付服务初始化失败');
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || '初始化失败');
          setInitialized(false);
        }
      }
    };

    initializePayment();

    return () => {
      mounted = false;
      // 清除回调
      paymentService.setOnUserProfileNeedsRefresh(null);
      paymentService.setOnPurchaseVerified(null);
      paymentService.disconnect();
    };
  }, [refreshUserProfile]);

  // 获取产品列表
  const loadProducts = useCallback(async () => {
    if (!initialized) {
      setError('支付服务未初始化');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const availableProducts = await paymentService.getAvailableProducts();
      setProducts(availableProducts);
    } catch (err: any) {
      setError(err.message || '获取产品列表失败');
    } finally {
      setLoading(false);
    }
  }, [initialized]);

  // 购买产品
  const purchase = useCallback(
    async (productId: string): Promise<PurchaseResult> => {
      if (!initialized) {
        const result: PurchaseResult = {
          success: false,
          error: '支付服务未初始化',
        };
        return result;
      }

      setPurchasing(true);
      setError(null);

      try {
        const result = await paymentService.purchaseProduct(productId);

        if (!result.success) {
          setError(result.error || '购买失败');
        }

        return result;
      } catch (err: any) {
        const errorMessage = err.message || '购买失败';
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setPurchasing(false);
      }
    },
    [initialized]
  );

  // 恢复购买
  const restore = useCallback(async (): Promise<RestoreResult> => {
    if (!initialized) {
      return {
        success: false,
        products: [],
        error: '支付服务未初始化',
      };
    }

    setRestoring(true);
    setError(null);

    try {
      const result = await paymentService.restorePurchases();

      if (!result.success) {
        setError(result.error || '恢复购买失败');
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || '恢复购买失败';
      setError(errorMessage);
      return {
        success: false,
        products: [],
        error: errorMessage,
      };
    } finally {
      setRestoring(false);
    }
  }, [initialized]);

  // 检查订阅状态
  const checkSubscription = useCallback(
    async (productId: string): Promise<SubscriptionStatus> => {
      if (!initialized) {
        return { isActive: false };
      }

      try {
        return await paymentService.checkSubscriptionStatus(productId);
      } catch (err: any) {
        console.error('检查订阅状态失败:', err);
        return { isActive: false };
      }
    },
    [initialized]
  );

  // 清空最后校验的购买记录
  const clearLastVerifiedPurchase = useCallback(() => {
    setLastVerifiedPurchase(null);
  }, []);

  return {
    // 状态
    products,
    loading,
    purchasing,
    restoring,
    error,
    initialized,
    lastVerifiedPurchase,

    // 方法
    loadProducts,
    purchase,
    restore,
    checkSubscription,
    clearLastVerifiedPurchase,
  };
}

