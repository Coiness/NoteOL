**协作（Collaboration）模块**

- **功能概述**: 支持多人同时编辑同一笔记、光标同步、共享链接与基于权限的协作（Owner/Admin/Editor/Viewer）。

**实现要点**

- 使用 Y.js 作为 CRDT 数据模型，TipTap 扩展 `Collaboration` 与 `CollaborationCursor` 将 Y.Doc 与编辑器实时同步。
- 使用 `HocuspocusProvider` 来连接协作服务器（WebSocket），服务器端验证 `JWT` 以确认当前用户权限。
- 提供分享链接功能：Owner/Admin 可创建含权限的 share token，访客通过 token 访问并获取对应权限。

**关键文件**

- `app/api/collaboration/auth/route.ts`：根据 `session` 与笔记权限签发短期（1 分钟）JWT，用于 WebSocket 连接。
- `app/api/collaboration/share-links/route.ts`、`[id]`、`claim`：分享链接的创建、查询与领取操作。
- `components/editor/note-editor.tsx` 与 `app/hooks/use-editor-setup.ts`：客户端协作逻辑与连接管理。

**内部逻辑/细节**

- 权限签发：`GET /api/collaboration/auth?noteId=` 检查用户是否为 Owner 或 Collaborator，然后签发仅 1 分钟有效的 JWT，JWT 中包含 `role`（权限）与 `noteId`，供 Hocuspocus WebSocket 服务器使用。
- 连接：客户端将 `token` 传入 `HocuspocusProvider` 的 `token` 字段，Provider 建立连接并通过 `onStatus`、`onSynced` 回调更新 UI 状态。
- 光标与在线用户：provider 的 `awareness` 提供当前在线用户状态，`CollaborationCursor` 扩展由 `awareness` 渲染光标。前端监听 `provider.awareness.on('change', ...)` 以显示在线人数。
- 分享链接：生成 token 并存储到 `shareLink`，带有过期时间和 role；领取者通过 `claim` 路由将 token 兑换为临时访问（或协作者）。
