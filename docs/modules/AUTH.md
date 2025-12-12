**用户认证（Auth）模块**

- **功能概述**: 处理用户注册、登录、发送验证码（用于邮箱验证）、JWT 会话管理、密码修改以及与 NextAuth 集成。
- **用途**: 提供身份认证保护所有 API 路由与页面的访问，支撑注册与登陆流程。

**实现要点**

- 使用 `next-auth` (NextAuth) 作为主认证库，配置在 `lib/auth.ts`。
- 使用 `CredentialsProvider` + bcryptjs 对密码进行验证；在 `app/api/auth/register` 实现注册流程。
- 邮件（验证码）发送：`lib/mail.ts` 使用 `nodemailer`；令牌生成与验证在 `lib/tokens.ts`。
- NextAuth 将 `session` 中用户 id 保存到 JWT Token，`callbacks` 中将 `token.id` 注入 `session.user`。

**关键文件**

- `lib/auth.ts`：NextAuth 配置。
- `app/api/auth/send-code/route.ts`：发送邮箱验证码，使用 `lib/tokens` + `lib/mail`。
- `app/api/auth/register/route.ts`：注册逻辑，使用 prisma 事务创建用户与默认知识库。
- `app/api/auth/[...nextauth]/route.ts`：NextAuth 路径（在 repo 中）。

**内部逻辑/细节**

- 注册流程：
  1. 前端调用 `POST /api/auth/send-code` 发送邮箱并获取 6 位验证码。
  2. 服务器端通过 `lib/tokens.generateVerificationToken` 在 `prisma.verificationToken` 表中持久化 Token。
  3. 确认验证码后，`POST /api/auth/register` 根据 `zod` 验证用户输入，Hash 密码并创建用户，顺带创建默认知识库（事务）。
- 登录流程：
  - NextAuth `CredentialsProvider` 使用 `prisma.user.findUnique` 校验存在，并用 `bcryptjs.compare` 验证密码。
- 安全：
  - 密码使用 `bcryptjs` 哈希。
  - Email 验证码短期有效（10 分钟），每次注册请求会更新或删除旧验证码。
