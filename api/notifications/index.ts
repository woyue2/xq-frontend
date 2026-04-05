/**
 * [POS] api/notifications/index.ts
 *   所属：API 路由层 | 角色：通知管理
 *
 * [METHODS]
 *   - GET  → 获取用户通知列表
 *   - POST → 标记通知为已读
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'
import { requireAuth } from '../_lib/auth'

async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const userId = req.user?.id

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

    } catch (error) {
      console.error('[API /notifications GET]', error)
      return res.status(500).json({
        code: 500,
        message: '服务器内部错误',
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

    } catch (error) {
      console.error('[API /notifications POST]', error)
      return res.status(500).json({
        code: 500,
        message: '服务器内部错误',
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
