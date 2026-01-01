// ==================== Base Types ====================

/**
 * 基础响应类型
 */
export interface BaseResponse<T = any> {
    code: number; // 0 表示成功
    data?: T | null;
    info?: string | null; // 错误信息，当 code 不为 0 时
}

// ==================== User Types ====================

/**
 * 用户信息
 */
export interface User {
    user_id: string;
    name: string;
    email: string;
    avatar: string; // 头像 URL (必需)
    pkg_code: string; // 套餐代码，如 pkg_free, pkg_pro, pkg_scale
    credits: number; // 当前剩余点数
    cycle_credit: number; // 每月给的点数
    sub_status: number; // 订阅状态，1为正常
    LastPaymentTime: string; // 最后支付时间
    NextBillingTime: string; // 下次计费时间
    created_at: string; // 创建时间
    updated_at: string; // 更新时间
    first_name?: string; // 名
    last_name?: string; // 姓
    gender?: string | null; // 性别
}

/**
 * 用户套餐类型
 */
export type UserPackageCode = 'pkg_free' | 'pro_monthly' | 'scale_monthly' | 'pkg_pro' | 'pkg_scale';

/**
 * 用户工具方法
 */
export const UserUtils = {
    /**
     * 判断用户是否为 VIP（有效订阅）
     */
    isVip(user: User | null | undefined): boolean {
        return user?.sub_status === 1;
    },

    /**
     * 判断用户是否为 Pro 套餐
     */
    isPro(user: User | null | undefined): boolean {
        return user?.pkg_code === 'pkg_pro' || user?.pkg_code === 'pro_monthly';
    },

    /**
     * 判断用户是否为 Scale 套餐
     */
    isScale(user: User | null | undefined): boolean {
        return user?.pkg_code === 'pkg_scale' || user?.pkg_code === 'scale_monthly';
    },

    /**
     * 判断用户是否为免费套餐
     */
    isFree(user: User | null | undefined): boolean {
        return user?.pkg_code === 'pkg_free' || !user?.pkg_code || user.pkg_code === '';
    },

    /**
     * 判断用户是否有付费套餐（Pro 或 Scale）
     */
    hasPaidPlan(user: User | null | undefined): boolean {
        return this.isPro(user) || this.isScale(user);
    },

    /**
     * 获取用户套餐显示名称
     */
    getPackageName(user: User | null | undefined): string {
        if (!user) return 'Unknown';
        const pkgCode = user.pkg_code;

        // 兼容多种套餐代码格式
        if (pkgCode === 'pkg_free' || !pkgCode || pkgCode === '') {
            return 'Free';
        }
        if (pkgCode === 'pkg_pro' || pkgCode === 'pro_monthly') {
            return 'Pro';
        }
        if (pkgCode === 'pkg_scale' || pkgCode === 'scale_monthly') {
            return 'Scale';
        }

        // 未知套餐，尝试从代码中提取
        if (pkgCode.includes('pro')) {
            return 'Pro';
        }
        if (pkgCode.includes('scale')) {
            return 'Scale';
        }

        return 'Unknown';
    },

    /**
     * 判断用户订阅是否即将到期（3天内）
     */
    isSubscriptionExpiringSoon(user: User | null | undefined): boolean {
        if (!user || !this.isVip(user)) return false;
        try {
            const nextBilling = new Date(user.NextBillingTime);
            const now = new Date();
            const daysUntilExpiry = (nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            return daysUntilExpiry <= 3 && daysUntilExpiry > 0;
        } catch {
            return false;
        }
    },

    /**
     * 判断用户订阅是否已过期
     */
    isSubscriptionExpired(user: User | null | undefined): boolean {
        if (!user) return true;
        if (!this.isVip(user)) return true;
        try {
            const nextBilling = new Date(user.NextBillingTime);
            const now = new Date();
            return nextBilling.getTime() < now.getTime();
        } catch {
            return true;
        }
    },

    /**
     * 获取剩余天数
     */
    getDaysUntilExpiry(user: User | null | undefined): number {
        if (!user || !this.isVip(user)) return 0;
        try {
            const nextBilling = new Date(user.NextBillingTime);
            const now = new Date();
            const days = Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return Math.max(0, days);
        } catch {
            return 0;
        }
    },
};

/**
 * 登录响应数据
 */
export interface LoginData {
    user: User;
    access_token: string;
}

// ==================== Project Types ====================

/**
 * App 信息（MiniApp 配置）
 */
export interface AppInfo {
    name: string; // app name
    description: string;
    category: string; // 分类
    language: string;
    ageRating: {
        global: string;
        australia?: string;
        brazil: string;
        korea: string;
    };
    isPublic: boolean; // 是否公开
    addCount: number; // 被添加的数量
    ios?: {
        bundleIdentifier: string;
    };
}

/**
 * 项目信息
 */
export interface Project {
    project_id: string;
    project_uuid: string;
    user_id: string;
    name: string;
    app?: AppInfo; // App 配置信息（可选，某些接口可能不返回）
    sandbox_id: string;
    sandbox_status: string; // ACTIVE/CREATING/FAILED
    sandbox_last_activity_timestamp: string; // datetime
    is_deleted: boolean;
    deleted_at: string | null;
    status: string; // ACTIVE
    code_oss_url?: string; // 代码文件（可选）
    code_md5?: string; // 代码文件MD5（可选）
    startup_info: {
        preview_url: string; // 预览链接
        web_preview_url: string; // 预览链接
    };
    created_at: string; // datetime
    updated_at: string; // datetime
    deployment_id: string | null;
    in_good_standings: boolean;
    project_api_key: string;
    ssh_password: string;
    ssh_active: boolean;
    is_published: boolean;
    published_commit_id?: string; // 可选
    icon_url?: string; // 可选
    bundle_id?: string; // 可选（已废弃，使用 app.ios.bundleIdentifier）
    app_name?: string; // 可选（已废弃，使用 app.name）
    app_slug?: string; // 可选
    apple_team_id?: string; // 可选
    app_store_configured: boolean;
    supports_tablet: boolean;
    type: string; // AGENT
    terminal_sub_type?: string; // 可选
    allow_remix?: boolean; // 可选
    tech_stack?: string; // 可选
    // 其他用户的 MiniApp 可能包含的字段
    disabled?: boolean; // 若为 true，返回只有 id
    disabledReason?: 'non-public' | 'deleted'; // 禁用原因
    // 向后兼容的字段（已废弃，使用 app 对象）
    description?: string | null;
    category?: string | null; // 分类（已废弃，使用 app.category）
    isPublic?: boolean; // 是否公开（已废弃，使用 app.isPublic）
    addCount?: number; // 被添加的数量（已废弃，使用 app.addCount）
}

/**
 * 创建项目响应数据
 */
export interface CreateProjectData {
    project_id: string;
}

/**
 * 项目重命名请求
 */
export interface ProjectRenameRequest {
    name: string;
}

// ==================== Version Types ====================

/**
 * 项目版本信息
 * 根据 OpenAPI Spec，API 使用驼峰命名规范（camelCase）
 */
export interface ProjectVersion {
    versionID: string; // 版本ID
    projectID: string; // 项目ID
    hash: string; // 版本哈希
    message: string; // 提交消息（commit message）
    createdAt: string; // 创建时间（ISO 字符串格式）
}

/**
 * 版本列表响应
 */
export interface ProjectVersionsResponse {
    versions: ProjectVersion[];
    total: number;
}

// ==================== WebSocket Message Types ====================

/**
 * WebSocket 基础消息
 */
export interface BaseSocketMessage {
    type: string;
    msg_id: string;
    timestamp: string;
    user_id: string;
    project_id: string;
    data: any;
}

/**
 * 用户提示消息
 */
export interface UserPrompt {
    prompt: string;
    images: string[]; // 图片URL列表，没有图片时传空数组
    // 其他可选参数（例如模型配置）
    options?: {
        model?: string; // 模型ID，可选
        // 未来可以在这里扩展更多选项
    };
}

/**
 * 模型响应消息（Agent Worker的event对象，原样转发）
 */
export interface ModelResponse {
    error: string | null; // 如果不为空，表示发生错误
    content: string | null; // 模型响应的 JSON 内容
    [key: string]: any; // Agent event可能包含其他字段
}

/**
 * 沙盒状态消息
 */
export interface SandboxStatus {
    job_id: string;
    project_id: string;
    status: 'creating' | 'success' | 'failed' | 'killed';
    sandbox_id?: string; // 仅在status为success时存在
    message: string;
    startup_info?: {
        exp_url: string;
        preview_url: string;
    }; // 仅在status为success时存在
}

/**
 * WebSocket 消息类型枚举（根据文档规范）
 */
export enum WebSocketMessageType {
    USER_PROMPT = '100',      // 用户输入消息
    MODEL_RESPONSE = '200',   // 模型回复消息
    SANDBOX_STATUS = '300',   // 沙盒状态消息
}

/**
 * WebSocket 用户提示消息
 */
export interface UserPromptMessage extends BaseSocketMessage {
    type: WebSocketMessageType.USER_PROMPT;
    data: UserPrompt;
}

/**
 * WebSocket 模型响应消息
 */
export interface ModelResponseMessage extends BaseSocketMessage {
    type: WebSocketMessageType.MODEL_RESPONSE;
    data: ModelResponse;
}

/**
 * WebSocket 沙盒状态消息
 */
export interface SandboxStatusMessage extends BaseSocketMessage {
    type: WebSocketMessageType.SANDBOX_STATUS;
    data: SandboxStatus;
}

/**
 * 所有 WebSocket 消息类型
 */
export type WebSocketMessage =
    | UserPromptMessage
    | ModelResponseMessage
    | SandboxStatusMessage;

// ==================== API Request/Response Types ====================

/**
 * 登录请求参数
 */
export interface LoginRequest {
    // Google 登录
    google_access_token?: string;

    // Apple 登录
    // 根据最新 OpenAPI（/api/v1/auth/login），后端期望字段为 apple_code
    apple_code?: string;

    // Casdoor 登录
    casdoor_code?: string;

    // 邮箱登录（审核使用，隐蔽功能）
    email?: string;
    password?: string;

    // 必填字段
    device: 'web' | 'ios' | 'android';
    type: 'google' | 'apple' | 'casdoor' | 'admin';
    enable_cookie: boolean;
}

/**
 * 刷新 Token 响应数据
 */
export interface RefreshTokenData {
    access_token: string;
}

/**
 * 发布应用请求
 */
export interface PublishRequest {
    expo_token: string;
    apple_id: string;
    password: string;
}

/**
 * 支付校验请求
 * 对应 API: POST /api/v1/payment/check
 * 
 * 注意：
 * - productId 和 device 是必填字段
 * - purchaseToken/appStoreReceipt/data/transactionReceipt 都是 Base64 编码的购买凭证，是服务器验证的关键
 * - 其他字段都是可选的，用于提供更多上下文信息
 */
export interface PaymentVerificationRequest {
    // ===== 必填字段 =====
    productId: string;                    // 产品ID（App Store Connect 配置的）
    device: 'ios' | 'android';            // 设备类型

    // ===== 购买凭证（至少需要提供一个） =====
    purchaseToken?: string;               // Base64 购买凭证（主要字段）
    appStoreReceipt?: string;             // Base64 购买凭证（备用字段1）
    data?: string;                        // Base64 购买凭证（备用字段2）
    transactionReceipt?: string;          // Base64 购买凭证（备用字段3）

    // ===== 交易信息 =====
    transactionId?: string;               // 苹果分配的唯一交易标识符
    transactionDate?: string;             // 交易发生的时间戳
    originalTransactionIdentifier?: string; // 原始交易ID（恢复购买/订阅续订时使用）
    originalPurchaseDate?: string;        // 原始购买时间戳

    // ===== 产品信息 =====
    productIdentifier?: string;           // 产品ID的别名
    productType?: string;                 // 产品类型 (consumable/nonConsumable/autoRenewableSubscription/...)
    quantity?: string;                    // 购买数量（通常是"1"）
    originalDescription?: string;         // 原始产品描述

    // ===== 价格信息 =====
    currency?: string;                    // 购买时使用的货币（如 USD）
    price?: string;                       // 购买时的价格

    // ===== iOS 特有字段 =====
    isAcknowledged?: boolean;             // 是否已确认（iOS 11+）
    isFamilyShareable?: boolean;          // 是否支持家庭共享（iOS 11+）

    // ===== 其他可选字段 =====
    requestDate?: string;                 // 请求购买的时间戳
    signature?: string;                   // 苹果签名字符串
    applicationUsername?: string | null;  // 应用用户名（如果设置了）
    discount?: any | null;                // 折扣信息
    subscriptionPeriod?: any | null;      // 订阅周期信息（订阅产品）
}

/**
 * 支付校验响应数据
 */
export interface PaymentVerificationData {
    verified: boolean;             // 是否验证通过
    subscription_active: boolean;  // 订阅是否激活
    expiry_date?: string;          // 订阅到期时间
    product_id: string;            // 产品ID
    user_id?: string;              // 用户ID
}

// ==================== MiniApp Types ====================

/**
 * 分类信息
 */
export interface Category {
    id: string; // uuid
    key: string; // 类别的唯一 key（如 productivity）
    name: string; // 显示名
    description: string;
}

/**
 * 排名项（榜单中的项目）
 */
export interface RankItem {
    project_id: string;
    name: string;
    description: string;
    user_id: string;
    userName: string; // 创作者名称
    category: string;
    isFeatured: boolean; // 是否为精选
    addCount: number; // 添加数量（整数格式）
}

/**
 * 获取用户 MiniApps 响应数据
 */
export interface UserMiniappsData {
    owner: Project[]; // 自己创建的
    other: Project[]; // 其他人创建的（可能包含 disabled 字段）
    offset: number;
    limit: number;
    total: number;
}

/**
 * MiniApp 配置请求
 */
export interface MiniappConfigRequest {
    name?: string; // 名称：不得少于两个字符，且不得超过 30 个字符
    category?: string; // 分类
    isPublic?: boolean; // 是否公开
    bundle_id?: string; // Bundle ID
    sku?: string; // SKU：唯一 ID，用于内部跟踪
    primary_language?: string; // 主要语言
    primary_category?: string; // 主要类别
    description?: string; // app 描述
    // 其他配置字段...
    [key: string]: any;
}


