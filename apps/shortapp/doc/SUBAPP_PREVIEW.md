# 子 App 预览功能实现文档

## 📋 概述

本实现参考了 `apps/vibecoding` 中的子 App 预览方案，使用 Expo 的 `ExpoReactNativeFactory` 来实现子 App 的全屏加载。每个子 App 运行在独立的上下文中，支持远程 bundle 下载和本地文件加载。

## 🏗️ 架构设计

### 核心组件

```
┌─────────────────────────────────────────┐
│     Host App (videcoding-preview)       │
│  ┌───────────────────────────────────┐  │
│  │   ExpoReactNativeFactory (Main)  │  │
│  │   Module: "main"                 │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │   SubAppLauncher (Native Module)  │  │
│  │   └─> SubAppViewController        │  │
│  │       └─> ExpoReactNativeFactory  │  │
│  │           (独立实例)               │  │
│  │       └─> Module: "SubApp"        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 关键特性

1. **独立 Factory**: 每个子 App 使用独立的 `ExpoReactNativeFactory` 实例
2. **全屏展示**: 通过 Modal 方式全屏展示子 App
3. **远程支持**: 自动下载远程 bundle 并缓存到本地
4. **Expo 兼容**: 完全基于 Expo 的 API 实现

## 📁 文件结构

### Native 层（iOS）

```
ios/videcodingpreview/
├── SubAppLauncher.h                  # Native Module 头文件
├── SubAppLauncher.m                  # Native Module 实现（包含 SubAppViewController）
└── videcodingpreview-Bridging-Header.h  # Swift 桥接头文件
```

### React Native 层

```
src/
└── services/
    └── SubAppLauncher.ts             # TypeScript 服务层
```

## 🔧 实现细节

### 1. SubAppFactoryDelegate

继承自 `ExpoReactNativeFactoryDelegate`，用于为子 App 提供 bundle URL：

```objective-c
@interface SubAppFactoryDelegate : ExpoReactNativeFactoryDelegate
@property (nonatomic, strong, nonnull) NSURL *bundleURL;
@end
```

### 2. SubAppViewController

全屏 ViewController，用于展示子 App：

- 支持远程 bundle 下载和缓存
- 使用 `ExpoReactNativeFactory` 创建独立的 React Native 实例
- 提供关闭按钮，可以返回宿主 App

### 3. SubAppLauncher Native Module

提供两个方法：

- `openSubApp(bundleUrl, moduleName, initialProps)`: 打开子 App
- `closeSubApp()`: 关闭当前子 App

## 📖 使用方法

### 在 React Native 中使用

```typescript
import SubAppLauncherService from './src/services/SubAppLauncher';

// 打开子 App
await SubAppLauncherService.openSubApp(
  'https://example.com/bundle.js',  // Bundle URL
  'SubApp',                          // 模块名
  {                                  // 初始属性
    projectId: 'test-project',
  }
);

// 关闭子 App
SubAppLauncherService.closeSubApp();
```

### Bundle 要求

子 App 的 bundle 必须：

1. 是一个有效的 React Native bundle（由 Metro 打包）
2. 包含指定的模块名（moduleName）
3. 模块必须导出为 React 组件

### 示例 Bundle

```javascript
// bundle.js
import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('SubApp', () => App);
```

## ⚙️ 配置说明

### Xcode 项目配置

文件已经通过 `expo prebuild` 自动添加到 Xcode 项目中。如果需要手动添加：

1. 在 Xcode 中打开 `ios/videcodingpreview.xcworkspace`
2. 将 `SubAppLauncher.h` 和 `SubAppLauncher.m` 添加到项目
3. 确保 Bridging Header 路径正确

### 依赖

- `Expo`: Expo SDK
- `React`: React Native
- `ReactAppDependencyProvider`: React Native 依赖提供者

## 🚀 运行和测试

1. 确保已运行 `expo prebuild` 生成原生项目
2. 运行 `yarn ios` 启动应用
3. 点击"打开子 App"按钮测试功能

## 🔍 与 vibecoding 项目的区别

| 特性 | vibecoding | videcoding-preview |
|------|-----------|-------------------|
| Factory 类型 | `RCTReactNativeFactory` | `ExpoReactNativeFactory` |
| Delegate 类型 | `RCTDefaultReactNativeFactoryDelegate` | `ExpoReactNativeFactoryDelegate` |
| 导入方式 | `React-RCTAppDelegate` | `Expo` |
| 兼容性 | React Native 新架构 | Expo SDK |

## 📝 注意事项

1. **Bundle URL**: 确保提供的 bundle URL 是有效的，并且可以被访问
2. **模块名**: 模块名必须与 bundle 中注册的组件名一致
3. **缓存**: 远程 bundle 会被缓存到 `NSCachesDirectory/RemoteBundles/` 目录
4. **内存管理**: 每个子 App 使用独立的 Factory 实例，注意内存使用

## 🐛 故障排除

### 问题：无法创建 rootView

- 检查 bundle URL 是否有效
- 确认模块名是否正确
- 查看 Xcode 控制台的日志

### 问题：下载失败

- 检查网络连接
- 确认 bundle URL 可以访问
- 检查设备存储空间

### 问题：模块未找到

- 确认 bundle 中已注册该模块
- 检查模块名是否拼写正确

## 🔮 未来改进

- [ ] Android 支持
- [ ] 支持本地 bundle 文件
- [ ] 添加加载进度指示器
- [ ] 支持多个子 App 同时运行
- [ ] 添加错误重试机制

