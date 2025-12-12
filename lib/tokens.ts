import { prisma } from "@/lib/prisma"

export async function generateVerificationToken(email: string) {
  // 生成6位随机数字验证码
  const token = Math.floor(100000 + Math.random() * 900000).toString()
  const expires = new Date(new Date().getTime() + 10 * 60 * 1000) // 10分钟后过期

  // 检查是否已存在该邮箱的验证码，如果存在则删除（或者更新）
  const existingToken = await prisma.verificationToken.findFirst({
    where: { identifier: email },
  })

  if (existingToken) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token: existingToken.token,
        },
      },
    })
  }

  const verificationToken = await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  })

  return verificationToken
}

export async function verifyToken(email: string, token: string) {
  const existingToken = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier: email,
        token,
      },
    },
  })

  if (!existingToken) {
    return false
  }

  const hasExpired = new Date() > existingToken.expires

  if (hasExpired) {
    // 删除过期验证码
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token,
        },
      },
    })
    return false
  }

  // 验证通过后删除验证码，防止重复使用
  await prisma.verificationToken.delete({
    where: {
      identifier_token: {
        identifier: email,
        token,
      },
    },
  })

  return true
}
