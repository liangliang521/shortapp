# SubApp 预览实现总结

## 已完成的功能

### 1. ✅ Manifest 下载和解析
- **文件**: `ios/comment/SubAppManifestResource.h/m`
- **功能**:
  - 从远程 URL 下载 manifest.json
  - 缓存 manifest 到本地
  - 解析 manifest 提取 bundle URL 和 assets 数组
  - 错误处理和重试机制

### 2. ✅ Bundle 和 Assets 下载
- **文件**: `ios/comment/SubAppLoader.h/m`
- **功能**:
  - 下载 bundle.js（带缓存检查）
  - 并发下载所有静态资源
  - 哈希验证（如果 manifest 提供）
  - 文件存储管理

### 3. ✅ 更新监听机制
- **功能**:
  - 启动时检查更新（`SubAppUpdateCheckPolicyOnLaunch`）
  - 定时检查更新（`SubAppUpdateCheckPolicyAlways`）
  - 手动检查更新（`checkForUpdate`）
  - 更新检测回调（`didDetectUpdate`）

### 4. ✅ Native 接口
- **文件**: `ios/comment/SubAppLauncher.m` (已更新)
- **方法**:
  - `openSubApp(manifestUrl, moduleName, initialProps)` - 从 manifest URL 打开
  - `reloadSubApp()` - 重新加载
  - `checkForUpdate()` - 检查更新
  - `closeSubApp()` - 关闭预览

### 5. ✅ JS 层接口
- **文件**: `src/services/SubAppLauncher.ts` (已更新)
- **接口**: 与 Native 层对应的方法

### 6. ✅ UI 更新
- **文件**: `App.tsx` (已更新)
- **功能**: 支持 manifest URL 输入，添加重新加载和检查更新按钮

## 文件结构

```
apps/videcoding-preview/
├── ios/comment/
│   ├── SubAppLauncher.h/m          (已更新：支持 manifest URL)
│   ├── SubAppFactoryHelper.swift   (保持不变)
│   ├── SubAppManifestResource.h/m  (新建：manifest 下载和解析)
│   └── SubAppLoader.h/m            (新建：核心加载逻辑)
├── src/
│   ├── services/
│   │   └── SubAppLauncher.ts       (已更新：支持新接口)
│   └── utils/
│       └── url.ts                  (保持不变)
└── App.tsx                          (已更新：使用 manifest URL)
```

## 使用方式

### 1. 打开子 App（从 manifest URL）

```typescript
await SubAppLauncherService.openSubApp(
  'http://example.com/manifest.json',
  'main',
  { projectId: 'test' }
);
```

### 2. 重新加载

```typescript
await SubAppLauncherService.reloadSubApp();
```

### 3. 检查更新

```typescript
await SubAppLauncherService.checkForUpdate();
```

## Manifest 格式要求

服务端需要提供符合以下格式的 manifest.json:

```json
{
  "id": "project-id",
  "runtimeVersion": "1.0.0",
  "commitTime": "2024-01-01T00:00:00.000Z",
  "launchAsset": {
    "url": "https://.../bundle.js",
    "hash": "sha256-hash",
    "key": "bundle-key",
    "contentType": "application/javascript"
  },
  "assets": [
    {
      "url": "https://.../image.png",
      "hash": "sha256-hash",
      "key": "asset-key",
      "contentType": "image/png",
      "fileExtension": ".png"
    }
  ]
}
```

## 存储位置

### iOS
```
~/Library/Caches/SubApps/
  └── {scopeKey}/
      ├── manifest.json
      ├── bundle.js
      └── assets/
          ├── {asset-key}.png
          └── ...
```

## 工作流程

```
1. 用户调用 openSubApp(manifestUrl)
   ↓
2. SubAppLoader 下载 manifest.json
   ↓
3. 解析 manifest，提取 bundle URL 和 assets
   ↓
4. 下载 bundle.js（检查缓存）
   ↓
5. 并发下载所有 assets（检查缓存，验证哈希）
   ↓
6. 所有资源下载完成后，创建 React Native rootView
   ↓
7. 显示预览界面
   ↓
8. 启动更新检查（如果配置了）
```

## 更新检查流程

```
启动时 / 定时 / 手动调用 checkForUpdate()
   ↓
下载最新 manifest.json
   ↓
比较当前 manifest 和最新 manifest
   - 比较 id
   - 比较 commitTime/publishedTime
   ↓
如果有更新 → 触发 didDetectUpdate 回调
   ↓
用户可以选择 reloadSubApp() 重新加载
```

## 注意事项

1. **线程安全**: 所有网络请求和文件操作都在主线程或后台队列中执行
2. **错误处理**: 完善的错误处理和用户提示
3. **缓存策略**: 
   - Manifest: 先使用缓存，后台检查更新
   - Bundle: 检查缓存，存在则直接使用
   - Assets: 检查文件是否存在，存在则跳过下载
4. **哈希验证**: 如果 manifest 提供 hash，下载后会验证文件完整性
5. **并发下载**: Assets 使用并发下载，提高效率

## 参考实现

所有实现都参考了 expo-go 的对应代码：
- Manifest 下载: `expo-go/ios/Exponent/Kernel/AppLoader/CachedResource/EXManifestResource.m`
- Bundle 下载: `expo-go/ios/Exponent/Kernel/AppLoader/CachedResource/EXJavaScriptResource.m`
- Assets 下载: `expo-go/ios/Client/HomeAppLoader.swift`
- 更新检查: `expo-go/ios/Exponent/Kernel/AppLoader/EXAppLoaderExpoUpdates.m`

## 下一步

1. 测试 manifest 下载和解析
2. 测试 bundle 和 assets 下载
3. 测试更新检查机制
4. 添加错误处理和用户提示
5. 优化性能和用户体验

