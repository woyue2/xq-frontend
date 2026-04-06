/**
 * [POS] api/questions/index.ts
 *   所属：API 路由�?| 角色：问题管理入�?
 *   [PROTOCOL]: 变更时更新此头部，然后检�?CLAUDE.md
 *
 * [METHODS]
 *   - GET  /questions      �?获取问题列表
 *   - POST /questions      �?创建问题
 *   - GET  /questions/detail?id=xxx �?获取问题详情
 *   - POST /questions/delete �?删除问题
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

// === 内联 Prisma 客户�?===
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma = globalForPrisma.prisma ?? new PrismaClient()

// === 内联 Auth 工具 ===
const JWT_SECRET = process.env.JWT_SECRET!

export interface AuthUser {
  id: string
  phone: string
  role: string
  nickname: string
}

export interface AuthenticatedRequest extends VercelRequest {
  user?: AuthUser
}

async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded
  } catch {
    return null
  }
}

async function getCurrentUser(req: VercelRequest): Promise<AuthUser | null> {
  const authHeader = req.headers?.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.slice(7)
  return verifyToken(token)
}

function requireAuth(handler: Function) {
  return async (req: VercelRequest, res: any) => {
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '未登录或token已过�?,
        timestamp: Date.now()
      })
    }
    ;(req as AuthenticatedRequest).user = user
    return handler(req, res)
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const requestId = Math.random().toString(36).substring(7)
  const startTime = Date.now()
  
  try {
    console.log(`[Questions:${requestId}] Request received:`, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query,
      url: req.url
    })
  
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-request-id')

    if (req.method === 'OPTIONS') {
      console.log(`[Questions:${requestId}] OPTIONS request handled`)
      return res.status(200).end()
    }

    // GET /questions - 获取问题列表
    if (req.method === 'GET' && !req.query.action) {
      console.log(`[Questions:${requestId}] Getting questions list...`)
      const { subject, status = 'approved', page = '1', limit = '20' } = req.query

      const where: any = { status: String(status) }
      if (subject) {
        where.subject = String(subject)
      }

      const skip = (Number(page) - 1) * Number(limit)
      const take = Number(limit)

      console.log(`[Questions:${requestId}] Query params:`, { page, limit, subject, skip, take })

      const [questions, total] = await Promise.all([
        prisma.question.findMany({
          where,
          orderBy: [
            { isPinned: 'desc' },
            { createdAt: 'desc' }
          ],
          skip,
          take,
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

      const duration = Date.now() - startTime
      console.log(`[Questions:${requestId}] Success:`, { 
        count: questions.length, 
        total, 
        subject, 
        duration: `${duration}ms` 
      })

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

    // POST /questions - 创建问题
    if (req.method === 'POST' && !req.query.action) {
      return requireAuth(async (req: AuthenticatedRequest, res: VercelResponse) => {
        try {
          const { title, content, subject, tags, images, difficulty } = req.body
          const userId = req.user?.id as string

          console.log(`[Questions:${requestId}] Creating question:`, { 
            title, subject, difficulty, userId 
          })

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
              authorId: userId,
              authorName: req.user?.nickname || '',
              authorAvatar: null,
              status: 'pending' // 默认待审�?
            }
          })

          const duration = Date.now() - startTime
          console.log(`[Questions:${requestId}] Question created:`, { 
            questionId: question.id, 
            duration: `${duration}ms` 
          })

          return res.status(201).json({
            code: 201,
            data: question,
            message: '问题创建成功，等待审�?,
            timestamp: Date.now()
          })
        } catch (createError: any) {
          console.error(`[Questions:${requestId}] Create ERROR:`, {
            message: createError.message,
            stack: createError.stack
          })
          return res.status(500).json({
            code: 500,
            message: '创建问题失败: ' + (createError.message || 'Unknown'),
            timestamp: Date.now()
          })
        }
      })(req, res)
    }

    // 检�?action 参数
    const { action } = req.query
    
    if (action === 'detail' && req.method === 'GET') {
      return handleDetail(req, res)
    }
    
    if (action === 'delete' && req.method === 'POST') {
      return requireAuth(handleDelete)(req, res)
    }

    return res.status(405).json({
      code: 405,
      message: '方法不允�?,
      timestamp: Date.now()
    })

  } catch (error: any) {
    console.error('[DEBUG] CATCH ERROR:', error)
    return res.status(500).json({
      code: 500,
      message: 'DEBUG ERROR: ' + (error.message || 'Unknown'),
      stack: error.stack,
      name: error.name,
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
      return res.status(404).json({ code: 404, message: '问题不存�?, timestamp: Date.now() })
    }

    return res.json({ code: 200, data: question, timestamp: Date.now() })
  } catch (error: any) {
    console.error('[Questions Detail]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错�? ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
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
      return res.status(404).json({ code: 404, message: '问题不存�?, timestamp: Date.now() })
    }

    if (question.authorId !== userId && userRole !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权删除此问�?, timestamp: Date.now() })
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

    return res.json({ code: 200, message: '问题已删�?, timestamp: Date.now() })
  } catch (error: any) {
    console.error('[Questions Delete]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错�? ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}
