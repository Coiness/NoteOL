---
agent: agent
---
我正在开发在线笔记平台项目，开发顺序如下。
[x] 1.项目初始化与工程化
[x] 1.5.全局错误处理与API响应封装
[x] 2.实现用户模块（NextAuth.js集成与用户界面）
[x] 3.笔记模块CRUD（前后端已集成）
[] 4.知识库分类模块与界面集成
[] 5.标签模块与搜索模块
[] 6.响应式布局与UI优化
[] 7.查漏补缺
[] 8.用户交互优化
[] 9.性能优化
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
│   │   └── register/
│   ├── (main)/             # 主业务路由组
│   │   └── notes/
│   ├── api/
│   │   └── auth/[...nextauth]/route.ts
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
│   │   └── providers.tsx
│   └── ui/                 # shadcn/ui 组件
├── lib/
│   ├── api-response.ts     # 统一 API 响应与错误处理
│   ├── auth.ts             # NextAuth 配置
│   ├── prisma.ts           # Prisma Client 单例
│   └── utils.ts
├── prisma/
│   └── schema.prisma       # 数据库模型
├── hooks/                  # 自定义 Hooks
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
ByteMD Markdown编辑器（SSR友好，开箱即用）
@bytemd/react React封装
@bytemd/plugin-gfm GFM扩展支持
@bytemd/plugin-highlight 代码高亮(还有数学公式和 **mermaid** 渲染插件等)

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



