/**
 * [POS] api/_lib/prisma.ts
 *   所属：API 工具层 | 角色：Prisma 客户端单例
 *
 * [DESCRIPTION]
 *   Vercel Serverless Functions 专用的 Prisma 客户端
 *   避免使用相对路径引用 src/lib/prisma.ts
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
