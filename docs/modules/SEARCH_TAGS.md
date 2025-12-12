**搜索与标签（Search & Tags）模块**

- **功能概述**: 支持按标题、内容、标签、知识库名称的快速搜索与模糊查询；同时支持用户标签的管理与筛选。

**实现要点**

- `app/api/search/route.ts` 实现搜索，根据查询前缀解析类型（#、@、title:、content:）并执行不同的 Prisma 查询。
- `app/api/tags/route.ts` 返回当前用户的标签列表，包含标签下笔记统计信息（`_count`）。
- 前端搜索输入组件会在 `Input` 上组合 `Search` 图标并调用 API，搜索结果被拆分为 `title|content|tags|repositories` 四组以便呈现。

**关键文件**

- `app/api/search/route.ts`：搜索逻辑与 snippet（内容摘要）生成。
- `app/api/tags/route.ts`：返回用户标签列表（并带notes计数）。
- 前端 UI：`components/editor/note-list.tsx`（通过 `use-note-list` 筛选），以及全局搜索组件 `components/global-search.tsx`。

**内部逻辑/细节**

- 解析查询：如果查询以 `#` 开头，将查找标签；以 `@` 开头查找知识库；以 `title:` 或 `content:` 开头切换到相应精确查询；否则执行 `global` 并行查询前三项。
- 内容片段（snippet）：`search/route.ts` 将内容抽取为片段，并查找查询词索引以便生成高亮摘要。
- 权限过滤：所有搜索查询都用了 `userAccessFilter`（Owner 或 Collaborator）以保证用户仅能搜索自己可见的笔记。
