/**
 * [POS] api/health.ts
 *   所属：API 路由�?| 角色：健康检�?
 *   [PROTOCOL]: 变更时更新此头部
 *
 * [METHODS]
 *   - GET /health �?检查数据库连接状�?
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'

// === 内联 Prisma 客户�?===
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma = globalForPrisma.prisma ?? new PrismaClient()

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const requestId = Math.random().toString(36).substring(7)
  const startTime = Date.now()
  
  try {
    console.log(`[Health:${requestId}] Request received:`, {
      method: req.method,
      headers: req.headers,
      query: req.query,
      url: req.url
    })

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-request-id')

    if (req.method === 'OPTIONS') {
      console.log(`[Health:${requestId}] OPTIONS request handled`)
      return res.status(200).end()
    }

    console.log(`[Health:${requestId}] Testing database connection...`)
    // 测试数据库连�?
    const result = await prisma.$queryRaw`SELECT 1 as connected`
    
    const duration = Date.now() - startTime
    console.log(`[Health:${requestId}] Success:`, { connected: !!result, duration: `${duration}ms` })
    
    return res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV
      }
    })
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString(),
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV
      }
    })
  }
}
