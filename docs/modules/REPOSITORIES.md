**知识库（Repository）模块**

- **功能概述**: 管理用户的知识库（Repository），支持创建、更新、删除，笔记与知识库关联、默认知识库概念。

**实现要点**

- API 层由 `app/api/repositories` 提供，包含 `GET /api/repositories` 列表、`POST /api/repositories` 创建、以及 `GET/PUT/DELETE /api/repositories/:repoId`。
- 前端组件：`components/repository/repository-list.tsx`、`components/repository/repository-dialog.tsx` 等用于展示与编辑。

**关键文件**

- `app/api/repositories/route.ts` 与 `app/api/repositories/[repoId]/route.ts`。
- `components/repository/*`：前端 UI 组件。

**内部逻辑/细节**

- 默认知识库：注册时会自动为用户创建 `isDefault = true` 的知识库（见 `register` API）。
- 删除限制：默认知识库无法删除（`isDefault` 标识），API 层会拒绝删除操作。
- 权限检测：Repository 的操作会验证 `repo.userId === session.user.id`。
