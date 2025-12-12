**编辑器（Editor）模块**

- **功能概述**: 富文本编辑器提供写作、格式化、任务列表、表格、代码高亮、图片、链接等功能，并支持实时协同编辑（Y.js + Hocuspocus + TipTap）。

**实现要点**

- 使用 TipTap（`@tiptap/react`、多种扩展）构建可扩展的富文本编辑器。
- 协作：使用 `yjs` 文档与 `@hocuspocus/provider` 连接到协作服务，TipTap 的 `Collaboration` 和 `CollaborationCursor` 扩展实现实时文本同步与光标展示。
- 离线与持久化：`y-indexeddb` 用于本地 IndexedDB 持久化，保证断网后可继续编辑并保留变更。
- 编辑器行为：自定义扩展（如 `SaveShortcut`、`SlashCommand`、`TabKeymap`）用于提升 UX。

**关键文件**

- `components/editor/note-editor.tsx`：主编辑器 UI，包含协作状态、错误边界、右侧大纲。
- `components/editor/editor-toolbar.tsx`：工具栏组件。
- `components/editor/extensions/*`：自定义 TipTap 扩展。
- `app/hooks/use-editor-setup.ts`：编辑器初始化、Y.Doc、IndexedDB、Hocuspocus 连接以及自动保存与同步逻辑（mutation）。

**内部逻辑/细节**

- 初始化步骤：
  1. 创建 `new Y.Doc()`。
  2. 用 `IndexeddbPersistence(noteId+'_v1', yDoc)` 做本地 persistence（加载和保存本地文档）。
  3. 向 `/api/collaboration/auth?noteId=` 请求短期 token，并通过 `HocuspocusProvider` 连接 WebSocket（`ws://localhost:1234`）。
  4. 将 `yDoc` 传递给 TipTap 的 `Collaboration` 扩展，并在 provider 的 `awareness` 上监听在线用户数。
- 自动保存（Title/Tags）：
  - 标题与标签分别使用防抖（debounce）并通过 `saveMutation` 保存；在离线模式下更新 IndexedDB 与本地缓存。
  - `saveMutation` 在成败时分别更新缓存并 trigger 刷新、toast 通知。
- 错误与断线处理：当协作服务不可用或者连接断开，编辑器会降级到离线模式并提示用户。IndexedDB 仍然能保存用户变更，等网络恢复时通过 `use-offline` 同步。
