// 支付相关的 TypeScript 类型定义

export enum ProductType {
  CONSUMABLE = 'consumable',           // 消耗型商品
  NON_CONSUMABLE = 'non_consumable',   // 非消耗型商品
  SUBSCRIPTION = 'subscription',        // 订阅
}

export enum SubscriptionPeriod {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  WEEKLY = 'weekly',
}

// 产品信息
export interface Product {
  productId: string;                    // 产品ID (iOS/Android通用)
  iosProductId?: string;                // iOS专用产品ID
  androidProductId?: string;            // Android专用产品ID
  type: ProductType;
  title: string;
  description: string;
  price: string;
  localizedPrice?: string;              // 本地化价格
  currency?: string;
  subscriptionPeriod?: SubscriptionPeriod;
}

// 购买结果
export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  productId?: string;
  receiptData?: string;                 // iOS receipt
  purchaseToken?: string;               // Android purchase token
  error?: string;
  message?: string;                     // 信息消息（例如：等待回调）
}

// 订阅状态
export interface SubscriptionStatus {
  isActive: boolean;
  productId?: string;
  expiryDate?: Date;
  autoRenewing?: boolean;
}

// 恢复购买结果
export interface RestoreResult {
  success: boolean;
  products: string[];                   // 已购买的产品ID列表
  error?: string;
}

// 产品配置 - 定义应用中的所有产品
export const PRODUCTS: Product[] = [
  {
    productId: 'short_monthly_49',
    iosProductId: 'short_monthly_49',      // App Store Connect中配置的Pro月付
    androidProductId: 'short_monthly_49',
    type: ProductType.SUBSCRIPTION,
    title: 'Pro Plan',
    description: 'For serious creators - 5 apps, 100 AI credits',
    price: '$49',
    subscriptionPeriod: SubscriptionPeriod.MONTHLY,
  },
  {
    productId: 'short_monthly_199',
    iosProductId: 'short_monthly_199',     // App Store Connect中配置的Scale月付
    androidProductId: 'short_monthly_199',
    type: ProductType.SUBSCRIPTION,
    title: 'Scale Plan',
    description: 'For power users - Unlimited apps, 400 AI credits',
    price: '$199',
    subscriptionPeriod: SubscriptionPeriod.MONTHLY,
  },
];

