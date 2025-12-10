# 工具库与 Hooks (Utilities & Hooks)

## 功能概述

工具库与 Hooks 提供通用的工具函数和自定义 React Hooks，支持防抖、媒体查询检测、离线状态管理等功能。

## 实现方式

### 技术栈

- **React**: 自定义 Hooks
- **TypeScript**: 类型安全
- **Lodash**: 工具函数库（如果使用）

### 核心功能

1. **防抖 Hook**: 优化输入和搜索性能
2. **媒体查询 Hook**: 响应式设计支持
3. **离线状态 Hook**: 网络状态检测和离线数据管理
4. **工具函数**: HTML 解析、字符串处理、样式计算等

## 重要文件

### Hooks 文件

- `hooks/use-debounce.ts`: 防抖 Hook
- `hooks/use-media-query.ts`: 媒体查询 Hook
- `hooks/use-offline.ts`: 离线状态 Hook

### 工具文件

- `lib/utils.ts`: 通用工具函数
- `lib/api-response.ts`: API 响应处理

## 亮点

1. **性能优化**: 防抖等技术减少不必要的计算
2. **代码复用**: 通用逻辑的封装和复用
3. **类型安全**: 完整的 TypeScript 类型定义

## 注意事项和坑

1. **依赖清理**: useEffect 需要正确清理副作用
2. **内存泄漏**: 定时器和事件监听器需要清理
3. **性能陷阱**: 防抖延迟时间需要合理设置
