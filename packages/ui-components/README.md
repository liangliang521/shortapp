# @vibecoding/ui-components

共享 UI 组件库，供所有 apps 使用。

## 使用方式

在 app 中导入组件：

```typescript
import { SharedButton, SharedCard } from '@vibecoding/ui-components';
```

## 添加新组件

1. 在 `src/components/` 目录下创建组件文件
2. 在 `src/components/index.ts` 中导出组件
3. 在 `src/index.ts` 中确保组件被导出

## 开发

```bash
# 在根目录运行
yarn install

# 类型检查
yarn workspace @vibecoding/ui-components type-check
```

