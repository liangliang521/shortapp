// Copyright 2025-present 650 Industries. All rights reserved.

import { NativeModules } from 'react-native';

const NativeFloatingButton = NativeModules.ExponentFloatingButton;

/**
 * 显示浮动 DevMenu 按钮
 */
export function showFloatingButton(): void {
    if (NativeFloatingButton?.show) {
        NativeFloatingButton.show();
        console.log('📱 [FloatingButton] Showing floating DevMenu button');
    } else {
        console.warn('⚠️ [FloatingButton] Native module not available');
    }
}

/**
 * 隐藏浮动 DevMenu 按钮
 */
export function hideFloatingButton(): void {
    if (NativeFloatingButton?.hide) {
        NativeFloatingButton.hide();
        console.log('📱 [FloatingButton] Hiding floating DevMenu button');
    } else {
        console.warn('⚠️ [FloatingButton] Native module not available');
    }
}

/**
 * 检查浮动按钮是否可见
 */
export function isFloatingButtonVisible(): boolean {
    if (NativeFloatingButton?.isVisible) {
        return NativeFloatingButton.isVisible();
    }
    return false;
}

