/**
 * [POS] src/lib/prisma.ts
 *   所属：基础设施层 | 角色：Prisma 客户端单例
 *
 * [INPUT]
 *   - @prisma/client → PrismaClient
 *   - process.env.DATABASE_URL → 数据库连接
 *
 * [OUTPUT]
 *   - prisma → 全局 Prisma 客户端实例
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
