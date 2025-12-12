# 笔记管理模块 (Note Management)

## 功能概述

笔记管理模块是 NoteOL 的核心功能模块，负责笔记的创建、编辑、显示、搜索和组织。该模块集成了富文本编辑器、实时协作、离线支持等高级功能。

## 实现方式

### 技术栈

- **Tiptap**: 富文本编辑器框架
- **Y.js**: 实时协作数据结构
- **Hocuspocus**: Y.js 协作提供者
- **TanStack Query**: 数据获取和缓存
- **React Query**: 服务端状态管理
- **IndexedDB**: 离线数据存储

### 核心功能

1. **笔记CRUD**: 创建、读取、更新、删除笔记
2. **富文本编辑**: 支持多种格式（标题、列表、表格、代码块等）
3. **实时协作**: 多用户同时编辑，支持光标显示
4. **离线支持**: 网络断开时仍可编辑，重新连接后同步
5. **搜索功能**: 支持标题、内容和标签搜索
6. **标签系统**: 为笔记添加和管理标签
7. **版本控制**: 基于 Y.js 的操作转换和冲突解决

### 编辑器特性

- **扩展丰富**: 支持图片、链接、任务列表、表格、高亮、代码块等
- **快捷键支持**: Tab键缩进、保存快捷键等
- **斜杠命令**: 快速插入各种元素
- **大纲视图**: 自动生成文档目录结构


## 重要文件

### 核心组件

- `components/editor/note-editor.tsx`: 主编辑器组件，集成 Tiptap 和协作功能
- `components/editor/note-list.tsx`: 笔记列表组件，支持搜索、排序和无限滚动
- `components/editor/note-detail.tsx`: 笔记详情页面组件
- `components/editor/editor-toolbar.tsx`: 编辑器工具栏
- `components/editor/table-of-contents.tsx`: 目录大纲组件

### API 路由

- `app/api/notes/route.ts`: 笔记 CRUD API，支持分页、搜索和过滤
- `app/api/notes/[id]/route.ts`: 单个笔记操作 API

### 类型定义

- `types/note.ts`: 笔记相关 TypeScript 类型
- `types/offline.ts`: 离线功能类型定义

### 工具和 Hooks

- `hooks/use-offline.ts`: 离线功能 Hook
- `hooks/use-debounce.ts`: 防抖 Hook，用于搜索优化

### 编辑器扩展

- `components/editor/extensions/`: 各种 Tiptap 扩展
  - `tab-keymap.ts`: Tab 键映射
  - `save-shortcut.ts`: 保存快捷键
  - `slash-command.ts`: 斜杠命令
  - `suggestion.ts`: 自动补全建议

## 亮点

1. **实时协作**: 使用 Y.js 和 Hocuspocus 实现真正的实时协作，操作转换确保数据一致性
2. **离线优先**: 基于 IndexedDB 的离线存储，用户可在断网时继续工作
3. **性能优化**: 无限滚动加载、搜索防抖、数据缓存等优化手段
4. **用户体验**: 流畅的编辑体验，支持多种输入方式和快捷键
5. **扩展性**: 基于 Tiptap 的插件架构，易于添加新功能
6. **数据同步**: 智能的在线/离线状态切换和数据同步机制

## 注意事项和坑

1. **Y.js 集成**: Collaboration 扩展会禁用 Tiptap 的内置历史记录，必须使用 Y.js 的撤销/重做
2. **组件重渲染**: 当 provider 状态改变时，需要使用 key 强制重新挂载编辑器组件
3. **内存泄漏**: Y.js 文档和 provider 需要正确清理，避免内存泄漏
4. **冲突解决**: Y.js 的操作转换可能导致意外的编辑结果，需要用户理解
5. **IndexedDB 限制**: 离线数据存储有容量限制，需要定期清理
6. **网络状态检测**: 需要准确检测网络状态，避免在弱网环境下误判
7. **权限控制**: 协作笔记的权限检查需要在客户端和服务端都进行
8. **数据一致性**: 离线编辑后重新连接时的数据合并逻辑复杂
9. **编辑器性能**: 大文档的渲染性能需要优化，考虑虚拟滚动
10. **浏览器兼容性**: Y.js 和 IndexedDB 在老旧浏览器中支持有限

## 依赖关系

- 依赖于认证模块获取用户会话
- 依赖于仓库管理模块处理笔记归属
- 依赖于协作模块处理多用户权限
- 依赖于搜索模块提供全局搜索
- 使用 UI 组件库提供界面元素
- 使用工具库的 utilities 函数
