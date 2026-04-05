/**
 * [POS] api/questions/index.ts
 *   所属：API 路由层 | 角色：问题列表/创建 API
 *
 * [METHODS]
 *   - GET  → 获取问题列表
 *   - POST → 创建问题
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'
import { requireAuth, getCurrentUser } from '../_lib/auth'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (req.method === 'GET') {
      const { subject, status = 'approved', page = '1', limit = '20' } = req.query

      const where: any = { status: String(status) }
      if (subject) {
        where.subject = String(subject)
      }

      const skip = (Number(page) - 1) * Number(limit)

      const [questions, total] = await Promise.all([
        prisma.question.findMany({
          where,
          orderBy: [
            { isPinned: 'desc' },
            { createdAt: 'desc' }
          ],
          skip,
          take: Number(limit),
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
            createdAt: true,
            updatedAt: true
          }
        }),
        prisma.question.count({ where })
      ])

      return res.json({
        code: 200,
        data: {
          list: questions,
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

      const { title, content, subject, tags, images, difficulty } = req.body

      if (!title) {
        return res.status(400).json({
          code: 400,
          message: '标题不能为空',
          timestamp: Date.now()
        })
      }

      const question = await prisma.question.create({
        data: {
          title,
          content,
          subject,
          tags: tags || [],
          images: images || [],
          difficulty,
          authorId: user.id,
          authorName: user.nickname,
          authorAvatar: null,
          status: 'pending' // 默认待审核
        }
      })

      // TODO: 触发 AI 审核

      return res.status(201).json({
        code: 201,
        data: question,
        message: '问题创建成功，等待审核',
        timestamp: Date.now()
      })
    }

    return res.status(405).json({
      code: 405,
      message: '方法不允许',
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[API /questions]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}
