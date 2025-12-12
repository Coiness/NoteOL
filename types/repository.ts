// 知识库相关的类型定义
export interface Repository {
  id: string
  name: string
  description?: string | null
  userId: string
  isDefault: boolean
  color?: string | null
  createdAt: string
  updatedAt: string
}