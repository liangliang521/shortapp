/**
 * OAuth Configuration
 * 配置 Google 和 Apple 登录的客户端ID
 */

// ⚠️ 重要：这些是示例值，需要替换为您的真实客户端ID
export const OAUTH_CONFIG = {
  // Google OAuth 配置
  google: {
    // Expo Web 客户端ID (用于开发)
    expoClientId: process.env.EXPO_GOOGLE_CLIENT_ID || '768017109362-b2s1gsv3g5mtluhuuc0or1tg96l6ajmi.apps.googleusercontent.com',

    // iOS 客户端ID
    iosClientId: process.env.IOS_GOOGLE_CLIENT_ID || '98810470437-blnapfvh4jorcna4c0jlrknnjtr44rpq.apps.googleusercontent.com',

    // Android 客户端ID
    androidClientId: process.env.ANDROID_GOOGLE_CLIENT_ID || '768017109362-v29rvkqd9flfh59d4nvto4qeom9413qe.apps.googleusercontent.com',
  },

  // Apple 配置
  apple: {
    teamId: process.env.APPLE_TEAM_ID || 'your_apple_team_id',
  },

  // 应用配置
  app: {
    bundleId: 'dev.shortapp.vibe.code.ai.app.builder',
    packageName: 'dev.shortapp.vibe.code.ai.app.builder',
  },

  // 后端配置
  api: {
    // baseUrl: process.env.API_BASE_URL || 'http://192.168.6.69:4242',
    // wsUrl: process.env.WS_BASE_URL || 'ws://192.168.6.69:4242',
    baseUrl: process.env.API_BASE_URL || 'https://api.shortapp.dev',
    wsUrl: process.env.WS_BASE_URL || 'wss://api.shortapp.dev',
  },

  // Expo 配置
  expo: {
    username: process.env.EXPO_USERNAME || '1033192926',
    slug: 'vibecoding', // 与 app.json 保持一致
  },

  // 数数分析配置
  analytics: {
    thinkingData: {
      appId: 'ebd89b9c2a5b43af80e511cddd4bc1de', // 数数分析 App ID
      serverUrl: process.env.TA_SERVER_URL || 'https://ta-receiver.mojoly.net', // 数数服务器地址
    },
  }
} as const;

/**
 * 验证 OAuth 配置
 */
export const validateOAuthConfig = () => {
  const config = OAUTH_CONFIG;

  // 检查 Google 配置
  const googleConfig = config.google;
  if (googleConfig.expoClientId.includes('your_') ||
    googleConfig.iosClientId.includes('your_') ||
    googleConfig.androidClientId.includes('your_')) {
    console.warn('⚠️ Google OAuth 配置未完成，请更新 oauth.ts 中的客户端ID');
    return false;
  }

  // 检查 Apple 配置
  if (config.apple.teamId.includes('your_')) {
    console.warn('⚠️ Apple 配置未完成，请更新 oauth.ts 中的 Team ID');
    return false;
  }

  return true;
};
