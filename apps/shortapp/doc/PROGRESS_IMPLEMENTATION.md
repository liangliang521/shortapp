# 下载进度显示实现

## ✅ 已实现的功能

### 1. 进度对象 (`SubAppLoadingProgress`)
- **文件**: `ios/comment/SubAppLoadingProgress.h/m`
- **属性**:
  - `status`: 状态文本（如 "正在下载 bundle..."）
  - `done`: 已完成数量/字节数
  - `total`: 总数量/总字节数
  - `progress`: 进度百分比 (0.0 - 1.0)

### 2. 进度回调机制 (`SubAppLoader`)
- **Delegate 方法**:
  - `didUpdateProgress:` - 总体进度
  - `didUpdateManifestProgress:` - Manifest 下载进度
  - `didUpdateBundleProgress:` - Bundle 下载进度（带字节数）
  - `didUpdateAssetsProgress:` - Assets 下载进度（按数量）

### 3. NSURLSession 进度跟踪
- 使用 `NSURLSessionDownloadDelegate` 获取实时下载进度
- Bundle 下载：显示已下载/总字节数（MB）
- Assets 下载：显示已完成/总数（个）

### 4. Native 事件发送 (`SubAppLauncher`)
- 通过 `RCTEventEmitter` 发送进度事件到 JS 层
- 事件名称：
  - `onLoadingProgress` - 总体进度
  - `onManifestProgress` - Manifest 进度
  - `onBundleProgress` - Bundle 进度
  - `onAssetsProgress` - Assets 进度

### 5. JS 层进度监听 (`SubAppLauncherService`)
- `addProgressListener()` - 监听总体进度
- `addManifestProgressListener()` - 监听 Manifest 进度
- `addBundleProgressListener()` - 监听 Bundle 进度
- `addAssetsProgressListener()` - 监听 Assets 进度

### 6. UI 进度显示 (`App.tsx`)
- 进度条显示
- 状态文本显示
- 百分比显示
- 加载中状态（禁用按钮）

## 进度显示示例

### Bundle 下载进度
```
正在下载 bundle (2.5 MB / 10.0 MB)
[████████░░░░░░░░░░░░] 25%
```

### Assets 下载进度
```
正在下载静态资源 (5/20)
[████░░░░░░░░░░░░░░░░] 25% (5/20)
```

### 总体进度流程
```
1. 正在下载 manifest... (0/1)
2. Manifest 下载完成 (1/1)
3. 正在下载 bundle... (0/1)
4. 正在下载 bundle (2.5 MB / 10.0 MB) [实时更新]
5. Bundle 下载完成 (1/1)
6. 正在下载静态资源... (0/20)
7. 正在下载静态资源 (5/20) [实时更新]
8. 静态资源下载完成 (20/20)
```

## 使用方式

### 在组件中监听进度

```typescript
import SubAppLauncherService, { LoadingProgress } from './src/services/SubAppLauncher';

function MyComponent() {
  const [progress, setProgress] = useState<LoadingProgress | null>(null);

  useEffect(() => {
    // 监听总体进度
    const unsubscribe = SubAppLauncherService.addProgressListener((progress) => {
      setProgress(progress);
      console.log(`进度: ${progress.progress * 100}% - ${progress.status}`);
    });

    return () => unsubscribe();
  }, []);

  return (
    <View>
      {progress && (
        <View>
          <Text>{progress.status}</Text>
          <ProgressBar progress={progress.progress} />
          <Text>{Math.round(progress.progress * 100)}%</Text>
        </View>
      )}
    </View>
  );
}
```

### 分别监听不同类型的进度

```typescript
useEffect(() => {
  // Manifest 进度
  const unsubscribe1 = SubAppLauncherService.addManifestProgressListener((progress) => {
    console.log('Manifest:', progress);
  });

  // Bundle 进度（带字节数）
  const unsubscribe2 = SubAppLauncherService.addBundleProgressListener((progress) => {
    console.log('Bundle:', progress);
    // progress.done 和 progress.total 是字节数
  });

  // Assets 进度（按数量）
  const unsubscribe3 = SubAppLauncherService.addAssetsProgressListener((progress) => {
    console.log('Assets:', progress);
    // progress.done 和 progress.total 是数量
  });

  return () => {
    unsubscribe1();
    unsubscribe2();
    unsubscribe3();
  };
}, []);
```

## 进度数据结构

```typescript
interface LoadingProgress {
  status: string;      // 状态文本
  done: number;        // 已完成（字节数或数量）
  total: number;       // 总数（字节数或数量）
  progress: number;   // 进度百分比 (0.0 - 1.0)
}
```

## 实现细节

### 1. Bundle 下载进度
- 使用 `NSURLSessionDownloadDelegate` 的 `didWriteData:totalBytesWritten:totalBytesExpectedToWrite:` 方法
- 实时计算已下载字节数和总字节数
- 转换为 MB 显示

### 2. Assets 下载进度
- 跟踪已完成的 asset 数量
- 每完成一个 asset，更新计数
- 显示 "正在下载静态资源 (5/20)" 格式

### 3. 总体进度
- 综合所有阶段的进度
- 可以计算加权平均或简单平均

## 注意事项

1. **线程安全**: 所有进度回调都在主线程执行
2. **事件清理**: 记得在组件卸载时移除监听器
3. **性能**: 进度更新频率适中，避免过于频繁的 UI 更新
4. **错误处理**: 下载失败时进度会停止，需要处理错误状态

## 参考实现

- 进度对象: `expo-go/ios/Exponent/Versioned/Core/Internal/EXResourceLoader.h`
- 进度显示: `expo-go/ios/Exponent/Kernel/Views/Loading/EXAppLoadingProgressWindowController.m`
- Bundle 进度: `expo-go/ios/Exponent/Kernel/AppLoader/CachedResource/EXJavaScriptResource.m`

