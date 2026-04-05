/**
 * [POS] api/interactions/like.ts
 *   所属：API 路由层 | 角色：点赞/取消点赞
 *
 * [METHODS]
 *   - POST → 点赞
 *   - DELETE → 取消点赞
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'
import { requireAuth, getCurrentUser } from '../_lib/auth'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS')
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

    const { targetType, targetId } = req.body

    if (!targetType || !targetId) {
      return res.status(400).json({
        code: 400,
        message: '目标类型和ID不能为空',
        timestamp: Date.now()
      })
    }

    if (req.method === 'POST') {
      // 检查是否已点赞
      const existing = await prisma.like.findUnique({
        where: {
          userId_targetType_targetId: {
            userId: user.id,
            targetType,
            targetId
          }
        }
      })

      if (existing) {
        return res.status(409).json({
          code: 409,
          message: '已点赞',
          timestamp: Date.now()
        })
      }

      // 创建点赞
      await prisma.like.create({
        data: {
          userId: user.id,
          targetType,
          targetId
        }
      })

      // 更新点赞数
      if (targetType === 'question') {
        await prisma.question.update({
          where: { id: targetId },
          data: { likes: { increment: 1 } }
        })
      } else if (targetType === 'answer') {
        await prisma.answer.update({
          where: { id: targetId },
          data: { likes: { increment: 1 } }
        })
      }

      return res.json({
        code: 200,
        message: '点赞成功',
        timestamp: Date.now()
      })
    }

    if (req.method === 'DELETE') {
      // 删除点赞
      await prisma.like.delete({
        where: {
          userId_targetType_targetId: {
            userId: user.id,
            targetType,
            targetId
          }
        }
      })

      // 更新点赞数
      if (targetType === 'question') {
        await prisma.question.update({
          where: { id: targetId },
          data: { likes: { decrement: 1 } }
        })
      } else if (targetType === 'answer') {
        await prisma.answer.update({
          where: { id: targetId },
          data: { likes: { decrement: 1 } }
        })
      }

      return res.json({
        code: 200,
        message: '取消点赞成功',
        timestamp: Date.now()
      })
    }

    return res.status(405).json({
      code: 405,
      message: '方法不允许',
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[API /interactions/like]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}
