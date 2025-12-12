# NoteOL

NoteOL 是一个现代化的在线笔记与知识库平台，基于 Next.js（App Router）构建，支持富文本编辑、实时协作、标签管理、知识库（Repository）分组以及离线编辑与 PWA 支持。

核心技术：Next.js 16、TypeScript、Prisma、NextAuth、TipTap（Yjs 协作）、Hocuspocus、React Query、Tailwind CSS、IndexedDB。

## 特性

- 富文本编辑器（TipTap）与自定义扩展（Tab、Slash、保存快捷键等）
- 实时协作（Yjs + Hocuspocus + CollaborationCursor）
- 离线编辑（IndexedDB + 自动同步）与 PWA 支持（Service Worker）
- 支持标签、知识库、多用户协作（权限控制）
- 完整的 REST API（Next.js App Router）与 Prisma ORM

## 快速开始

1. 复制或创建 `.env.local`（示例变量：`DATABASE_URL`, `NEXTAUTH_SECRET`, `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`, `EMAIL_FROM`, `COLLABORATION_SECRET`, `NEXTAUTH_URL`, `HOCUSPOCUS_URL`）。
2. 安装依赖：

```bash
npm install
```

3. 初始化数据库并运行迁移：

```bash
npx prisma migrate dev
```

4. 启动开发服务器：

```bash
npm run dev
```

## 开发命令

- 运行测试：`npm test` (Vitest)
- 运行 e2e：`npm run e2e` (Playwright)
- 启动生产构建：`npm run build && npm run start`
- 格式化与 Lint：`npm run lint`, `npm run lint:fix`

## 业务模块概览

项目按业务模块拆分，概览如下，详情请查看 `docs/modules/` 下对应文档：

- 用户认证（Auth） - `docs/modules/AUTH.md`
- 笔记（Notes） - `docs/modules/NOTES.md`
- 知识库（Repository） - `docs/modules/REPOSITORIES.md`
- 编辑器（Editor） - `docs/modules/EDITOR.md`
- 协作（Collaboration） - `docs/modules/COLLABORATION.md`
- 离线与 PWA（Offline & PWA） - `docs/modules/OFFLINE_PWA.md`
- 搜索与标签（Search & Tags） - `docs/modules/SEARCH_TAGS.md`
- 设置与个人资料（Settings & Profile） - `docs/modules/SETTINGS_PROFILE.md`
- 后端 API（API） - `docs/modules/API.md`
- 测试（Testing） - `docs/modules/TESTING.md`

## 代码结构（高层）

- `app/` - Next.js App Router 页面与 API
- `components/` - 前端 UI 组件与复用模块
- `lib/` - 后端与公用工具（Prisma、Auth、Mail、API Response）
- `app/hooks/` - 自定义 hooks（编辑器、离线、列表、操作）
- `prisma/` - 数据库 schema 与迁移
- `docs/` - 项目文档

## 部署建议

- 环境变量：请在部署环境配置 `DATABASE_URL`、`NEXTAUTH_SECRET`、`EMAIL_*`、`COLLABORATION_SECRET` 等。
- Hocuspocus 协作服务：建议在云或 VPS 部署独立协作服务器，设置 `HOCUSPOCUS_URL`。
- PWA：框架通过 `next-pwa` 提供 SW 自动注册，生产构建时生成 `sw.js`。
