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

## Docker 部署

如果你想快速部署到本地环境（无需手动配置数据库和环境变量），可以使用 Docker 一键部署。

### 前提条件

- 安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 部署步骤

1. **克隆项目**（如果还没有的话）：

```bash
git clone <your-repo-url>
cd NoteOL
```

2. **一键启动**：

   **Windows 用户**：双击运行项目根目录下的 `start-docker.bat` 文件

   **或手动运行**：

   ```bash
   docker-compose up -d --build
   ```

3. **等待启动完成**：

   脚本会自动：
   - 构建应用镜像
   - 启动 PostgreSQL 数据库
   - 运行数据库迁移（创建表结构）
   - 启动 Next.js 应用

4. **访问应用**：

   打开浏览器访问：http://localhost:3000

### 首次使用

1. 访问 http://localhost:3000
2. 点击"注册"，输入你的邮箱地址
3. 检查邮箱，输入验证码完成注册
4. 开始使用笔记功能！

### 服务说明

- **应用服务**：运行在 http://localhost:3000
- **数据库服务**：PostgreSQL 运行在本地端口 5432
- **数据持久化**：数据库数据存储在 Docker 卷中，重启不会丢失

### 停止和清理

```bash
# 停止服务
docker-compose down

# 停止服务并删除数据卷（慎用，会删除所有数据）
docker-compose down -v
```

### 故障排除

- 如果启动失败，检查 Docker Desktop 是否正在运行
- 查看服务日志：`docker-compose logs`
- 重启服务：`docker-compose restart`

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
