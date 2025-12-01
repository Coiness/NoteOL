/**
 * 用户注册API路由
 * 首先判断用户是否存在
 * 接着加密密码，保证密码非明文存储
 * 最后创建用户并返回用户信息
 * 不过最后的select是什么意思？
 */

import { prisma } from "@/lib/prisma"
import { userRegisterSchema } from "@/lib/validations/auth"
import { hash } from "bcryptjs"
import { NextRequest } from "next/server"
import { apiSuccess, handleApiError, AppError } from "@/lib/api-response"
import { verifyToken } from "@/lib/tokens"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // 验证数据
    const { email, password, name, code } = userRegisterSchema.parse(body)

    // 验证验证码
    const isValidToken = await verifyToken(email, code)
    if (!isValidToken) {
      throw new AppError("验证码无效或已过期", 400)
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    })

    if (existingUser) {
      throw new AppError("该邮箱已被注册", 409)
    }

    // 密码加密
    const hashedPassword = await hash(password, 10)

    // 使用事务创建用户和默认知识库
    const user = await prisma.$transaction(async (tx) => {
      // 1. 创建用户
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      })

      // 2. 创建默认知识库
      await tx.repository.create({
        data: {
          name: "默认知识库",
          description: "存放您的所有笔记",
          userId: newUser.id,
          isDefault: true,
          color: "#000000", // 默认颜色
        },
      })

      return newUser
    })

    return apiSuccess(user)
  } catch (error) {
    return handleApiError(error)
  }
}
