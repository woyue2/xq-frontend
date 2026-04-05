/**
 * [POS] api/users/likes.ts
 *   所属：API 路由层 | 角色：获取用户点赞的问题列表
 *   [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [METHODS]
 *   - GET → 获取当前用户点赞的问题列表
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'
import { requireAuth } from '../_lib/auth'

async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      code: 405,
      message: '方法不允许',
      timestamp: Date.now()
    })
  }

  try {
    const userId = req.user?.id
    const { page = '1', limit = '20' } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    // 获取用户点赞的问题ID列表
    const [likes, total] = await Promise.all([
      prisma.like.findMany({
        where: {
          userId,
          targetType: 'question'
        },
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
              tags: true,
              images: true,
              difficulty: true,
              status: true,
              isGoodQuestion: true,
              isPinned: true,
              likes: true,
              favorites: true,
              comments: true,
              answers: true,
              authorId: true,
              authorName: true,
              authorAvatar: true,
              createdAt: true
            }
          }
        }
      }),
      prisma.like.count({
        where: {
          userId,
          targetType: 'question'
        }
      })
    ])

    // 过滤掉可能已被删除的问题
    const validLikes = likes.filter(like => like.question !== null)

    return res.json({
      code: 200,
      data: {
        list: validLikes.map(like => ({
          ...like.question,
          likedAt: like.createdAt
        })),
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
    console.error('[API /users/likes]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}

export default requireAuth(handler)
