/**
 * [POS] api/health.ts
 *   所属：API 路由层 | 角色：健康检查
 *   [PROTOCOL]: 变更时更新此头部
 *
 * [METHODS]
 *   - GET /health → 检查数据库连接状态
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../src/lib/prisma'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json')

  try {
    // 测试数据库连接
    const result = await prisma.$queryRaw`SELECT 1 as connected`
    
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
