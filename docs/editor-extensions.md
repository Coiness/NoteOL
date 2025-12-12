# 编辑器扩展 (Editor Extensions)

## 功能概述

编辑器扩展模块为 Tiptap 编辑器提供丰富的扩展功能，支持表格、代码块、协作等高级编辑特性。

## 实现方式

### 技术栈

- **Tiptap**: 富文本编辑器框架
- **@tiptap/extensions**: 官方扩展
- **Y-Tiptap**: 协作扩展
- **Highlight.js**: 代码语法高亮

### 核心功能

1. **基础编辑**: 标题、列表、链接等基础功能
2. **高级功能**: 表格、代码块、任务列表等
3. **协作支持**: 实时协作和光标显示
4. **自定义扩展**: 斜杠命令、保存快捷键等

## 重要文件

### 扩展文件

- `components/editor/extensions/`: 所有扩展
- `components/editor/extensions/tab-keymap.ts`: Tab 键映射
- `components/editor/extensions/slash-command.ts`: 斜杠命令
- `components/editor/extensions/save-shortcut.ts`: 保存快捷键

### 编辑器文件

- `components/editor/editor-toolbar.tsx`: 编辑器工具栏

## 亮点

1. **功能丰富**: 支持多种文档编辑需求
2. **扩展性强**: 基于插件架构易于扩展
3. **协作集成**: 无缝的协作编辑体验
4. **用户友好**: 直观的工具栏和快捷键

## 注意事项和坑

1. **扩展冲突**: 多个扩展间的冲突处理
2. **性能影响**: 复杂扩展对编辑器性能的影响
3. **浏览器兼容性**: 某些扩展在老浏览器支持有限
