/**
 * 图片处理工具函数
 * 包含图片压缩、格式转换等功能
 */

// import ImageResizer from '@bam.tech/react-native-image-resizer'; // 暂时注释，避免 RCT-Folly 编译问题

// 图片相关常量
export const MAX_IMAGES = 5; // 最多选择5张图片
export const MAX_IMAGE_WIDTH = 1024; // 压缩后最大宽度
export const IMAGE_QUALITY = 70; // 图片质量 (0-100，react-native-image-resizer 使用 0-100)

/**
 * 压缩图片
 * @param uri 图片URI
 * @returns 压缩后的图片URI
 */
export const compressImage = async (uri: string): Promise<string> => {
    // 暂时禁用图片压缩功能，避免 react-native-image-resizer 的 RCT-Folly 编译问题
    // TODO: 修复 RCT-Folly/glog 编译问题后重新启用
    console.warn('⚠️ [compressImage] Image compression is temporarily disabled');
    console.log('⚠️ [compressImage] Returning original image URI:', uri);
    return uri;

    /* 原始压缩代码 - 暂时注释
    try {
        console.log('🗜️ [compressImage] Starting compression...');
        console.log('🗜️ [compressImage] Original URI:', uri);

        // 使用 react-native-image-resizer 压缩图片
        const resizedImage = await ImageResizer.createResizedImage(
            uri,
            MAX_IMAGE_WIDTH, // 最大宽度
            MAX_IMAGE_WIDTH, // 最大高度（保持正方形，实际会根据比例缩放）
            'JPEG', // 输出格式
            IMAGE_QUALITY, // 质量 (0-100)
            0, // 旋转角度
            undefined, // 输出路径（使用默认临时路径）
            false, // 保持元数据
            {
                mode: 'contain', // 保持宽高比，确保图片完整显示
                onlyScaleDown: true, // 只缩小，不放大
            }
        );

        console.log('✅ [compressImage] Compression complete');
        console.log('✅ [compressImage] New URI:', resizedImage.uri);
        console.log('✅ [compressImage] New dimensions:', resizedImage.width, 'x', resizedImage.height);
        console.log('✅ [compressImage] New size:', resizedImage.size, 'bytes');

        return resizedImage.uri;
    } catch (error) {
        console.error('❌ [compressImage] Compression failed:', error);
        console.error('❌ [compressImage] Error message:', error instanceof Error ? error.message : 'Unknown');
        // 如果压缩失败，返回原图
        console.warn('⚠️ [compressImage] Using original image');
        return uri;
    }
    */
};

/**
 * 将图片URI转换为base64
 * @param uri 图片URI
 * @returns base64格式的data URI
 */
export const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
        console.log('📸 [convertImageToBase64] Starting conversion...');
        console.log('📸 [convertImageToBase64] URI:', uri);

        // 使用 fetch 读取文件
        const response = await fetch(uri);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }

        // 获取 blob
        const blob = await response.blob();
        console.log('📸 [convertImageToBase64] Blob size:', blob.size, 'bytes');

        // 将 blob 转换为 base64
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // FileReader 返回的是 data URI，直接使用
                console.log('📸 [convertImageToBase64] Conversion successful, data URI length:', base64String.length);
                resolve(base64String);
            };
            reader.onerror = (error) => {
                console.error('❌ [convertImageToBase64] FileReader error:', error);
                reject(new Error('Failed to read image as base64'));
            };
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('❌ [convertImageToBase64] CONVERSION FAILED');
        console.error('❌ [convertImageToBase64] Error:', error);
        console.error('❌ [convertImageToBase64] Error message:', error instanceof Error ? error.message : 'Unknown');
        console.error('❌ [convertImageToBase64] URI was:', uri);
        throw error;
    }
};

/**
 * 压缩并转换图片为base64
 * @param uri 图片URI
 * @returns base64格式的data URI
 */
export const compressAndConvertToBase64 = async (uri: string): Promise<string> => {
    // 先压缩
    const compressedUri = await compressImage(uri);
    // 再转base64
    const base64 = await convertImageToBase64(compressedUri);
    return base64;
};

