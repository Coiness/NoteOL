import { prisma } from "@/lib/prisma"
import { generateVerificationToken } from "@/lib/tokens"
import { sendVerificationEmail } from "@/lib/mail"
import { NextRequest } from "next/server"
import { apiSuccess, handleApiError, AppError } from "@/lib/api-response"
import * as z from "zod"

const sendCodeSchema = z.object({
  email: z.email({ message: "请输入有效的邮箱地址" }),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = sendCodeSchema.parse(body)

    // 检查邮箱是否已被注册
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new AppError("该邮箱已被注册", 409)
    }

    // 生成验证码
    const verificationToken = await generateVerificationToken(email)

    // 发送邮件
    await sendVerificationEmail(email, verificationToken.token)

    return apiSuccess({ message: "验证码已发送" })
  } catch (error) {
    return handleApiError(error)
  }
}
