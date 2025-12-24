/**
 * 统一API响应与错误处理工具
 * 
 * 提供了一套标准化的 API 响应格式和错误处理机制。
 * 确保前后端通信的数据结构一致性。
 */

import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { ApiResponse } from "@/types"

/**
 * 自定义应用错误类
 * 
 * 用于在业务逻辑中主动抛出已知错误，包含状态码和详细信息。
 */
export class AppError extends Error {
  public statusCode: number
  public details?: any

  constructor(message: string, statusCode = 400, details?: any) {
    super(message)
    this.statusCode = statusCode
    this.details = details
    this.name = 'AppError'
  }
}

/**
 * 统一 API 错误处理函数
 * 
 * 捕获并处理 API 路由中的各种错误，返回标准化的 JSON 错误响应。
 * 
 * 支持的错误类型:
 * 1. AppError: 业务逻辑主动抛出的错误
 * 2. ZodError: 数据验证失败 (422)
 * 3. 其他未知错误: 统一返回 500 服务器错误
 * 
 * @param {unknown} error - 捕获到的错误对象
 * @returns {NextResponse} - Next.js 响应对象
 */
export function handleApiError(error: unknown) {
  console.error("[API_ERROR]", error)

  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: error.message, details: error.details },
      { status: error.statusCode }
    )
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false, error: "数据验证失败", details: (error as ZodError).issues },
      { status: 422 }
    )
  }

  return NextResponse.json(
    { success: false, error: "服务器内部错误" },
    { status: 500 }
  )
}

/**
 * 统一 API 成功响应函数
 * 
 * 返回标准化的成功响应 JSON。
 * 
 * @template T - 数据类型
 * @param {T} data - 响应数据
 * @param {number} [status=200] - HTTP 状态码
 * @returns {NextResponse} - Next.js 响应对象
 */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    { success: true, data },
    { status }
  )
}
