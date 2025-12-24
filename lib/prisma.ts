/**
 * Prisma Client 单例模式
 * 
 * 在 Next.js 开发环境 (Hot Module Replacement) 中，避免频繁创建 PrismaClient 实例导致数据库连接耗尽警告。
 * 生产环境下使用标准单例。
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 仅在开发环境下启用详细的查询日志，用于分析数据库操作
const prismaClientOptions = {
  log: process.env.NODE_ENV === 'development' 
    ? [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ]
    : ['error'],
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaClientOptions as any)

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  
  // 监听并打印查询日志
  // @ts-ignore
  prisma.$on('query', (e: any) => {
    // console.log('Query: ' + e.query)
    // console.log('Params: ' + e.params)
    // console.log('Duration: ' + e.duration + 'ms')
  })
}
