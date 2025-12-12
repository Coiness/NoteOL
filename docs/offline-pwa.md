# 离线支持与 PWA (Offline Support & PWA)

## 功能概述

离线支持与 PWA 模块提供离线访问能力和渐进式 Web 应用功能，支持网络断开时继续编辑和使用。

## 实现方式

### 技术栈

- **@ducanh2912/next-pwa**: PWA 插件
- **IndexedDB**: 离线数据存储
- **Y-IndexedDB**: Y.js 离线存储提供者
- **Service Worker**: 缓存和离线处理

### 核心功能

1. **离线编辑**: 网络断开时仍可编辑笔记
2. **数据同步**: 重新连接后自动同步数据
3. **PWA 安装**: 支持安装为桌面应用
4. **缓存策略**: 静态资源和 API 响应缓存

## 重要文件

### PWA 文件

- `public/manifest.json`: PWA 清单文件
- `public/sw.js`: Service Worker 脚本
- `next.config.ts`: PWA 配置

### 离线文件

- `hooks/use-offline.ts`: 离线状态管理 Hook
- `types/offline.ts`: 离线数据类型

## 亮点

1. **无缝体验**: 离线和在线的无缝切换
2. **数据持久性**: 基于 IndexedDB 的可靠存储
3. **性能提升**: Service Worker 缓存加速加载
4. **原生体验**: PWA 提供类似原生应用体验

## 注意事项和坑

1. **存储限制**: IndexedDB 有容量限制
2. **同步冲突**: 离线编辑后的数据合并逻辑
3. **Service Worker**: 更新和缓存清理策略
4. **浏览器兼容性**: PWA 功能在不同浏览器支持度不同
