/**
 * [POS] api/answers/index.ts
 *   所属：API 路由层 | 角色：回答列表/创建
 *
 * [METHODS]
 *   - GET  → 获取问题回答列表
 *   - POST → 创建回答（教师）
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'
import { requireAuth, requireRole, getCurrentUser } from '../_lib/auth'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (req.method === 'GET') {
      const { questionId, page = '1', limit = '20' } = req.query

      if (!questionId) {
        return res.status(400).json({
          code: 400,
          message: '问题ID不能为空',
          timestamp: Date.now()
        })
      }

      const skip = (Number(page) - 1) * Number(limit)

      const [answers, total] = await Promise.all([
        prisma.answer.findMany({
          where: {
            questionId: String(questionId),
            status: 'approved',
            deletedAt: null
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
          select: {
            id: true,
            content: true,
            images: true,
            audioUrl: true,
            authorId: true,
            authorName: true,
            authorAvatar: true,
            likes: true,
            status: true,
            createdAt: true
          }
        }),
        prisma.answer.count({
          where: {
            questionId: String(questionId),
            status: 'approved',
            deletedAt: null
          }
        })
      ])

      return res.json({
        code: 200,
        data: {
          list: answers,
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
      // 鉴权
      const user = await getCurrentUser(req)
      if (!user) {
        return res.status(401).json({
          code: 401,
          message: '未登录',
          timestamp: Date.now()
        })
      }

      // 仅教师可回答
      if (user.role !== 'teacher') {
        return res.status(403).json({
          code: 403,
          message: '只有教师可以回答',
          timestamp: Date.now()
        })
      }

      const { questionId, content, images, audioUrl } = req.body

      if (!questionId || !content) {
        return res.status(400).json({
          code: 400,
          message: '问题ID和内容不能为空',
          timestamp: Date.now()
        })
      }

      // 检查问题是否存在
      const question = await prisma.question.findUnique({
        where: { id: questionId }
      })

      if (!question) {
        return res.status(404).json({
          code: 404,
          message: '问题不存在',
          timestamp: Date.now()
        })
      }

      // 创建回答
      const answer = await prisma.answer.create({
        data: {
          questionId,
          content,
          images: images || [],
          audioUrl,
          authorId: user.id,
          authorName: user.nickname,
          authorAvatar: null,
          status: 'pending' // 默认待审核
        }
      })

      // 更新问题回答数
      await prisma.question.update({
        where: { id: questionId },
        data: { answers: { increment: 1 } }
      })

      return res.status(201).json({
        code: 201,
        data: answer,
        message: '回答创建成功，等待审核',
        timestamp: Date.now()
      })
    }

    return res.status(405).json({
      code: 405,
      message: '方法不允许',
      timestamp: Date.now()
    })

  } catch (error: any) {
    console.error('[API /answers]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误: ' + (error.message || 'Unknown'),
      error: error.message,
      timestamp: Date.now()
    })
  }
}
