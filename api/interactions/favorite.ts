/**
 * [POS] api/interactions/favorite.ts
 *   所属：API 路由层 | 角色：收藏/取消收藏
 *
 * [METHODS]
 *   - GET  → 获取用户收藏列表
 *   - POST → 收藏问题
 *   - DELETE → 取消收藏
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'
import { getCurrentUser } from '../_lib/auth'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '未登录',
        timestamp: Date.now()
      })
    }

    if (req.method === 'GET') {
      const { page = '1', limit = '20' } = req.query
      const skip = (Number(page) - 1) * Number(limit)

      const [favorites, total] = await Promise.all([
        prisma.favorite.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
          include: {
            question: {
              select: {
                id: true,
                title: true,
                content: true,
                subject: true,
                authorName: true,
                createdAt: true
              }
            }
          }
        }),
        prisma.favorite.count({ where: { userId: user.id } })
      ])

      return res.json({
        code: 200,
        data: {
          list: favorites,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        },
        timestamp: Date.now()
      })
    }

    if (req.method === 'POST') {
      const { questionId } = req.body

      if (!questionId) {
        return res.status(400).json({
          code: 400,
          message: '问题ID不能为空',
          timestamp: Date.now()
        })
      }

      // 检查是否已收藏
      const existing = await prisma.favorite.findUnique({
        where: {
          userId_questionId: {
            userId: user.id,
            questionId
          }
        }
      })

      if (existing) {
        return res.status(409).json({
          code: 409,
          message: '已收藏',
          timestamp: Date.now()
        })
      }

      // 创建收藏
      await prisma.favorite.create({
        data: {
          userId: user.id,
          questionId
        }
      })

      // 更新收藏数
      await prisma.question.update({
        where: { id: questionId },
        data: { favorites: { increment: 1 } }
      })

      return res.json({
        code: 200,
        message: '收藏成功',
        timestamp: Date.now()
      })
    }

    if (req.method === 'DELETE') {
      const { questionId } = req.body

      if (!questionId) {
        return res.status(400).json({
          code: 400,
          message: '问题ID不能为空',
          timestamp: Date.now()
        })
      }

      // 删除收藏
      await prisma.favorite.delete({
        where: {
          userId_questionId: {
            userId: user.id,
            questionId
          }
        }
      })

      // 更新收藏数
      await prisma.question.update({
        where: { id: questionId },
        data: { favorites: { decrement: 1 } }
      })

      return res.json({
        code: 200,
        message: '取消收藏成功',
        timestamp: Date.now()
      })
    }

    return res.status(405).json({
      code: 405,
      message: '方法不允许',
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[API /interactions/favorite]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}
