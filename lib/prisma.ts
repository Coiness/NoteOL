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
    console.log(`\x1b[36m[Prisma Query] ${e.duration}ms\x1b[0m ${e.query}`)
  })
}
