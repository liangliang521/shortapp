import DefaultPreference from 'react-native-default-preference';

export interface SharedAppContext {
    // 项目信息
    projectId: string;
    projectName: string;
    projectUrl: string;

    // 用户信息
    userId: string;
    userName: string;
    userEmail: string;

    // 认证信息
    accessToken: string;
    loginType: 'google' | 'apple' | null;

    // 时间戳
    timestamp: number;
}

export class SharedDataService {
    private static readonly KEY = 'vibecoding_shared_context';
    private static readonly MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 365天有效期（实际上永不过期）

    /**
     * 存储共享上下文
     */
    static async setContext(context: SharedAppContext): Promise<boolean> {
        try {
            const contextJson = JSON.stringify(context);
            await DefaultPreference.set(this.KEY, contextJson);

            console.log('✅ [SharedData] Stored context:', {
                projectId: context.projectId,
                projectName: context.projectName,
                userId: context.userId,
            });

            return true;
        } catch (error) {
            console.error('❌ [SharedData] Failed to store context:', error);
            return false;
        }
    }

    /**
     * 获取共享上下文
     */
    static async getContext(): Promise<SharedAppContext | null> {
        try {
            const contextJson = await DefaultPreference.get(this.KEY);

            if (!contextJson) {
                console.log('ℹ️ [SharedData] No context found');
                return null;
            }

            const context = JSON.parse(contextJson) as SharedAppContext;

            // 检查数据是否过期
            const age = Date.now() - context.timestamp;
            if (age > this.MAX_AGE) {
                console.warn('⚠️ [SharedData] Context expired:', {
                    age: Math.round(age / 1000) + 's',
                    maxAge: Math.round(this.MAX_AGE / 1000) + 's',
                });
                await this.clearContext();
                return null;
            }

            console.log('✅ [SharedData] Loaded context:', {
                projectId: context.projectId,
                projectName: context.projectName,
                userId: context.userId,
                age: Math.round(age / 1000) + 's',
            });

            return context;
        } catch (error) {
            console.error('❌ [SharedData] Failed to get context:', error);
            return null;
        }
    }

    /**
     * 清除共享上下文
     */
    static async clearContext(): Promise<void> {
        try {
            await DefaultPreference.clear(this.KEY);
            console.log('🗑️ [SharedData] Context cleared');
        } catch (error) {
            console.error('❌ [SharedData] Failed to clear context:', error);
        }
    }

    /**
     * 调试：获取所有数据
     */
    static async getAllData(): Promise<Record<string, string>> {
        try {
            return await DefaultPreference.getAll();
        } catch (error) {
            console.error('❌ [SharedData] Failed to get all data:', error);
            return {};
        }
    }
}

