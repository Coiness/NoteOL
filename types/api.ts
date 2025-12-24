/**
 * 通用 API 响应类型定义
 * 
 * 用于统一前后端数据交互的格式。
 * 所有 API 路由都应返回此结构的 JSON。
 */

export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  /** 错误详情 (如 Zod 验证错误数组) */
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