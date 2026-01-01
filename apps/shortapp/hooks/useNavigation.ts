import { useState, useCallback, Dispatch, SetStateAction } from 'react';

export type AppScreen =
    | 'onboarding'
    | 'home'
    | 'ai-chat'
    | 'loading'
    | 'settings'
    | 'subscription'
    | 'project-preview'
    | 'project-loading'
    | 'fullscreen-preview';

interface NavigationState {
    currentScreen: AppScreen;
    screenStack: AppScreen[];
}

export function useNavigation() {
    const [navigationState, setNavigationState]: [NavigationState, Dispatch<SetStateAction<NavigationState>>] = useState<NavigationState>({
        currentScreen: 'onboarding',
        screenStack: ['onboarding'],
    });

    // 导航到新页面（推入栈）
    const navigate = useCallback((screen: AppScreen) => {
        setNavigationState(prev => ({
            currentScreen: screen,
            screenStack: [...prev.screenStack, screen],
        }));
    }, []);

    // 返回上一页（弹出栈）
    const goBack = useCallback(() => {
        setNavigationState(prev => {
            if (prev.screenStack.length <= 1) {
                // 如果栈中只有一个页面，返回首页
                return {
                    currentScreen: 'home',
                    screenStack: ['home'],
                };
            }

            // 弹出当前页面，返回到上一个页面
            const newStack = prev.screenStack.slice(0, -1);
            const previousScreen = newStack[newStack.length - 1];

            return {
                currentScreen: previousScreen,
                screenStack: newStack,
            };
        });
    }, []);

    // 重置导航栈到指定页面
    const resetTo = useCallback((screen: AppScreen) => {
        setNavigationState({
            currentScreen: screen,
            screenStack: [screen],
        });
    }, []);

    // 替换当前页面（不推入栈）
    const replace = useCallback((screen: AppScreen) => {
        setNavigationState(prev => ({
            currentScreen: screen,
            screenStack: [...prev.screenStack.slice(0, -1), screen],
        }));
    }, []);

    // 检查是否可以返回
    const canGoBack = useCallback(() => {
        return navigationState.screenStack.length > 1;
    }, [navigationState.screenStack.length]);

    return {
        currentScreen: navigationState.currentScreen,
        screenStack: navigationState.screenStack,
        navigate,
        goBack,
        resetTo,
        replace,
        canGoBack,
    };
}
