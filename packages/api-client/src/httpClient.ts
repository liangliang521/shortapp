/**
 * HTTP API 客户端
 * 基于 OpenAPI 规范实现的 HTTP 请求服务
 */

import { apiConfig } from './config';
import {
    BaseResponse,
    User,
    LoginData,
    LoginRequest,
    RefreshTokenData,
    Project,
    CreateProjectData,
    ProjectRenameRequest,
    PublishRequest,
    PaymentVerificationRequest,
    PaymentVerificationData,
    Category,
    UserMiniappsData,
    MiniappConfigRequest,
    RankItem,
    ProjectVersion,
    ProjectVersionsResponse,
} from './types';
import { Platform } from 'react-native';

/**
 * HTTP 请求方法
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * 请求配置
 */
interface RequestConfig {
    method: HttpMethod;
    path: string;
    body?: any;
    params?: Record<string, string>;
    headers?: Record<string, string>;
    requiresAuth?: boolean;
}

/**
 * HTTP API 客户端类
 */
class HttpApiClient {
    private isRefreshing = false; // 是否正在刷新token
    private refreshSubscribers: Array<(token: string) => void> = []; // 等待刷新完成的请求队列

    /**
     * 添加请求到等待队列
     */
    private subscribeTokenRefresh(callback: (token: string) => void) {
        this.refreshSubscribers.push(callback);
    }

    /**
     * 通知所有等待的请求
     */
    private onTokenRefreshed(token: string) {
        this.refreshSubscribers.forEach(callback => callback(token));
        this.refreshSubscribers = [];
    }

    /**
     * 发送 HTTP 请求
     */
    private async request<T>(config: RequestConfig): Promise<BaseResponse<T>> {
        const { method, path, body, params, headers, requiresAuth = false } = config;

        // 构建完整 URL
        const baseURL = apiConfig.getBaseURL();
        const url = new URL(path, baseURL);

        // 添加查询参数
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
        }

        // 构建请求头
        const requestHeaders = {
            ...apiConfig.getHeaders(),
            ...headers,
        };

        // 如果需要认证但没有 token，直接返回 401（不自动刷新，让用户重新登录）
        if (requiresAuth && !apiConfig.getAccessToken()) {
            console.warn('⚠️ [HTTP] No access token found');
            return {
                code: 401,
                info: 'Please login to continue',
            };
        }

        // 打印请求详情（在请求之前打印完整信息）
        console.log('🌐 [HTTP Request]', {
            method,
            url: url.toString(),
            headers: requestHeaders,
            body: body ? JSON.stringify(body).substring(0, 500) : undefined,
        });

        try {
            // 实现带超时的 fetch (React Native fetch 不支持原生 timeout)
            const timeoutMs = apiConfig.getTimeout();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const response = await fetch(url.toString(), {
                    method,
                    headers: requestHeaders,
                    body: body ? JSON.stringify(body) : undefined,
                    signal: controller.signal,
                    credentials: 'include', // ✅ 关键：让 fetch 自动携带和保存 Cookie
                });

                clearTimeout(timeoutId);

                // ✅ 401 自动刷新 token 并重试请求
                if (response.status === 401 && requiresAuth && path !== '/api/v1/auth/refresh') {
                    console.warn('⚠️ [HTTP] 401 Unauthorized - Token expired, attempting to refresh...');

                    // 如果正在刷新，等待刷新完成后重试
                    if (this.isRefreshing) {
                        console.log('⏳ [HTTP] Token refresh in progress, queuing request...');
                        return new Promise<BaseResponse<T>>((resolve) => {
                            this.subscribeTokenRefresh((newToken: string) => {
                                console.log('🔄 [HTTP] Retrying request with new token...');
                                // 更新 config 中的 token（通过重新获取 headers）
                                resolve(this.request<T>(config));
                            });
                        });
                    }

                    // 标记开始刷新
                    this.isRefreshing = true;

                    try {
                        // 调用刷新 token 接口
                        const refreshResult = await this.refreshToken();
                        console.log('🔄 [HTTP] refreshResult:', refreshResult);
                        if (refreshResult.code === 0 && refreshResult.data?.access_token) {
                            const newToken = refreshResult.data.access_token;
                            console.log('✅ [HTTP] Token refreshed successfully');

                            // 更新 token
                            apiConfig.setAccessToken(newToken);

                            // 通知所有等待的请求
                            this.onTokenRefreshed(newToken);

                            // 重置刷新状态
                            this.isRefreshing = false;

                            // 重试原请求
                            console.log('🔄 [HTTP] Retrying original request...');
                            return this.request<T>(config);
                        } else {
                            // 刷新失败，清除认证信息（refresh token 也过期了）
                            console.error('❌ [HTTP] Token refresh failed - clearing auth');
                            apiConfig.setAccessToken(null);
                            this.isRefreshing = false;

                            return {
                                code: 401,
                                info: 'Session expired. Please login again.',
                            };
                        }
                    } catch (refreshError) {
                        console.error('❌ [HTTP] Token refresh error:', refreshError);
                        // 刷新请求失败，清除认证信息
                        apiConfig.setAccessToken(null);
                        this.isRefreshing = false;

                        return {
                            code: 401,
                            info: 'Session expired. Please login again.',
                        };
                    }
                }

                if (!response.ok) {
                    console.log('❌ [HTTP Response] Error:', {
                        status: response.status,
                        statusText: response.statusText,
                    });
                    
                    // 尝试解析错误响应
                    try {
                        const errorData = await response.json();
                        console.log('❌ [HTTP Response] Error Data:', errorData);
                        return {
                            code: response.status,
                            info: errorData.info || errorData.message || response.statusText,
                            data: errorData.data,
                        } as BaseResponse<T>;
                    } catch {
                        return {
                            code: response.status,
                            info: response.statusText || `HTTP error! status: ${response.status}`,
                        };
                    }
                }

                const data = await response.json();
                // console.log('✅ [HTTP Response]', {
                //     respone: JSON.stringify(data),
                // });
                return data as BaseResponse<T>;
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        } catch (error) {
            console.error('API request error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                code: -1,
                info: error instanceof Error && error.name === 'AbortError' ? 'Request timeout' : errorMessage,
            };
        }
    }

    // ==================== Auth APIs ====================

    /**
     * 通用登录方法
     */
    async login(data: LoginRequest): Promise<BaseResponse<LoginData>> {
        return this.request<LoginData>({
            method: 'POST',
            path: '/api/v1/auth/login',
            body: data,
        });
    }

    /**
     * Google 登录（便捷方法）
     */
    async loginWithGoogle(googleAccessToken?: string): Promise<BaseResponse<LoginData>> {
        return this.login({
            type: 'google',
            device: Platform.OS === 'ios' ? 'ios' : 'android',
            enable_cookie: true,
            google_access_token: googleAccessToken,
        });
    }

    /**
     * Apple 登录（便捷方法）
     *
     * 根据最新 OpenAPI（/api/v1/auth/login），后端期望字段为 `apple_code`
     * 这里将 Apple 返回的 identity token 作为 apple_code 传给服务端。
     */
    async loginWithApple(appleIdentityToken: string): Promise<BaseResponse<LoginData>> {
        return this.login({
            type: 'apple',
            device: Platform.OS === 'ios' ? 'ios' : 'android',
            enable_cookie: true,
            apple_code: appleIdentityToken,
        });
    }

    /**
     * 邮箱登录（审核使用，隐蔽功能）
     * 仅用于 App 审核或管理员登录
     */
    async loginWithEmail(email: string, password: string): Promise<BaseResponse<LoginData>> {
        return this.login({
            type: 'admin',
            device: Platform.OS === 'ios' ? 'ios' : 'android',
            enable_cookie: true,
            email,
            password,
        });
    }

    /**
     * 刷新 Token
     */
    async refreshToken(): Promise<BaseResponse<RefreshTokenData>> {
        return this.request<RefreshTokenData>({
            method: 'POST',
            path: '/api/v1/auth/refresh',
        });
    }

    // ==================== User APIs ====================

    /**
     * 登出
     */
    async logout(): Promise<BaseResponse> {
        return this.request({
            method: 'POST',
            path: '/api/v1/user/logout',
            requiresAuth: true,
        });
    }

    /**
     * 获取用户信息（从JWT token获取当前用户）
     */
    async getUserProfile(): Promise<BaseResponse<User>> {
        return this.request<User>({
            method: 'GET',
            path: '/api/v1/user',
            requiresAuth: true,
        });
    }

    // ==================== Project APIs ====================

    /**
     * 创建项目
     * @param type 项目类型：'miniapp' | 'web' | 'nativeapp'
     */
    async createProject(type: 'miniapp' | 'web' | 'nativeapp' = 'miniapp'): Promise<BaseResponse<CreateProjectData>> {
        return this.request<CreateProjectData>({
            method: 'POST',
            path: '/api/v1/projects',
            body: { type },
            requiresAuth: true,
        });
    }

    /**
     * 获取项目列表
     */
    async getProjects(page: number = 1, limit: number = 20): Promise<BaseResponse<{ projects: Project[], total: number, page: number, limit: number }>> {
        return this.request<{ projects: Project[], total: number, page: number, limit: number }>({
            method: 'GET',
            path: '/api/v1/projects',
            params: {
                page: page.toString(),
                limit: limit.toString(),
            },
            requiresAuth: true,
        });
    }

    /**
     * 获取项目详情
     */
    async getProject(projectId: string): Promise<BaseResponse<Project>> {
        return this.request<Project>({
            method: 'GET',
            path: `/api/v1/projects/${projectId}`,
            requiresAuth: true,
        });
    }

    /**
     * 删除项目
     */
    async deleteProject(projectId: string): Promise<BaseResponse> {
        return this.request({
            method: 'POST',
            path: `/api/v1/projects/${projectId}/delete`,
            requiresAuth: true,
        });
    }

    /**
     * 重命名项目
     */
    async renameProject(projectId: string, name: string): Promise<BaseResponse<Project>> {
        return this.request<Project>({
            method: 'POST',
            path: `/api/v1/projects/${projectId}/rename`,
            body: { name } as ProjectRenameRequest,
            requiresAuth: true,
        });
    }

    /**
     * 启动项目
     */
    async startProject(projectId: string): Promise<BaseResponse> {
        return this.request({
            method: 'POST',
            path: `/api/v1/projects/${projectId}/start`,
            requiresAuth: true,
        });
    }

    /**
     * 停止项目
     */
    async stopProject(projectId: string): Promise<BaseResponse> {
        return this.request({
            method: 'POST',
            path: `/api/v1/projects/${projectId}/stop`,
            requiresAuth: true,
        });
    }

    /**
     * 下载项目源代码
     */
    async downloadProject(projectId: string): Promise<Blob> {
        const baseURL = apiConfig.getBaseURL();
        const url = `${baseURL}/api/v1/projects/${projectId}/download`;

        const response = await fetch(url, {
            method: 'GET',
            headers: apiConfig.getHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Failed to download project: ${response.status}`);
        }

        return response.blob();
    }

    // ==================== Publish API ====================

    /**
     * 发布应用
     */
    async publishApp(data: PublishRequest): Promise<BaseResponse> {
        const formData = new FormData();
        formData.append('expo_token', data.expo_token);
        formData.append('apple_id', data.apple_id);
        formData.append('password', data.password);

        return this.request({
            method: 'GET', // 注意：OpenAPI 中定义为 GET 但使用 requestBody，这可能是个错误
            path: '/api/v1/publish',
            body: formData,
        });
    }

    /**
     * 删除账号
     */
    async deleteAccount(): Promise<BaseResponse> {
        return this.request({
            method: 'POST',
            path: '/api/v1/user',
            requiresAuth: true,
        });
    }

    // ==================== Chat/Message APIs ====================

    /**
     * 获取历史消息
     */
    async getHistoryMessages(projectId: string, limit: number = 20, offset: number = 0): Promise<BaseResponse> {
        return this.request({
            method: 'GET',
            path: `/api/v1/events/history/${projectId}`,
            params: {
                limit: limit.toString(),
                offset: offset.toString(),
            },
            requiresAuth: true,
        });
    }

    /**
     * 清除历史消息
     */
    async clearHistoryMessages(projectId: string): Promise<BaseResponse> {
        return this.request({
            method: 'POST',
            path: `/api/v1/events/clear/${projectId}`,
            requiresAuth: true,
        });
    }

    /**
     * 停止 Agent（使用项目停止接口）
     */
    async stopAgent(projectId: string): Promise<BaseResponse> {
        // 使用项目停止接口来停止 agent
        return this.stopProject(projectId);
    }

    /**
     * 获取 WebSocket 连接路径
     */
    async getWebSocketConnection(projectId: string): Promise<BaseResponse<{ path: string }>> {
        return this.request<{ path: string }>({
            method: 'POST',
            path: '/api/v1/ws',
            body: {
                project_id: projectId,
                device: Platform.OS === 'ios' ? 'ios' : 'android',
            },
            requiresAuth: true,
        });
    }

    // ==================== Upload APIs ====================

    /**
     * 上传图片到项目（通过后端代理到OSS）
     * @param projectId 项目ID
     * @param base64Data base64图片数据（data:image/jpeg;base64,xxx格式）
     * @param onProgress 进度回调
     * @param imageId 可选的图片ID，用于标识上传的图片
     * @returns OSS URL
     */
    async uploadImage(
        projectId: string,
        base64Data: string,
        onProgress?: (progress: number) => void,
        imageId?: string
    ): Promise<BaseResponse<{ url: string }>> {
        return new Promise((resolve) => {
            try {
                const baseURL = apiConfig.getBaseURL();
                const url = `${baseURL}/api/v1/projects/${projectId}/upload/images`;

                // React Native 的 FormData 使用方式
                const mimeType = base64Data.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
                const fileName = `image_${Date.now()}.jpg`;

                const formData = new FormData();
                // React Native 需要以对象形式传递文件
                formData.append('images', {
                    uri: base64Data, // 直接传递 data URI
                    type: mimeType,
                    name: fileName,
                } as any);

                // 添加图片ID（如果提供）- 按照新接口要求，images_id是array[string]类型
                // 注意：images_id 是可选的，且必须与上传的文件数量匹配
                // 在单文件上传场景下，暂时不传递 images_id 以避免数量不匹配问题
                // 如果需要使用 imageId，建议使用批量上传接口
                if (imageId) {
                    console.log('⚠️ [Upload] imageId provided but not sent (use uploadMultipleImages for imageId support):', imageId);
                }

                const xhr = new XMLHttpRequest();

                // 上传进度
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable && onProgress) {
                        const progress = (event.loaded / event.total) * 100;
                        onProgress(progress);
                        console.log(`📤 [Upload] Progress: ${progress.toFixed(2)}%`);
                    }
                };

                xhr.open('POST', url);

                // 设置请求头（不包括 Content-Type，让浏览器自动设置 multipart/form-data 的 boundary）
                const headers = apiConfig.getHeaders();

                Object.entries(headers).forEach(([key, value]) => {
                    if (key.toLowerCase() !== 'content-type') {
                        xhr.setRequestHeader(key, value);
                    }
                });

                xhr.onload = () => {
                    try {
                        const result = JSON.parse(xhr.responseText);

                        if (xhr.status === 200 || xhr.status === 201) {
                            // 新接口返回格式：{success: [{path, image_id}], failed: []}
                            if (result.data && result.data.success && result.data.success.length > 0) {
                                const imagePath = result.data.success[0].path;
                                resolve({
                                    code: 0,
                                    data: { url: imagePath },
                                    info: null,
                                });
                            } else if (result.data && result.data.failed && result.data.failed.length > 0) {
                                const error = result.data.failed[0].error;
                                console.error('❌ [Upload] Failed:', error);
                                resolve({
                                    code: -1,
                                    info: error,
                                });
                            } else {
                                resolve(result);
                            }
                        } else {
                            console.error(`❌ [Upload] HTTP ${xhr.status}`);
                            resolve({
                                code: xhr.status,
                                info: result.info || xhr.statusText,
                                data: result.data,
                            });
                        }
                    } catch (error) {
                        console.error('❌ [Upload] Parse error');
                        resolve({
                            code: -1,
                            info: 'Failed to parse response',
                        });
                    }
                };

                xhr.onerror = () => {
                    console.error('❌ [Upload] Network error');
                    resolve({
                        code: -1,
                        info: 'Network error',
                    });
                };

                xhr.send(formData);
            } catch (error) {
                console.error('❌ [Upload] Error:', error);
                resolve({
                    code: -1,
                    info: error instanceof Error ? error.message : 'Upload failed',
                });
            }
        });
    }

    /**
     * 批量上传图片（一次性上传所有文件）
     * @param projectId 项目ID
     * @param base64Array base64图片数组
     * @param onProgress 总体进度回调
     * @param imageIds 可选的图片ID数组，与base64Array按顺序对应
     * @returns OSS URL数组
     */
    async uploadMultipleImages(
        projectId: string,
        base64Array: string[],
        onProgress?: (progress: number) => void,
        imageIds?: string[]
    ): Promise<string[]> {
        console.log(`📤 [Upload] Uploading ${base64Array.length} images...`);
        
        // 如果没有提供 imageIds，为每个图片生成唯一的 ID
        // 因为后端要求 images_id 数量必须与文件数量匹配
        if (!imageIds || imageIds.length === 0) {
            imageIds = base64Array.map((_, index) => `img_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`);
        } else if (imageIds.length !== base64Array.length) {
            console.warn('⚠️ [Upload] imageIds length mismatch, regenerating');
            imageIds = base64Array.map((_, index) => `img_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`);
        }

        return new Promise((resolve, reject) => {
            try {
                const baseURL = apiConfig.getBaseURL();
                const url = `${baseURL}/api/v1/projects/${projectId}/upload/images`;

                const formData = new FormData();

                // 添加所有图片文件（使用相同的 key 名）
                base64Array.forEach((base64Data, index) => {
                    const mimeType = base64Data.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
                    const fileName = `image_${Date.now()}_${index}.jpg`;

                    // multipart/form-data 中，多个文件使用相同的字段名
                    formData.append('images', {
                        uri: base64Data,
                        type: mimeType,
                        name: fileName,
                    } as any);
                });

                // 添加所有图片ID（也使用相同的 key 名）
                imageIds.forEach((imageId) => {
                    formData.append('images_id', imageId);
                });

                const xhr = new XMLHttpRequest();

                // 上传进度
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable && onProgress) {
                        const progress = (event.loaded / event.total) * 100;
                        onProgress(progress);
                        console.log(`📤 [Upload] Progress: ${progress.toFixed(2)}%`);
                    }
                };

                xhr.open('POST', url);

                // 设置请求头
                const headers = apiConfig.getHeaders();
                Object.entries(headers).forEach(([key, value]) => {
                    if (key.toLowerCase() !== 'content-type') {
                        xhr.setRequestHeader(key, value);
                    }
                });

                xhr.onload = () => {
                    try {
                        const result = JSON.parse(xhr.responseText);

                        if (xhr.status === 200 || xhr.status === 201) {
                            // 新接口返回格式：{success: [{path, image_id}], failed: []}
                            // 直接返回原始path，不做任何处理
                            if (result.data && result.data.success && result.data.success.length > 0) {
                                const paths = result.data.success.map((item: any) => item.path);
                                console.log(`✅ [Upload] ${paths.length} images uploaded successfully`);
                                resolve(paths);
                            } else if (result.data && result.data.failed && result.data.failed.length > 0) {
                                const errors = result.data.failed.map((item: any) => item.error).join(', ');
                                console.error('❌ [Upload] Upload failed:', errors);
                                reject(new Error(errors));
                            } else {
                                console.error('❌ [Upload] Unexpected response format');
                                reject(new Error('Unexpected response format'));
                            }
                        } else {
                            console.error(`❌ [Upload] HTTP ${xhr.status}: ${result.info || xhr.statusText}`);
                            reject(new Error(result.info || result.message || xhr.statusText || `HTTP ${xhr.status}`));
                        }
                    } catch (error) {
                        console.error('❌ [Upload] Failed to parse response:', error);
                        reject(new Error('Failed to parse response'));
                    }
                };

                xhr.onerror = () => {
                    console.error('❌ [Upload] Network error');
                    reject(new Error('Network error'));
                };

                xhr.send(formData);
            } catch (error) {
                console.error('❌ [Upload] Preparation failed:', error);
                reject(error);
            }
        });
    }

    // ==================== Payment APIs ====================

    /**
     * 验证支付（模拟接口，等待后端实现）
     * @param data 支付校验请求数据
     * @returns 校验结果
     */
    async verifyPayment(data: PaymentVerificationRequest): Promise<BaseResponse<PaymentVerificationData>> {
        console.log('💳 [Payment] Verifying payment...');
        console.log('💳 [Payment] Product ID:', data.productId);
        console.log('💳 [Payment] Transaction ID:', data.transactionId);

        return this.request<PaymentVerificationData>({
            method: 'POST',
            path: '/api/v1/payment/check',
            body: data,
            requiresAuth: true,
        });
    }

    // ==================== MiniApp APIs ====================

    /**
     * 获取用户的 MiniApps
     * @param limit 每页数量，默认 20
     * @param offset 偏移量，默认 0
     * @returns 用户的 MiniApps 列表（包含自己创建的和添加的）
     */
    async getUserMiniapps(limit: number = 20, offset: number = 0): Promise<BaseResponse<UserMiniappsData>> {
        return this.request<UserMiniappsData>({
            method: 'GET',
            path: '/api/v1/me/miniapps',
            params: {
                limit: limit.toString(),
                offset: offset.toString(),
            },
            requiresAuth: true,
        });
    }

    /**
     * 附加（添加）别人的 MiniApp
     * @param projectId 项目 ID（注意：API 路径中使用的是 proejctId，但这里使用正确的拼写 projectId）
     * @returns 操作结果
     */
    async attachMiniapp(projectId: string): Promise<BaseResponse> {
        // 注意：API 路径中可能是拼写错误 proejctId，但实际应该使用 projectId
        // 如果后端使用的是 proejctId，需要修改路径
        return this.request({
            method: 'POST',
            path: `/api/v1/miniapps/${projectId}/attach`,
            requiresAuth: true,
        });
    }

    /**
     * 配置 MiniApp
     * @param projectId 项目 ID
     * @param config 配置数据
     * @returns 操作结果
     */
    async configureMiniapp(projectId: string, config: MiniappConfigRequest): Promise<BaseResponse> {
        return this.request({
            method: 'POST',
            path: `/api/v1/miniapps/${projectId}/config`,
            body: config,
            requiresAuth: false,
        });
    }

    /**
     * 获取分类列表
     * @returns 分类列表
     */
    async getCategorys(): Promise<BaseResponse<Category[]>> {
        return this.request<Category[]>({
            method: 'GET',
            path: '/api/v1/miniapps/categories',
            requiresAuth: false,
        });
    }

    /**
     * 获取某个分类下的榜单
     * @param category 分类key（可选，默认 "all"）
     * @param featured 是否为精选项目（true=banner数据，false=正常榜单数据，默认 false）
     * @returns 该分类下的排名列表
     */
    async getRankByCategory(category: string = 'all', featured: boolean = false): Promise<BaseResponse<RankItem[]>> {
        const params: Record<string, string> = {
            category: category,
            featured: featured.toString(),
        };
        return this.request<RankItem[]>({
            method: 'GET',
            path: '/api/v1/rank',
            params: params,
            requiresAuth: false,
        });
    }

    // ==================== Version APIs ====================

    /**
     * 获取项目版本列表
     * @param projectId 项目ID
     * @param limit 每页数量，默认20
     * @param offset 偏移量，从1开始
     * @returns 版本列表
     */
    async getProjectVersions(
        projectId: string,
        limit: number = 20,
        offset: number = 0
    ): Promise<BaseResponse<ProjectVersionsResponse>> {
        return this.request<ProjectVersionsResponse>({
            method: 'GET',
            path: `/api/v1/projects/${projectId}/versions`,
            params: {
                limit: limit.toString(),
                offset: offset.toString(),
            },
            requiresAuth: true,
        });
    }

    /**
     * 回滚到指定版本
     * @param projectId 项目ID
     * @param versionId 版本ID
     * @returns 操作结果
     */
    async rollbackToVersion(projectId: string, versionId: string): Promise<BaseResponse> {
        return this.request({
            method: 'POST',
            path: `/api/v1/projects/${projectId}/versions/${versionId}/rollback`,
            requiresAuth: true,
        });
    }

    /**
     * 配置集成（如 Stripe）
     * @param projectId 项目ID
     * @param type 集成类型（如 "stripe"）
     * @param messageID 消息ID
     * @param data 集成数据
     * @returns 操作结果
     */
    async configureIntegration(
        projectId: string,
        type: 'stripe',
        messageID: string,
        data: { publicKey: string; secretKey: string }
    ): Promise<BaseResponse> {
        return this.request({
            method: 'POST',
            path: `/api/v1/miniapps/${projectId}/integration`,
            body: {
                type,
                messageID,
                data,
            },
            requiresAuth: true,
        });
    }
}

// 导出单例实例
export const httpClient = new HttpApiClient();


