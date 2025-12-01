/**
 * 用户认证相关的验证模式，使用zod库定义
 */

import * as z from "zod"

// 定义Schema来验证用户登录表单数据
// 这套逻辑前后端共用，保持一致性
export const userAuthSchema = z.object({
  email: z.email({ message: "请输入有效的邮箱地址" }),
  password: z.string().min(6, { message: "密码至少需要6个字符" }),
})

export const userRegisterSchema = z.object({
  name: z.string().min(2, { message: "用户名至少需要2个字符" }),
  email: z.email({ message: "请输入有效的邮箱地址" }),
  code: z.string().length(6, { message: "请输入6位验证码" }),
  password: z.string().min(6, { message: "密码至少需要6个字符" }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
})

export type UserAuthFormValues = z.infer<typeof userAuthSchema>
export type UserRegisterFormValues = z.infer<typeof userRegisterSchema>
