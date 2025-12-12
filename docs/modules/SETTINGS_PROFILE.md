**设置与个人资料（Settings & Profile）模块**

- **功能概述**: 管理用户的资料信息（昵称）、密码变更、以及其他用户设置视图。

**实现要点**

- `app/api/user/profile`、`app/api/user/password` 实现了 profile get/put 与 password 修改逻辑。
- 前端组件：`components/settings/profile-form.tsx`、`components/settings/password-form.tsx` 等提供表单更新与表单验证（React Hook Form + Zod）。

**关键文件**

- `app/api/user/profile/route.ts`：读取和更新用户 profile，以及统计信息（note count / repo count / total word count）
- `app/api/user/password/route.ts`：校验当前密码并更新为哈希后的新密码。
- `components/settings/*`：前端表单实现。

**内部逻辑/细节**

- 修改 profile：使用 session 中的 `user.id` 获取并更新用户信息，返回更新后的用户对象。
- 修改密码：校验当前密码（bcrypt 比对），成功后用 bcrypt hash 新密码并写入 DB。
