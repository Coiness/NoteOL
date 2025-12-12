**后端 API 模块**

- **功能概述**: 提供 REST 风格的后端接口，包含用户认证、笔记、知识库（repository）、协作（collaboration）、标签与搜索等，统一错误处理与响应格式。

**实现要点**

- 使用 Next.js 的 App Router API（`app/api/*`）作为后端接口。
- 使用 `lib/api-response.ts` 对成功响应与错误处理做统一封装。
- 所有需要鉴权的接口使用 `getServerSession(authOptions)` 校验当前用户并在服务端根据 `session.user.id` 执行权限控制。

**关键文件**

- `app/api/*` 所在文件夹：notes、repositories、collaboration、auth、search、tags、user、webhooks、etc。
- `lib/api-response.ts`：统一返回 JSON、AppError 处理。

**内部逻辑/细节**

- 统一错误与返回：`apiSuccess({ data })` 统一返回 `data` 字段；错误使用 `AppError` 或 `handleApiError` 来进行规范化。
- 权限过滤：在 Note、Repository、Collaborator 查询中根据 `session.user.id` 限制读取或更新。
- 事务处理：对需要原子操作（如：创建笔记并关联仓库、创建用户和默认知识库）使用 `prisma.$transaction` 保持 consistency。
