import { NativeModules } from 'react-native';

const NativeKernel = NativeModules.ExponentKernel;

export async function closeAsync(): Promise<void> {
    return await NativeKernel?.closeDevMenuAsync?.();
}

export async function goToHomeAsync(): Promise<void> {
    return await NativeKernel?.goToHomeAsync?.();
}

export async function hideDevMenuWindowAsync(): Promise<void> {
    return await NativeKernel?.hideDevMenuWindowAsync?.();
}

export async function showDevMenuWindowAsync(): Promise<void> {
    return await NativeKernel?.showDevMenuWindowAsync?.();
}

/**
 * 使用新的 manifest URL 重新加载当前应用
 * 这比使用 Linking.openURL 更平滑，不会重新打开整个应用
 * 
 * @param manifestUrl 新的 manifest URL (exp://...)
 * @throws 如果重新加载失败
 */
export async function reloadAppWithNewUrl(manifestUrl: string): Promise<void> {
    if (NativeKernel?.reloadAppWithNewManifestUrl) {
        return await NativeKernel.reloadAppWithNewManifestUrl(manifestUrl);
    }
    throw new Error('reloadAppWithNewManifestUrl not available in native module');
}

export function listenForCloseRequests(_listener: (event: any) => Promise<any>): any {
    return null;
}

