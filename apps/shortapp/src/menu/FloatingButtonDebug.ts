// Copyright 2025-present 650 Industries. All rights reserved.
// 调试脚本：检查原生模块是否正确注册

import { NativeModules } from 'react-native';

export function debugFloatingButtonModule() {
    console.log('\n========== Floating Button Module Debug ==========');

    // 1. 检查模块是否存在
    const module = NativeModules.ExponentFloatingButton;
    console.log('1. Module exists:', !!module);

    if (module) {
        console.log('2. Module object:', module);
        console.log('3. Module methods:');
        console.log('   - show:', typeof module.show);
        console.log('   - hide:', typeof module.hide);
        console.log('   - isVisible:', typeof module.isVisible);

        // 尝试调用 isVisible
        try {
            const visible = module.isVisible();
            console.log('4. isVisible() returned:', visible);
        } catch (error) {
            console.error('4. isVisible() error:', error);
        }
    } else {
        console.log('2. Module not found!');
        console.log('3. Available native modules:');

        // 列出所有可用的原生模块
        const allModules = Object.keys(NativeModules);
        const relevantModules = allModules.filter(name =>
            name.includes('Exponent') || name.includes('Floating') || name.includes('Button')
        );

        if (relevantModules.length > 0) {
            console.log('   Relevant modules found:');
            relevantModules.forEach(name => {
                console.log(`   - ${name}`);
            });
        } else {
            console.log('   No relevant modules found');
            console.log('   Total modules available:', allModules.length);
            console.log('   First 10 modules:', allModules.slice(0, 10).join(', '));
        }
    }

    console.log('==================================================\n');
}

