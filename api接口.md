# NoteOL 后端 API 接口文档

本文档汇总了 NoteOL 系统目前所有的后端 API 接口及其功能说明。

## 1. 笔记 (Notes)

### 获取笔记列表

- **接口**: `GET /api/notes`
- **功能**: 获取当前用户的笔记列表。
- **参数 (Query Params)**:
  - `repositoryId` (可选): 仅返回指定知识库内的笔记。
  - `query` (可选): 搜索关键词，匹配标题或内容。
- **权限**: 返回用户作为所有者 (Owner) 或协作者 (Collaborator) 的笔记。

### 创建笔记

- **接口**: `POST /api/notes`
- **功能**: 创建一篇新笔记。
- **请求体 (JSON)**:
  - `title`: 笔记标题。
  - `content` (可选): 笔记内容。
  - `repositoryId` (可选): 初始放入的知识库 ID。若未提供，则放入默认知识库。
  - `tags` (可选): 标签数组 `["tag1", "tag2"]`。
- **逻辑**: 创建笔记 -> 关联知识库 -> 处理标签 -> 返回笔记对象。

### 获取笔记详情

- **接口**: `GET /api/notes/[noteId]`
- **功能**: 获取单篇笔记的详细信息。
- **返回**: 笔记数据，包含 `tags` 和当前用户的 `role` (OWNER, ADMIN, EDITOR, VIEWER)。
- **权限**: 仅 Owner 或 Collaborator 可访问。

### 更新笔记

- **接口**: `PUT /api/notes/[noteId]`
- **功能**: 更新笔记内容。
- **请求体 (JSON)**:
  - `title` (可选)
  - `content` (可选): 更新内容并自动计算字数。
  - `tags` (可选): 全量替换标签。
- **权限**: 仅 Owner, ADMIN 或 EDITOR 可操作。

### 删除笔记

- **接口**: `DELETE /api/notes/[noteId]`
- **功能**: 永久删除笔记。
- **权限**: 仅 Owner 可操作。

---

## 2. 知识库 (Repositories)

### 获取知识库列表

- **接口**: `GET /api/repositories`
- **功能**: 获取当前用户创建的所有知识库。
- **排序**: 按创建时间升序排列。

### 创建知识库

- **接口**: `POST /api/repositories`
- **功能**: 创建一个新的知识库。
- **请求体 (JSON)**:
  - `name`: 知识库名称。
  - `description` (可选): 描述。
  - `color` (可选): 颜色标识。

### 获取知识库详情

- **接口**: `GET /api/repositories/[repoId]`
- **功能**: 获取指定知识库的元数据。
- **权限**: 仅 Owner 可访问。

### 更新知识库

- **接口**: `PUT /api/repositories/[repoId]`
- **功能**: 修改知识库信息 (名称、描述、颜色)。
- **权限**: 仅 Owner 可操作。

### 删除知识库

- **接口**: `DELETE /api/repositories/[repoId]`
- **功能**: 删除知识库。
- **限制**: 无法删除默认知识库 (Inbox)。
- **权限**: 仅 Owner 可操作。

### 关联笔记到知识库

- **接口**: `POST /api/repositories/[repoId]/notes`
- **功能**: 将一篇**已存在的笔记**添加到指定知识库中 (建立关联)。
- **请求体 (JSON)**:
  - `noteId`: 笔记 ID。
- **权限**: 用户必须是知识库的 Owner，且对该笔记有访问权限。

---

## 3. 标签 (Tags)

### 获取标签列表

- **接口**: `GET /api/tags`
- **功能**: 获取用户定义的所有标签。
- **返回**: 标签列表，包含每个标签下的笔记数量统计 (`_count`).

---

## 4. 协作与分享 (Collaboration)

### 创建分享链接

- **接口**: `POST /api/collaboration/share-links`
- **功能**: 为笔记生成一个带有时效和权限的分享链接。
- **请求体 (JSON)**:
  - `noteId`: 笔记 ID。
  - `role`: 授予的角色 (`ADMIN`, `EDITOR`, `VIEWER`)。
- **返回**: 包含 `token` 和完整 `url` 的对象。
- **权限**: 仅 Owner 或 ADMIN 可操作。

### 认领分享链接

- **接口**: `POST /api/collaboration/share-links/claim`
- **功能**: 用户点击分享链接后，通过此接口获取权限。
- **请求体 (JSON)**:
  - `token`: 分享链接中的 token。
- **逻辑**: 验证 Token -> 建立协作关系 (Collaborator) -> 将笔记自动添加到用户的默认知识库。

---

## 5. 用户 (User) - _部分_

- **修改密码**: `POST /api/user/password`
- **修改资料**: `PUT /api/user/profile`
