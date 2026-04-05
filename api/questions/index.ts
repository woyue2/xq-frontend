/**
 * [POS] api/questions/index.ts
 *   所属：API 路由层 | 角色：问题管理入口
 *   [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [METHODS]
 *   - GET  /questions      → 获取问题列表
 *   - POST /questions      → 创建问题
 *   - GET  /questions/detail?id=xxx → 获取问题详情
 *   - POST /questions/delete → 删除问题
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../_lib/prisma'
import { requireAuth, getCurrentUser, AuthenticatedRequest } from '../_lib/auth'

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

    // 检查 action 参数
    const { action } = req.query
    
    if (action === 'detail' && req.method === 'GET') {
      return handleDetail(req, res)
    }
    
    if (action === 'delete' && req.method === 'POST') {
      return requireAuth(handleDelete)(req, res)
    }

    return res.status(405).json({
      code: 405,
      message: '方法不允许',
      timestamp: Date.now()
    })

  } catch (error: any) {
    console.error('[API /questions]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误: ' + (error.message || 'Unknown error'),
      timestamp: Date.now()
    })
  }
}

// GET /questions/detail
async function handleDetail(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ code: 400, message: '问题ID为必填项', timestamp: Date.now() })
    }

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        answerList: { where: { deletedAt: null } },
        commentList: { where: { deletedAt: null } }
      }
    })

    if (!question) {
      return res.status(404).json({ code: 404, message: '问题不存在', timestamp: Date.now() })
    }

    return res.json({ code: 200, data: question, timestamp: Date.now() })
  } catch (error: any) {
    console.error('[Questions Detail]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

// POST /questions/delete
async function handleDelete(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { id } = req.body
    const userId = req.user?.id as string
    const userRole = req.user?.role as string

    if (!id) {
      return res.status(400).json({ code: 400, message: '问题ID为必填项', timestamp: Date.now() })
    }

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        answerList: { where: { deletedAt: null } },
        commentList: { where: { deletedAt: null } }
      }
    })

    if (!question) {
      return res.status(404).json({ code: 404, message: '问题不存在', timestamp: Date.now() })
    }

    if (question.authorId !== userId && userRole !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权删除此问题', timestamp: Date.now() })
    }

    await prisma.$transaction(async (tx: any) => {
      if (question.answerList.length > 0) {
        await tx.answer.updateMany({ where: { questionId: id }, data: { deletedAt: new Date() } })
      }
      if (question.commentList.length > 0) {
        await tx.comment.updateMany({ where: { questionId: id }, data: { deletedAt: new Date() } })
      }
      await tx.question.update({ where: { id }, data: { status: 'rejected' } })
    })

    return res.json({ code: 200, message: '问题已删除', timestamp: Date.now() })
  } catch (error: any) {
    console.error('[Questions Delete]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}
