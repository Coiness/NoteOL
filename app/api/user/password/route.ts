import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiSuccess, handleApiError, AppError } from "@/lib/api-response"
import { z } from "zod"
import { compare, hash } from "bcryptjs"

const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, "请输入当前密码"),
  newPassword: z.string().min(6, "新密码至少6位"),
})

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) throw new AppError("Unauthorized", 401)

    const json = await req.json()
    const body = passwordUpdateSchema.parse(json)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || !user.password) {
      throw new AppError("User not found or password not set", 404)
    }

    const isValid = await compare(body.currentPassword, user.password)
    if (!isValid) {
      throw new AppError("当前密码错误", 400)
    }

    const hashedPassword = await hash(body.newPassword, 12)

    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    })

    return apiSuccess({ message: "Password updated successfully" })
  } catch (error) {
    return handleApiError(error)
  }
}
