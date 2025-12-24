/**
 * 知识库验证 Schema 定义
 * 
 * 用于创建和更新知识库时的表单验证。
 */

import * as z from "zod"

export const repositorySchema = z.object({
  name: z.string().min(1, { message: "名称不能为空" }).max(50, { message: "名称不能超过50个字符" }),
  description: z.string().optional(),
  color: z.string().optional(),
})

export type RepositoryFormValues = z.infer<typeof repositorySchema>
