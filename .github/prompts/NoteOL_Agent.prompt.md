---
agent: agent
---
我正在开发在线笔记平台项目，开发顺序如下。
[x] 1.项目初始化与工程化
[x] 1.5.全局错误处理与API响应封装
[x] 2.实现用户模块（NextAuth.js集成与用户界面）
[x] 3.笔记模块CRUD（前后端已集成）
[x] 4.知识库分类模块与界面集成
[x] 5.标签模块与搜索模块
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
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (main)/             # 主业务路由组
│   │   ├── layout.tsx
│   │   ├── notes/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── [noteId]/
│   │   │       └── page.tsx
│   │   └── repositories/
│   │       ├── page.tsx
│   │       └── [repoId]/
│   │           └── page.tsx
│   ├── api/                # API 路由
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
│   ├── repository/         # 知识库组件
│   └── ui/                 # shadcn/ui 组件
├── hooks/                  # 自定义 Hooks
├── lib/                    # 工具函数与配置
├── mocks/                  # 测试 Mock 数据
├── prisma/                 # 数据库模型
├── store/                  # Zustand 状态管理
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

### 🎨 UI/UX 样式生成需求 (For Style AI)

我们计划使用专门的 AI 来重新生成项目的视觉风格。当前项目基于 **shadcn/ui** 和 **Tailwind CSS**。

**已使用的 UI 组件清单：**
*   **基础元素**: `Button` (按钮), `Input` (输入框), `Label` (标签), `Textarea` (文本域), `Badge` (徽章/标签), `Separator` (分割线), `Skeleton` (骨架屏), `Avatar` (头像).
*   **交互反馈**: `Sonner` (Toast 通知), `Alert Dialog` (警告弹窗), `Toggle` (开关).
*   **浮层与容器**: `Card` (卡片), `Dialog` (模态框), `Popover` (气泡卡片), `Dropdown Menu` (下拉菜单).
*   **复杂组件**: `Command` (用于搜索和标签输入的 cmdk 组件), `Select` (选择器).
*   **自定义组件**: `TagInput` (基于 Command 和 Popover 封装).

**样式设计要求：**
1.  **技术规范**：
    *   必须基于 **Tailwind CSS**。
    *   必须兼容 **shadcn/ui** 的 CSS 变量系统 (即通过 `app/globals.css` 定义 `:root` 和 `.dark` 的颜色变量，如 `--primary`, `--background` 等)。
    *   支持 **深色模式 (Dark Mode)**。

2.  **风格目标**：
    *   **类型**：现代、极简、专注于内容的笔记应用 (类似 Notion, Obsidian, Bear)。
    *   **侧边栏**：需要与主编辑区域有明显的视觉区分 (例如使用 `bg-muted/10` 或独立的背景色)。
    *   **编辑器**：主编辑区域应保持干净、无干扰，背景色通常为纯白或纯黑。
    *   **强调色**：需要一套清晰的主题色 (Primary Color) 用于按钮和高亮状态。
    *   **圆角 (Radius)**：统一的圆角风格 (例如 `0.5rem` 或更圆润)。

3.  **重点优化组件**：
    *   **Command (搜索/标签)**：这是高频使用的组件，需要设计得精致，像 Spotlight 一样。
    *   **Badge (标签)**：用于展示笔记标签，颜色应当柔和，不要喧宾夺主。
    *   **Card (卡片)**：用于登录/注册页面，需要有层次感 (阴影或边框)。

**输出物期望**：
*   更新后的 `app/globals.css` (包含全套 CSS 变量)。
*   更新后的 `tailwind.config.ts` (如果需要扩展配置)。



