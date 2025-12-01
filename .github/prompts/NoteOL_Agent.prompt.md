---
agent: agent
---
我正在开发在线笔记平台项目，开发顺序如下。
[x] 1.项目初始化与工程化
[] 2.实现用户模块（NextAuth.js集成与用户界面）
[] 3.笔记模块CRUD（包括MarkDown集成）
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
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── auth/               # 认证组件
│   ├── editor/             # 编辑器组件
│   ├── layout/             # 布局组件
│   ├── providers/          # 全局 Providers
│   │   └── providers.tsx
│   └── ui/                 # shadcn/ui 组件
├── lib/
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

请你根据我的要求，完成相应模块的代码，可以一步一步来。关于重要信息像是数据结构，目标方法等内容，如果你拿不定可以先询问我。在书写代码css时，你可以先去globals.css查看是否有相关预定样式，如果没有，你也可以自行定义。对于组件，你也可以随意下载shadcn/ui的组件。辛苦了



