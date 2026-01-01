// 支付服务 - 封装 iOS 和 Android 的应用内购买功能

import { Platform } from 'react-native';
import {
  Purchase,
  purchaseErrorListener,
  purchaseUpdatedListener,
  finishTransaction,
  acknowledgePurchaseAndroid,
  requestPurchase,
  fetchProducts,
  initConnection,
  endConnection,
  clearTransactionIOS,
  getAvailablePurchases,
  restorePurchases,
} from 'react-native-iap';

import {
  Product as CustomProduct,
  ProductType,
  PurchaseResult,
  SubscriptionStatus,
  RestoreResult,
  PRODUCTS,
} from './paymentTypes';
import { httpClient } from '@vibecoding/api-client';

class PaymentService {
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;
  private isInitialized = false;
  private onUserProfileNeedsRefresh: (() => Promise<void>) | null = null;
  private onPurchaseVerified: ((productId: string, transactionId: string, price: number) => void) | null = null;
  private onVerificationError: ((errorMessage: string) => void) | null = null;
  private isUserClickedPurchaseButton = false;

  /**
   * 设置用户信息刷新回调
   */
  setOnUserProfileNeedsRefresh(callback: (() => Promise<void>) | null): void {
    this.onUserProfileNeedsRefresh = callback;
  }

  /**
   * 设置购买校验成功回调
   */
  setOnPurchaseVerified(callback: ((productId: string, transactionId: string, price: number) => void) | null): void {
    this.onPurchaseVerified = callback;
  }

  /**
   * 设置校验失败回调
   */
  setOnVerificationError(callback: ((errorMessage: string) => void) | null): void {
    this.onVerificationError = callback;
  }

  /**
   * 初始化支付服务
   */
  async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        await this.disconnect();
      }

      await initConnection();
      this.isInitialized = true;

      // 设置购买更新监听器
      this.purchaseUpdateSubscription = purchaseUpdatedListener(
        async (purchase: Purchase) => {
          if (!this.isUserClickedPurchaseButton) {
            return;
          }
          this.isUserClickedPurchaseButton = false;

            try {
            if (Platform.OS === 'ios') {
                await finishTransaction({ purchase, isConsumable: false });
              } else if (Platform.OS === 'android' && purchase.purchaseToken) {
                await acknowledgePurchaseAndroid(purchase.purchaseToken);
              }
            } catch (error) {
              console.error('finishTransaction error', error);
            }

            try {
              const verifyPaymentParams = {
                productId: purchase.productId,
                device: Platform.OS === 'ios' ? ('ios' as const) : ('android' as const),
                transactionId: (purchase as any).originalTransactionIdentifierIOS,
                purchaseToken: purchase.purchaseToken ?? undefined,
                appStoreReceipt: purchase.purchaseToken ?? undefined,
                transactionReceipt: purchase.purchaseToken ?? undefined,
                transactionDate: purchase.transactionDate ? new Date(purchase.transactionDate).toISOString() : undefined,
                originalTransactionIdentifier: (purchase as any).originalTransactionIdentifierIOS,
                originalPurchaseDate: (purchase as any).originalTransactionDateIOS ? new Date((purchase as any).originalTransactionDateIOS).toISOString() : undefined,
              };

              const verificationResult = await httpClient.verifyPayment(verifyPaymentParams);
              // this.processedTransactions.add(renewalInfo.autoRenewPreference);
              if (verificationResult.code === 0) {
                if (this.onPurchaseVerified) {
                  try {
                    const product = PRODUCTS.find(p =>
                      Platform.OS === 'ios' ? p.iosProductId === purchase.productId : p.androidProductId === purchase.productId
                    );
                    const price = product ? parseFloat(product.price.replace('$', '')) : 0;
                    console.error('originalTransactionIdentifierIOS', (purchase as any).originalTransactionIdentifierIOS);
                    this.onPurchaseVerified(purchase.productId, (purchase as any).originalTransactionIdentifierIOS, price);
                  } catch (callbackError) {
                    console.error('callbackError', callbackError);
                  }
                }

                if (this.onUserProfileNeedsRefresh) {
                  try {
                    await this.onUserProfileNeedsRefresh();
                  } catch (profileError) {
                    // Ignore profile refresh error
                    console.error('profileError', profileError);
                  }
                }
              } else {
                // 校验失败，通过回调通知 UI 层
                const errorMessage = verificationResult.info || 'Payment verification failed. Please try again.';
                console.warn('verificationResult', errorMessage);
                
                if (this.onVerificationError) {
                  this.onVerificationError(errorMessage);
                }
              }
            } catch (verificationError) {
              // Ignore verification error
              console.error('verificationError', verificationError);
            }
        }
      );

      // 设置购买错误监听器
      this.purchaseErrorSubscription = purchaseErrorListener(
        () => {
          // Handle purchase errors silently
        }
      );

      if (Platform.OS === 'ios') {
        await clearTransactionIOS();
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 断开支付服务
   */
  async disconnect(): Promise<void> {
    try {
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
        this.purchaseUpdateSubscription = null;
      }

      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
        this.purchaseErrorSubscription = null;
      }

      await endConnection();
      this.isInitialized = false;
    } catch (error) {
      // Ignore disconnect error
    }
  }

  /**
   * 获取可用的产品列表
   */
  async getAvailableProducts(): Promise<CustomProduct[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const productIds = PRODUCTS.map(
        p => Platform.OS === 'ios' ? p.iosProductId! : p.androidProductId!
      );

      let storeProducts;
      try {
        storeProducts = await fetchProducts({ skus: productIds, type: 'subs' });
      } catch (fetchError: any) {
        throw fetchError;
      }

      const availableProducts: CustomProduct[] = PRODUCTS.map(product => {
        const storeProduct = storeProducts?.find(
          (sp: any) => sp.id === (Platform.OS === 'ios' ? product.iosProductId : product.androidProductId)
        );

        if (storeProduct) {
          return {
            ...product,
            localizedPrice: storeProduct.displayPrice || product.price,
            currency: storeProduct.currency || 'USD',
            price: storeProduct.displayPrice || product.price,
          };
        }

        return product;
      });

      return availableProducts;
    } catch (error) {
      return PRODUCTS;
    }
  }

  /**
   * 购买产品
   */
  async purchaseProduct(productId: string): Promise<PurchaseResult> {
    this.isUserClickedPurchaseButton = true;
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const product = PRODUCTS.find(p => p.productId === productId);
      if (!product) {
        throw new Error(`产品 ${productId} 不存在`);
      }

      const storeProductId = Platform.OS === 'ios'
        ? product.iosProductId!
        : product.androidProductId!;

      const purchaseType = product.type === ProductType.SUBSCRIPTION ? 'subs' : 'in-app';

      let purchase: Purchase | Purchase[] | null = null;
      try {
        purchase = await requestPurchase({
          request: Platform.OS === 'ios'
            ? { ios: { sku: storeProductId } }
            : {
              android: {
                skus: [storeProductId],
                obfuscatedAccountIdAndroid: '',
                obfuscatedProfileIdAndroid: '',
              }
            },
          type: purchaseType,
        });
      } catch (requestError: any) {
        throw requestError;
      }

      if (Array.isArray(purchase) && purchase.length === 0) {
        return {
          success: true,
          message: 'Purchase initiated, waiting for result...',
        };
      }

      if (!purchase) {
        return {
          success: true,
          message: 'Purchase initiated, waiting for result...',
        };
      }

      const purchaseData = Array.isArray(purchase) ? purchase[0] : purchase;

      if (!purchaseData) {
        return {
          success: true,
          message: 'Purchase initiated, waiting for result...',
        };
      }

      return {
        success: true,
        transactionId: purchaseData.id,
        productId: purchaseData.productId,
        receiptData: purchaseData.purchaseToken ?? '',
        purchaseToken: Platform.OS === 'android' ? (purchaseData.purchaseToken ?? undefined) : undefined,
      };
    } catch (error: any) {
      if (
        error.code === 'E_USER_CANCELLED' ||
        error.code === 'user-cancelled' ||
        error.code === 'hh6kFyV8' ||
        error.message?.includes('取消') ||
        error.message?.includes('cancelled') ||
        error.message?.includes('cancel')
      ) {
        return {
          success: false,
          error: 'user_cancelled',
        };
      }

      if (error.code === 'unknown' || error.message?.includes('请求已取消')) {
        return {
          success: false,
          error: 'user_cancelled',
        };
      }

      return {
        success: false,
        error: error.message || error.toString() || '购买失败',
      };
    }
  }

  /**
   * 恢复购买 (主要用于非消耗型产品和订阅)
   */
  async restorePurchases(): Promise<RestoreResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await restorePurchases();

      return {
        success: true,
        products: [],
      };
    } catch (error: any) {
      return {
        success: false,
        products: [],
        error: error.message || '恢复购买失败',
      };
    }
  }

  /**
   * 检查订阅状态
   */
  async checkSubscriptionStatus(productId: string): Promise<SubscriptionStatus> {
    try {
      const purchases = await getAvailablePurchases();

      const product = PRODUCTS.find(p => p.productId === productId);
      if (!product) {
        return { isActive: false };
      }

      const storeProductId = Platform.OS === 'ios'
        ? product.iosProductId!
        : product.androidProductId!;

      const subscription = purchases?.find((p: Purchase) => p.productId === storeProductId);

      if (!subscription) {
        return { isActive: false };
      }

      // 检查订阅是否有效
      const expiryDate = subscription.transactionDate
        ? new Date(subscription.transactionDate)
        : undefined;

      return {
        isActive: true,
        productId: subscription.productId,
        expiryDate,
        autoRenewing: subscription.isAutoRenewing,
      };
    } catch (error) {
      return { isActive: false };
    }
  }
}

// 导出单例
export const paymentService = new PaymentService();