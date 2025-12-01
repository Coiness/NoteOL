/**
 * 统一API响应与错误处理工具
 */

import { NextResponse } from "next/server"
import { ZodError } from "zod"

// 定义标准的 API 响应格式
export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  details?: any
}

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

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    { success: true, data },
    { status }
  )
}
