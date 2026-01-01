/**
 * API 配置
 */

// 默认配置
export const DEFAULT_API_CONFIG = {
    // baseURL: process.env.API_BASE_URL || 'http://192.168.6.221:4242',
    // wsURL: process.env.WS_BASE_URL || 'ws://192.168.6.221:4242',
    // baseURL: process.env.API_BASE_URL || 'https://api.shortapp.dev', //线上
    // wsURL: process.env.WS_BASE_URL || 'wss://api.shortapp.dev',
    baseURL: process.env.API_BASE_URL || 'https://api-stg01.shortapp.dev', //预发布
    wsURL: process.env.WS_BASE_URL || 'wss://api-stg01.shortapp.dev',
    // baseURL: process.env.API_BASE_URL || 'https://api-shortapp.wenuts.top', //beijing
    // wsURL: process.env.WS_BASE_URL || 'wss://api-shortapp.wenuts.top',
    timeout: 10000, // 10秒超时
    headers: {
        'Content-Type': 'application/json',
    },
};

// API 配置类
export class ApiConfig {
    private static instance: ApiConfig;
    private config: typeof DEFAULT_API_CONFIG;
    private accessToken: string | null = null;

    private constructor() {
        this.config = { ...DEFAULT_API_CONFIG };
    }

    static getInstance(): ApiConfig {
        if (!ApiConfig.instance) {
            ApiConfig.instance = new ApiConfig();
        }
        return ApiConfig.instance;
    }

    // 设置基础 URL
    setBaseURL(baseURL: string): void {
        this.config.baseURL = baseURL;
    }

    // 获取基础 URL
    getBaseURL(): string {
        return this.config.baseURL;
    }

    // 设置 WebSocket URL
    setWsURL(wsURL: string): void {
        this.config.wsURL = wsURL;
    }

    // 获取 WebSocket URL
    getWsURL(): string {
        return this.config.wsURL;
    }

    // 设置超时时间
    setTimeout(timeout: number): void {
        this.config.timeout = timeout;
    }

    // 获取超时时间
    getTimeout(): number {
        return this.config.timeout;
    }

    // 设置 Access Token
    setAccessToken(token: string | null): void {
        this.accessToken = token;
    }

    // 获取 Access Token
    getAccessToken(): string | null {
        return this.accessToken;
    }

    // 获取请求头
    getHeaders(): Record<string, string> {
        const headers: Record<string, string> = { ...this.config.headers };
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        return headers;
    }

    // 重置配置
    reset(): void {
        this.config = { ...DEFAULT_API_CONFIG };
        this.accessToken = null;
    }
}

// 导出单例实例
export const apiConfig = ApiConfig.getInstance();


