/**
 * [POS] api/behavior/index.ts
 *   所属：API 路由层 | 角色：行为埋点
 *
 * [METHODS]
 *   - POST /api/behavior/log → 记录用户行为日志
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import jwt from 'jsonwebtoken'

// === 内联 Auth 工具 ===
const JWT_SECRET = process.env.JWT_SECRET!

interface AuthUser {
  id: string
  phone: string
  role: string
  nickname: string
}

async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded
  } catch {
    return null
  }
}

async function getCurrentUser(req: any): Promise<AuthUser | null> {
  const authHeader = req.headers?.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  return verifyToken(authHeader.slice(7))
}

// 简单的内存限流器（生产环境建议使用 Redis）
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string, maxRequests = 100, windowMs = 60000): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (userLimit.count >= maxRequests) {
    return false
  }

  userLimit.count++
  return true
}

async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      code: 405, 
      message: '方法不允许', 
      timestamp: Date.now() 
    })
  }

  // 可选鉴权（埋点可以允许匿名，也可以要求登录）
  const user = await getCurrentUser(req)
  
  // 如果有用户，检查限流
  if (user && !checkRateLimit(user.id)) {
    return res.status(429).json({
      code: 429,
      message: '请求过于频繁',
      timestamp: Date.now()
    })
  }

  try {
    const { type, metadata } = req.body

    if (!type) {
      return res.status(400).json({
        code: 400,
        message: '缺少必需参数: type',
        timestamp: Date.now()
      })
    }

    // 生成日志ID
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // 这里可以将日志写入数据库或日志系统
    // 当前简化实现仅返回成功响应
    console.log('[Behavior Log]', {
      logId,
      userId: user?.id || 'anonymous',
      type,
      metadata,
      timestamp: new Date().toISOString()
    })

    return res.status(200).json({
      code: 200,
      message: 'success',
      data: { logId },
      timestamp: Date.now()
    })

  } catch (error: any) {
    console.error('[API /behavior/log]', error)
    return res.status(500).json({
      code: 500,
      message: '记录行为日志失败: ' + (error.message || 'Unknown'),
      timestamp: Date.now()
    })
  }
}

export default handler
