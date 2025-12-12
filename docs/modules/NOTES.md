**笔记（Notes）模块**

- **功能概述**: 管理笔记的 CRUD（创建、读取、更新、删除），支持分页、搜索、排序、标签、知识库归属和协作权限。

**实现要点**

- API 层由 `app/api/notes` 提供，包含 `GET /api/notes`（分页、筛选、排序）、`POST /api/notes`（创建）、`GET/PUT/DELETE /api/notes/:noteId`（单条操作）。
- 前端使用 `use-note-list.ts` 获取分页数据（React Query 的 useInfiniteQuery），同时合并离线笔记。
- `use-note-operations.ts` 提供创建（支持离线创建）、基于 `React Query` 的 mutation 管理与路由跳转。

**关键文件**

- `app/api/notes/route.ts`：列表与创建接口（分页、tag 过滤、权限检查）。
- `app/api/notes/[noteId]/route.ts`：单条笔记获取/保存/删除。
- `app/api/notes/[noteId]/collaborators/route.ts`：管理协作者的接口。
- `app/hooks/use-note-list.ts`、`app/hooks/use-note-operations.ts`：前端数据层与操作封装。
- `components/editor/note-list.tsx`：笔记列表 UI 组件，与离线笔记合并展示。

**内部逻辑/细节**

- 列表查询逻辑：`GET /api/notes` 会根据 `query`、`tagId`、`repositoryId` 和 `sort/order` 构建 Prisma 查询；会返回分页信息以及笔记带 role 字段（OWNER、ADMIN、EDITOR、VIEWER）。
- 创建：`POST /api/notes` 会在事务中创建笔记、关联到 repository 并 upsert 标签（若提供），返回新笔记。
- 权限：在后端的查询中，`where` 为用户是笔记 `userId` 或者在 `collaborators` 列表中。
- 前端合并离线笔记：`use-note-list` 使用 `useOffline` 提供的离线笔记（IndexedDB）并合并排序以展示，同时将 `offline` 标记用于 UI 表示。
