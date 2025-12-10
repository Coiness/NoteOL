// API 响应相关的通用类型定义
export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  details?: any
}

export type ApiError = {
  success: false
  error: string
  details?: any
}

export type ApiSuccess<T = any> = {
  success: true
  data: T
}