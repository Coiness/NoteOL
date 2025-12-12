import * as z from "zod"

export const noteCreateSchema = z.object({
  title: z.string().min(1, { message: "标题不能为空" }).max(100, { message: "标题不能超过100个字符" }),
  content: z.string().optional(),
  repositoryId: z.string().optional(), // 如果未指定，则存入默认知识库
  tags: z.array(z.string()).optional(), // 标签名称列表
})

export const noteUpdateSchema = z.object({
  title: z.string().min(1, { message: "标题不能为空" }).max(100, { message: "标题不能超过100个字符" }).optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export type NoteCreateFormValues = z.infer<typeof noteCreateSchema>
export type NoteUpdateFormValues = z.infer<typeof noteUpdateSchema>
