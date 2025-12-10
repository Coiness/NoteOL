# UI 组件库 (UI Components Library)

## 功能概述

UI 组件库提供可复用的界面组件，基于 Radix UI 和 Tailwind CSS 构建，包含表单、对话框、按钮等基础组件。

## 实现方式

### 技术栈

- **Radix UI**: 无样式的基础组件
- **Tailwind CSS**: 样式系统
- **Lucide React**: 图标库
- **Class Variance Authority**: 样式变体管理

### 核心组件

1. **表单组件**: Input, Textarea, Select, Checkbox 等
2. **反馈组件**: Dialog, Alert, Toast, Loading 等
3. **导航组件**: Button, Navigation Menu, Tabs 等
4. **布局组件**: Card, Separator, Avatar 等
5. **数据展示**: Table, Badge, Tag 等

## 重要文件

### 组件文件

- `components/ui/`: 所有 UI 组件
- `components/ui/button.tsx`: 按钮组件
- `components/ui/input.tsx`: 输入框组件
- `components/ui/dialog.tsx`: 对话框组件

### 工具文件

- `lib/utils.ts`: 样式工具函数
- `components/ui/tag-input.tsx`: 标签输入组件

## 亮点

1. **一致性**: 统一的设计语言和交互模式
2. **可访问性**: 基于 Radix UI 的无障碍访问支持
3. **可定制性**: 基于 CSS 变量的主题系统
4. **开发效率**: 高度可复用的组件库

## 注意事项和坑

1. **样式冲突**: Tailwind 类名可能与其他样式冲突
2. **主题变量**: 需要正确配置 CSS 变量
3. **组件组合**: 复杂组件的 props 传递需要注意
