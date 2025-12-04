---
agent: agent
---
我正在开发在线笔记平台项目，开发顺序如下。
[x] 1.项目初始化与工程化
[x] 1.5.全局错误处理与API响应封装
[x] 2.实现用户模块（NextAuth.js集成与用户界面）
[x] 3.笔记模块CRUD（前后端已集成）
[x] 4.知识库分类模块与界面集成
[x] 5.标签模块与搜索模块
[x] 6.响应式布局与UI优化
[] 7.查漏补缺与Bug修复
    - [ ] 修复知识库无法删除的问题
    - [ ] 修复 Next.js Link legacyBehavior 报错
    - [ ] 修复编辑器样式问题
[] 8.用户交互优化
    - [ ] 自动保存功能
    - [ ] 快捷键支持
    - [ ] 知识库搜索与排序
    - [ ] 笔记列表排序
    - [ ] 个人页面开发
[] 9.性能优化
    - [ ] 预加载优化
[] 10.离线编辑功能与本地缓存
[] 11.同步协同编程
[] 12.接入AI语义化平台
[] 13.AI摘要与聚类
[] 14.部署、测试、文档

下面是目录结构
NoteOL/
├── app/
│   ├── (auth)/             # 认证路由组
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (main)/             # 主业务路由组
│   │   ├── layout.tsx
│   │   ├── notes/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── [noteId]/
│   │   │       └── page.tsx
│   │   └── repositories/
│   │       ├── page.tsx
│   │       └── [repoId]/
│   │           └── page.tsx
│   ├── api/                # API 路由
│   ├── error.tsx           # 全局错误 UI
│   ├── globals.css
│   ├── layout.tsx
│   ├── not-found.tsx       # 全局 404 UI
│   └── page.tsx
├── components/
│   ├── auth/               # 认证组件
│   ├── editor/             # 编辑器组件
│   ├── layout/             # 布局组件
│   ├── providers/          # 全局 Providers
│   ├── repository/         # 知识库组件
│   └── ui/                 # shadcn/ui 组件
├── hooks/                  # 自定义 Hooks
├── lib/                    # 工具函数与配置
├── mocks/                  # 测试 Mock 数据
├── prisma/                 # 数据库模型
├── store/                  # Zustand 状态管理
├── types/                  # TS 类型定义
└── ...配置文件

技术栈如下，不过可能存在还没有安装和配置的技术栈，你可以参考一下

核心框架
Next.js 16.03- 全栈React框架
TypeScript 类型安全
TailwindCSS 原子化CSS
shadcn/ui 组件库

状态管理与数据流
Zustand 轻量级状态管理
React Hook Form + Zod 表单处理与验证
TanStack Query 服务端状态管理

编辑器方案
Tiptap 无头编辑器（高度可定制，基于ProseMirror）
@tiptap/react React封装
@tiptap/starter-kit 基础套件
@tiptap/extension-placeholder 占位符
@tiptap/extension-code-block-lowlight 代码高亮
Tailwind Typography 排版插件

🔧 后端技术栈

数据层
PostgreSQL 主数据库（Vercel Postgres）
Prisma ORM

认证与安全
NextAuth.js 身份验证

### 💡 开发指令与规范

请根据当前进度和我的指令，逐步完成相应模块的代码。

**开发规范：**
1.  **确认需求**：在开始编码前，如果对数据结构、业务逻辑或目标方法有疑问，请先向我确认。
2.  **样式管理**：优先复用 `globals.css` 中的预定义样式或 Tailwind CSS 原子类。如需自定义，请保持风格统一。
3.  **组件使用**：你可以自由使用 `shadcn/ui` 组件库，按需安装和配置。
4.  **错误处理**：请遵循已建立的全局错误处理规范（`lib/api-response.ts` 和 `app/error.tsx`），API 必须使用 `handleApiError` 处理异常。
5.  **代码质量**：保持代码整洁，添加必要的注释，并确保类型安全。
