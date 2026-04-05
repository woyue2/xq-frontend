/**
 * [POS] api/notifications/index.ts
 *   所属：API 路由层 | 角色：通知管理
 *
 * [METHODS]
 *   - GET  → 获取用户通知列表
 *   - POST → 标记通知为已读
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import * as jwt from 'jsonwebtoken'

// === 内联 Prisma 客户端 ===
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma = globalForPrisma.prisma ?? new PrismaClient()

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

function requireAuth(handler: Function) {
  return async (req: any, res: any) => {
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({ code: 401, message: '未登录或token已过期', timestamp: Date.now() })
    }
    req.user = user
    return handler(req, res)
  }
}

async function handler(req: any, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const userId = (req as any).user?.id as string

  // GET - 获取通知列表
  if (req.method === 'GET') {
    try {
      const { 
        isRead,
        type,
        page = '1', 
        limit = '20' 
      } = req.query
      
      const skip = (Number(page) - 1) * Number(limit)
      
      const where: any = { userId }
      
      if (isRead !== undefined) {
        where.isRead = isRead === 'true'
      }
      
      if (type) {
        where.type = type as string
      }

      const [list, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit)
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: { userId, isRead: false }
        })
      ])

      return res.json({
        code: 200,
        data: {
          list,
          unreadCount,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        },
        timestamp: Date.now()
      })

    } catch (error: any) {
      console.error('[API /notifications GET]', error)
      return res.status(500).json({
        code: 500,
        message: '服务器内部错误: ' + (error.message || 'Unknown'),
        error: error.message,
        timestamp: Date.now()
      })
    }
  }

  // POST - 标记通知为已读
  if (req.method === 'POST') {
    try {
      const { id, readAll = false } = req.body

      if (readAll) {
        // 标记所有通知为已读
        await prisma.notification.updateMany({
          where: { userId, isRead: false },
          data: { isRead: true }
        })

        return res.json({
          code: 200,
          message: '所有通知已标记为已读',
          timestamp: Date.now()
        })
      }

      if (!id) {
        return res.status(400).json({
          code: 400,
          message: '通知ID为必填项',
          timestamp: Date.now()
        })
      }

      // 验证通知是否属于当前用户
      const notification = await prisma.notification.findFirst({
        where: { id, userId }
      })

      if (!notification) {
        return res.status(404).json({
          code: 404,
          message: '通知不存在',
          timestamp: Date.now()
        })
      }

      await prisma.notification.update({
        where: { id },
        data: { isRead: true }
      })

      return res.json({
        code: 200,
        message: '通知已标记为已读',
        timestamp: Date.now()
      })

    } catch (error: any) {
      console.error('[API /notifications POST]', error)
      return res.status(500).json({
        code: 500,
        message: '服务器内部错误: ' + (error.message || 'Unknown'),
        error: error.message,
        timestamp: Date.now()
      })
    }
  }

  return res.status(405).json({
    code: 405,
    message: '方法不允许',
    timestamp: Date.now()
  })
}

export default requireAuth(handler)
