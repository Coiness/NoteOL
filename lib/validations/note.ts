import * as z from "zod"

/**
 * 笔记验证 Schema 定义
 * 
 * 使用 Zod 定义 API 请求体的数据结构和验证规则。
 * 确保后端接收到的数据是类型安全且符合预期的。
 */

/**
 * 创建笔记 Schema
 * 
 * 必填项: title (1-100字符)
 * 选填项: content, repositoryId, tags
 */
export const noteCreateSchema = z.object({
  title: z.string().min(1, { message: "标题不能为空" }).max(100, { message: "标题不能超过100个字符" }),
  content: z.string().optional(),
  repositoryId: z.string().optional(), // 如果未指定，则存入默认知识库
  tags: z.array(z.string()).optional(), // 标签名称列表
})

/**
 * 更新笔记 Schema (PATCH)
 * 
 * 所有字段均为可选，支持部分更新。
 */
export const noteUpdateSchema = z.object({
  title: z.string().min(1, { message: "标题不能为空" }).max(100, { message: "标题不能超过100个字符" }).optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

/**
 * Upsert (更新或插入) 笔记 Schema (PUT)
 * 
 * 用于全量同步或覆盖。
 */
export const noteUpsertSchema = z.object({
  title: z.string().max(100, { message: "标题不能超过100个字符" }).optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  repositoryId: z.string().optional(),
})

export type NoteCreateFormValues = z.infer<typeof noteCreateSchema>
export type NoteUpdateFormValues = z.infer<typeof noteUpdateSchema>
export type NoteUpsertFormValues = z.infer<typeof noteUpsertSchema>
