# SubApp 预览实现方案

基于 expo-go 的实现，完整实现子项目预览、更新监听和静态资源下载。

## 架构设计

### 核心组件

```
┌─────────────────────────────────────────┐
│  JS Layer (SubAppLauncherService)      │
│  - openSubApp(manifestUrl)             │
│  - reloadSubApp()                       │
│  - checkForUpdate()                     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Native Layer (SubAppLoader)           │
│  - 下载 manifest.json                   │
│  - 解析 manifest                        │
│  - 下载 bundle.js                       │
│  - 下载静态资源                         │
│  - 管理更新检查                         │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Storage Layer                          │
│  - Manifest 缓存                        │
│  - Bundle 缓存                          │
│  - Assets 存储                          │
│  - 更新数据库                           │
└─────────────────────────────────────────┘
```

## 实现步骤

### 阶段 1: Manifest 下载和解析

#### 1.1 创建 ManifestResource 类
参考: `expo-go/ios/Exponent/Kernel/AppLoader/CachedResource/EXManifestResource.m`

**文件**: `ios/comment/SubAppManifestResource.h/m`

```objc
// SubAppManifestResource.h
@interface SubAppManifestResource : NSObject
- (instancetype)initWithManifestUrl:(NSURL *)url;
- (void)loadManifestWithCompletion:(void(^)(NSDictionary *manifest, NSError *error))completion;
- (NSString *)bundleUrlFromManifest:(NSDictionary *)manifest;
- (NSArray *)assetsFromManifest:(NSDictionary *)manifest;
@end
```

**关键功能**:
- 下载 manifest.json
- 缓存 manifest（参考 EXManifestResource 的缓存策略）
- 解析 bundle URL 和 assets 数组
- 错误处理和重试

#### 1.2 Manifest 结构解析

```json
{
  "id": "project-id",
  "runtimeVersion": "1.0.0",
  "launchAsset": {
    "url": "https://.../bundle.js",
    "hash": "...",
    "key": "...",
    "contentType": "application/javascript"
  },
  "assets": [
    {
      "url": "https://.../image.png",
      "hash": "...",
      "key": "...",
      "contentType": "image/png",
      "fileExtension": ".png"
    }
  ]
}
```

### 阶段 2: Bundle 和 Assets 下载

#### 2.1 创建 SubAppLoader 类
参考: `expo-go/ios/Client/HomeAppLoader.swift`

**文件**: `ios/comment/SubAppLoader.h/m`

```objc
// SubAppLoader.h
@protocol SubAppLoaderDelegate <NSObject>
- (void)subAppLoader:(SubAppLoader *)loader didLoadManifest:(NSDictionary *)manifest;
- (void)subAppLoader:(SubAppLoader *)loader didLoadBundle:(NSData *)bundle;
- (void)subAppLoader:(SubAppLoader *)loader didLoadAsset:(NSString *)assetPath;
- (void)subAppLoader:(SubAppLoader *)loader didFailWithError:(NSError *)error;
- (void)subAppLoader:(SubAppLoader *)loader didFinishLoading;
@end

@interface SubAppLoader : NSObject
@property (nonatomic, weak) id<SubAppLoaderDelegate> delegate;
- (instancetype)initWithManifestUrl:(NSURL *)manifestUrl;
- (void)startLoading;
- (void)reload;
- (void)checkForUpdate;
@end
```

#### 2.2 下载流程

```
1. 下载 Manifest
   ↓
2. 解析 Manifest
   - 提取 bundle URL
   - 提取 assets 数组
   ↓
3. 下载 Bundle
   - 检查缓存
   - 下载新版本
   - 验证哈希（如果有）
   ↓
4. 下载 Assets（并发）
   - 遍历 assets 数组
   - 检查文件是否存在
   - 下载缺失的资源
   - 验证哈希
   ↓
5. 完成加载
```

#### 2.3 文件存储结构

```
~/Library/Application Support/videcoding-preview/
  └── subapps/
      └── {scopeKey}/
          ├── manifest.json
          ├── bundle.js
          └── assets/
              ├── {asset-key}.png
              ├── {asset-key}.ttf
              └── ...
```

### 阶段 3: 更新监听机制

#### 3.1 更新检查策略

参考: `expo-go/ios/Exponent/Kernel/AppLoader/EXAppLoaderExpoUpdates.m:342-365`

```objc
// 更新检查配置
typedef NS_ENUM(NSInteger, SubAppUpdateCheckPolicy) {
  SubAppUpdateCheckPolicyNever,      // 从不检查
  SubAppUpdateCheckPolicyOnLaunch,   // 启动时检查
  SubAppUpdateCheckPolicyAlways      // 总是检查
};

@interface SubAppLoader : NSObject
@property (nonatomic, assign) SubAppUpdateCheckPolicy updateCheckPolicy;
@property (nonatomic, assign) NSTimeInterval updateCheckInterval; // 默认 60 秒
@end
```

#### 3.2 更新检查流程

```objc
- (void)checkForUpdate {
  // 1. 下载最新 manifest
  [self.manifestResource loadManifestWithCompletion:^(NSDictionary *newManifest, NSError *error) {
    if (error) {
      [self.delegate subAppLoader:self didFailWithError:error];
      return;
    }
    
    // 2. 比较版本/哈希
    NSString *currentVersion = self.currentManifest[@"id"];
    NSString *newVersion = newManifest[@"id"];
    
    if (![currentVersion isEqualToString:newVersion]) {
      // 3. 有新更新，重新下载
      [self reloadWithNewManifest:newManifest];
    }
  }];
}
```

#### 3.3 定时检查

```objc
@property (nonatomic, strong) NSTimer *updateCheckTimer;

- (void)startUpdateChecking {
  if (self.updateCheckPolicy == SubAppUpdateCheckPolicyAlways) {
    self.updateCheckTimer = [NSTimer scheduledTimerWithTimeInterval:self.updateCheckInterval
                                                              target:self
                                                            selector:@selector(checkForUpdate)
                                                            userInfo:nil
                                                             repeats:YES];
  }
}

- (void)stopUpdateChecking {
  [self.updateCheckTimer invalidate];
  self.updateCheckTimer = nil;
}
```

### 阶段 4: 集成到现有代码

#### 4.1 修改 SubAppLauncher.m

```objc
RCT_EXPORT_METHOD(openSubApp
                  : (NSString *)manifestUrl  // 改为 manifest URL
                  moduleName
                  : (NSString *)moduleName
                  initialProps
                  : (NSDictionary *)initialProps
                  resolve
                  : (RCTPromiseResolveBlock)resolve
                  reject
                  : (RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSURL *manifestNSURL = [NSURL URLWithString:manifestUrl];
    if (!manifestNSURL) {
      reject(@"INVALID_URL", @"Invalid manifest URL", nil);
      return;
    }
    
    // 创建 loader
    SubAppLoader *loader = [[SubAppLoader alloc] initWithManifestUrl:manifestNSURL];
    loader.delegate = self;
    
    // 开始加载
    [loader startLoading];
    
    // 保存 loader 引用
    self.currentLoader = loader;
  });
}

// 实现 delegate 方法
- (void)subAppLoader:(SubAppLoader *)loader didFinishLoading {
  // 获取 bundle 路径
  NSURL *bundleURL = [loader bundleURL];
  
  // 创建 rootView
  UIView *rootView = [SubAppFactoryHelper makeRootViewWithNewFactory:bundleURL
                                                           moduleName:self.moduleName
                                                        initialProps:self.initialProps];
  
  // 显示预览
  [self presentSubAppWithRootView:rootView];
}
```

#### 4.2 添加更新相关方法

```objc
RCT_EXPORT_METHOD(reloadSubApp
                  : (RCTPromiseResolveBlock)resolve
                  reject
                  : (RCTPromiseRejectBlock)reject)
{
  if (self.currentLoader) {
    [self.currentLoader reload];
    resolve(nil);
  } else {
    reject(@"NO_LOADER", @"No active sub app loader", nil);
  }
}

RCT_EXPORT_METHOD(checkForUpdate
                  : (RCTPromiseResolveBlock)resolve
                  reject
                  : (RCTPromiseRejectBlock)reject)
{
  if (self.currentLoader) {
    [self.currentLoader checkForUpdate];
    resolve(nil);
  } else {
    reject(@"NO_LOADER", @"No active sub app loader", nil);
  }
}
```

### 阶段 5: JS 层接口更新

#### 5.1 更新 SubAppLauncherService.ts

```typescript
interface SubAppLauncherInterface {
  /**
   * 打开子 App（从 manifest URL）
   */
  openSubApp(
    manifestUrl: string,
    moduleName: string,
    initialProps?: Record<string, any>
  ): Promise<void>;
  
  /**
   * 重新加载子 App
   */
  reloadSubApp(): Promise<void>;
  
  /**
   * 检查更新
   */
  checkForUpdate(): Promise<void>;
  
  /**
   * 关闭子 App
   */
  closeSubApp(): void;
}
```

## 实现细节

### 1. Manifest 缓存策略

参考: `EXManifestResource.m:69-78`

```objc
- (void)writeToCache {
  if (self.manifestData) {
    NSString *cachePath = [self manifestCachePath];
    [self.manifestData writeToFile:cachePath atomically:YES];
  }
}

- (NSString *)manifestCachePath {
  NSString *cachesDir = NSSearchPathForDirectoriesInDomains(
    NSCachesDirectory, NSUserDomainMask, YES
  ).firstObject;
  NSString *subAppDir = [cachesDir stringByAppendingPathComponent:@"SubApps"];
  NSString *scopeKey = [self scopeKeyFromUrl:self.manifestUrl];
  return [[subAppDir stringByAppendingPathComponent:scopeKey] 
          stringByAppendingPathComponent:@"manifest.json"];
}
```

### 2. Bundle 下载和缓存

参考: `EXJavaScriptResource.m:26-44`

```objc
- (void)downloadBundle:(NSURL *)bundleUrl completion:(void(^)(NSURL *localPath, NSError *error))completion {
  // 检查缓存
  NSString *cachePath = [self bundleCachePathForURL:bundleUrl];
  if ([[NSFileManager defaultManager] fileExistsAtPath:cachePath]) {
    completion([NSURL fileURLWithPath:cachePath], nil);
    return;
  }
  
  // 下载
  NSURLSession *session = [NSURLSession sharedSession];
  NSURLSessionDataTask *task = [session dataTaskWithURL:bundleUrl 
                                       completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
    if (error) {
      completion(nil, error);
      return;
    }
    
    // 保存到缓存
    [data writeToFile:cachePath atomically:YES];
    completion([NSURL fileURLWithPath:cachePath], nil);
  }];
  [task resume];
}
```

### 3. Assets 并发下载

参考: `HomeAppLoader.swift:74-109`

```objc
- (void)downloadAssets:(NSArray *)assets completion:(void(^)(NSError *error))completion {
  dispatch_group_t group = dispatch_group_create();
  __block NSError *lastError = nil;
  
  for (NSDictionary *asset in assets) {
    dispatch_group_enter(group);
    
    NSString *assetUrl = asset[@"url"];
    NSString *assetKey = asset[@"key"];
    NSString *localPath = [self assetPathForKey:assetKey];
    
    // 检查是否已存在
    if ([[NSFileManager defaultManager] fileExistsAtPath:localPath]) {
      dispatch_group_leave(group);
      continue;
    }
    
    // 下载
    [self downloadAsset:assetUrl toPath:localPath completion:^(NSError *error) {
      if (error) {
        lastError = error;
      }
      dispatch_group_leave(group);
    }];
  }
  
  dispatch_group_notify(group, dispatch_get_main_queue(), ^{
    completion(lastError);
  });
}
```

### 4. 哈希验证

```objc
- (BOOL)verifyAssetHash:(NSString *)filePath expectedHash:(NSString *)expectedHash {
  if (!expectedHash) {
    return YES; // 没有哈希，跳过验证
  }
  
  NSData *fileData = [NSData dataWithContentsOfFile:filePath];
  NSString *actualHash = [self sha256HashOfData:fileData];
  
  return [actualHash isEqualToString:expectedHash];
}

- (NSString *)sha256HashOfData:(NSData *)data {
  unsigned char hash[CC_SHA256_DIGEST_LENGTH];
  CC_SHA256(data.bytes, (CC_LONG)data.length, hash);
  
  NSMutableString *hashString = [NSMutableString string];
  for (int i = 0; i < CC_SHA256_DIGEST_LENGTH; i++) {
    [hashString appendFormat:@"%02x", hash[i]];
  }
  return hashString;
}
```

## 文件结构

```
apps/videcoding-preview/ios/comment/
├── SubAppLauncher.h/m          (修改：支持 manifest URL)
├── SubAppFactoryHelper.swift   (保持不变)
├── SubAppManifestResource.h/m  (新建：manifest 下载和解析)
├── SubAppLoader.h/m            (新建：核心加载逻辑)
├── SubAppAssetDownloader.h/m   (新建：assets 下载)
└── SubAppStorageManager.h/m    (新建：文件存储管理)
```

## 测试要点

1. **Manifest 下载**
   - 正常 manifest URL
   - 无效 URL
   - 网络错误
   - 超时处理

2. **Bundle 下载**
   - 首次下载
   - 缓存命中
   - 更新检测
   - 哈希验证

3. **Assets 下载**
   - 单个 asset
   - 多个 assets 并发
   - 部分失败处理
   - 大文件下载

4. **更新监听**
   - 定时检查
   - 手动检查
   - 更新通知
   - 后台更新

## 注意事项

1. **线程安全**: 所有文件操作和网络请求都要在正确的队列中执行
2. **内存管理**: 及时释放大文件和下载任务
3. **错误处理**: 完善的错误处理和用户提示
4. **性能优化**: 使用并发下载、缓存策略
5. **安全性**: 验证哈希、HTTPS 连接

## 参考实现

- Manifest 下载: `expo-go/ios/Exponent/Kernel/AppLoader/CachedResource/EXManifestResource.m`
- Bundle 下载: `expo-go/ios/Exponent/Kernel/AppLoader/CachedResource/EXJavaScriptResource.m`
- Assets 下载: `expo-go/ios/Client/HomeAppLoader.swift`
- 更新检查: `expo-go/ios/Exponent/Kernel/AppLoader/EXAppLoaderExpoUpdates.m`

