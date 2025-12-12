**离线与 PWA（Offline & PWA）模块**

- **功能概述**: 支持断网编辑、离线笔记创建并在网络恢复时同步；同时作为 PWA 提供离线缓存与资源管理，使应用可以被安装到设备中。

**实现要点**

- 离线数据管理：通过 `app/hooks/use-offline.ts` 中的 `OfflineManager` 使用 IndexedDB 存储离线笔记、离线操作（offline_operations）并负责自动同步（在 `window.online`）。
- 前端接口：`useOffline` 钩子暴露 `createOfflineNote`, `getOfflineNotes`, `getOfflineNote`, `updateOfflineNote`, `deleteOfflineNote`, `syncPendingOperations`，以及 `isOnline` 状态与 `pendingNotesCount`。
- 同步逻辑：当浏览器 `online` 事件触发，OfflineManager 会尝试逐条同步 `pending` 状态笔记与服务器 (`POST /api/notes`) 并在成功后更新状态为 `synced` 并记录 `serverId`。
- PWA 缓存：使用 `next-pwa` 生成 `sw.js` 并缓存静态资源、RSC 页面与 API 网络请求策略，storage 策略在 service worker 中通过 Workbox 配置。

**关键文件**

- `app/hooks/use-offline.ts`：包含 `OfflineManager` 类与 `useOffline` Hook，负责 IndexedDB 的管理、操作与同步。
- `public/sw.js`：产出的 Service Worker（由下一步构建或 next-pwa 插件生成）。
- `OFFLINE_README.md`：可能包含针对离线与 PWA 的说明（仓库中）。

**内部逻辑/细节**

- IndexedDB Schema：
  - `offline_notes`：离线笔记表（keyPath: `id`），含 status（pending, syncing, failed, synced）、serverId 字段用于映射服务端笔记。
  - `offline_operations`：可用于记录复杂的历史变更（当前实现集中于笔记创建同步）。
- 同步策略：在浏览器 `online` 时触发同步，OfflineManager 通过 `fetch('/api/notes', POST)` 逐条提交，若成功更新本地状态；异常时标记 `failed` 并不会无限重试，提示用户。
- 与编辑器的集成：`use-editor-setup` 在离线笔记时会操作 IndexedDB 代替在线保存。`use-note-list` 会合并本地 IndexedDB 与在线数据，用 `isOffline` 标记区别展示。
