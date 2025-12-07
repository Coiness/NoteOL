我正在开发在线笔记平台项目，开发顺序如下。

[x] 1. 项目初始化与工程化
[x] 1.5. 全局错误处理与 API 响应封装
[x] 2. 实现用户模块（NextAuth.js 集成与用户界面）
[x] 3. 笔记模块 CRUD（前后端已集成）
[x] 4. 知识库分类模块与界面集成
[x] 5. 标签模块与搜索模块
[x] 6. 响应式布局与 UI 优化
[x] 7. 查漏补缺与 Bug 修复 - [x] 修复知识库无法删除的问题 - [x] 修复 Next.js Link legacyBehavior 报错 - [x] 修复编辑器样式问题
[] 8. 用户交互优化 - [x] 自动保存 (Auto-save) - [x] 快捷键支持 (Hotkeys) - [x] 个人页面 (Profile Page) - [ ] 知识库搜索与排序 - [ ] 笔记列表排序 - [ ] 笔记列表响应式调整 (Mobile)
[] 9. 性能优化 - [ ] 预加载优化 (Preloading / PWA)
[x] 10. 离线编辑功能与本地缓存 (Y.js + IndexedDB)
[x] 11. 同步协同编程 (WebSocket + Hocuspocus) - [x] 集成协作服务（Hocuspocus）并实现基于 webhook 的持久化 - [x] 前端切换为 `@hocuspocus/provider`，解决协议不兼容问题 - [x] 统一 Y.js / lib0 / y-protocols 版本，避免二进制解码异常 - [x] IndexedDB 容错与版本命名（使用 `_v2`）以避免旧缓存导致的问题
[] 12. 接入 AI 语义化平台（规划中）
[] 13. AI 摘要与聚类（规划中）
[] 14. 部署、测试、文档

下面是当前目录结构（简化与重点标注）
NoteOL/ （主应用）

- app/
  - (auth)/ # 认证路由组（login/register）
  - (main)/ # 主业务路由组（notes, repositories, settings...）
  - api/ # API 路由（含 collaboration/auth, webhooks/save-note）
  - globals.css
  - layout.tsx
  - error.tsx
- components/
  - editor/ # 编辑器组件（note-editor, note-detail, toolbar, cursor）
  - auth/
  - layout/
  - providers/
  - repository/
  - ui/
- lib/ # 工具函数 / api 响应封装
- prisma/ # schema.prisma（已新增 note.yjsState Bytes? 字段）
- package.json
- tsconfig.json

NoteOL-ws/ （独立协作服务）

- src/
  - server.ts # Hocuspocus server（鉴权 / Database.save -> Next.js webhook）
  - debug-server.ts # 临时调试用（打印原始帧 base64）
- package.json
- tsconfig.json

技术栈（提醒：需确认版本一致）

- Next.js 16.x, TypeScript, TailwindCSS, shadcn/ui
- Tiptap (v3.x) + @tiptap/react + Starter Kit
- Y.js 13.x, lib0 0.2.x, y-protocols y-websocket / y-prosemirror
- Hocuspocus server (v3.x) 与 @hocuspocus/provider 前端
- Prisma + PostgreSQL, NextAuth.js

注意与约束（关键问题与已知解决方案）

- 保障前端与服务端 Y.js 相关依赖版本一致（`yjs`, `lib0`, `y-protocols`, `y-websocket`）是修复二进制解码错误的关键。推荐统一为：yjs@13.x + lib0@0.2.114 + y-protocols@1.x。
- Hocuspocus 和 y-websocket 协议不同（Hocuspocus 支持消息头包含 documentName），建议从客户端使用 `@hocuspocus/provider` 以避免协议/帧不兼容。
- 若发生 IndexedDB 解码错误，使用 `_v2` 名称策略跳过旧缓存，并在客户端尝试删除本地 `yjs` DB 后重建；并在 `note-editor.tsx` 中实现容错与清理逻辑。
- 建议使用 `note.id`（UUID）作为协作文档 ID（`name`），避免用户变更标题导致协同混乱。

开发规范（补充）

1. 在开发任何协同/共享特性前，先确认数据结构（Note 模型、共享表/权限表）并同步到 Prisma schema；写变更脚本与 migration。
2. 所有 API 必须使用 `handleApiError` 返回统一的错误响应。
3. 新增功能（分享链接、权限管理）先实现最小可行版本（MVP：基于链接的公开访问/只读/可编辑），然后再做 RBAC 的细粒度扩展。
4. 前端：优先复用 `globals.css`，组件风格保持一致；协作错误在 Dev 环境下要有可见 debug 日志，但在 Prod 应删除冗余日志。
5. CI：在合并之前，请确保单元与端到端（集成）测试覆盖协作的核心路径（建立连接、鉴权、存储、恢复、offline -> online sync）。

已完成的关键实现（记录备份）

- 前端：
  - `components/editor/note-editor.tsx` 进行了重构，集成 `@hocuspocus/provider`，拆分 IndexedDB / WS provider 逻辑，并添加 IndexedDB 容错与 `_v2` 策略。
- 服务端：
  - `NoteOL-ws/src/server.ts` 引入 Hocuspocus、TiptapTransformer，实现 `Database.store` 将 Y.Doc 持久化为 HTML 并调用 Next.js `api/webhooks/save-note`。
  - `onAuthenticate` 中用 `COLLABORATION_SECRET` 做 Token 验证。
  - 使用 `overrides`/锁定策略修复 lib0 版本差异。

下一步建议（优先事项）

1. 完成分享链接与基础鉴权（MVP）：实现 `api/notes/[noteId]/share`、前端分享对话框、短期 token 控制读/写权限。
2. 权限管理面板（RBAC）：根据 MVP 扩展到用户/团队权限管理、邀请机制。
3. 编辑器 UX：滚动修复、Slash 命令、工具栏样式、右侧协作者计数显示。
4. 列表与导航：笔记排序、快速添加笔记、移动端适配。
5. 长期优化：历史记录（版本回滚）、PWA/离线预加载、AI 功能的规划与接入。

要我现在：

1. 依据上面的优先级，开始实现“分享链接与鉴权 (MVP)”，或
2. 先把“权限管理面板 (RBAC)”的数据库模型与 API 设计在 Prisma schema 中画出来，供审阅。

请选择一个下一步（或让我推荐实现步骤）。

### 开发指令与规范

请根据当前进度和我的指令，逐步完成相应模块的代码。

**开发规范：**

1.  **确认需求**：在开始编码前，如果对数据结构、业务逻辑或目标方法有疑问，请先向我确认。
2.  **样式管理**：优先复用 globals.css 中的预定义样式或 Tailwind CSS 原子类。如需自定义，请保持风格统一。
3.  **组件使用**：你可以自由使用 shadcn/ui 组件库，按需安装和配置。
4.  **错误处理**：请遵循已建立的全局错误处理规范（lib/api-response.ts 和 pp/error.tsx），API 必须使用 handleApiError 处理异常。
5.  **代码质量**：保持代码整洁，添加必要的注释，并确保类型安全。
