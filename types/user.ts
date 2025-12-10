// 用户相关的类型定义
export interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
  emailVerified?: Date | null
  createdAt: string
  updatedAt: string
}