/**
 * [POS] api/_lib/prisma.ts
 *   所属：API 工具�?| 角色：Prisma 客户端单�?
 *
 * [DESCRIPTION]
 *   Vercel Serverless Functions 专用�?Prisma 客户�?
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
