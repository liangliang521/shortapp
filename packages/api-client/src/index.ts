/**
 * API Client Package
 * HTTP REST API 客户端
 */

// 导出类型
export * from './types';

// 导出配置
export * from './config';

// 导出 HTTP 客户端
export * from './httpClient';

// 导出便捷访问实例
export { apiConfig } from './config';
export { httpClient } from './httpClient';

