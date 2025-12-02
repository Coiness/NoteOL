/**
 * 统一API响应与错误处理工具
 */

import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { ApiResponse } from "@/types"

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
