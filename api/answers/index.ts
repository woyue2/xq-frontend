/**
 * [POS] api/answers/index.ts
 *   所属：API 路由�?| 角色：回答列�?创建/详情
 *
 * [METHODS]
 *   - GET  �?获取问题回答列表 (questionId) �?回答详情 (id)
 *   - POST �?创建回答（教师）
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

async function getCurrentUser(req: VercelRequest): Promise<AuthUser | null> {
  const authHeader = req.headers?.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  return verifyToken(authHeader.slice(7))
}

function requireAuth(handler: Function) {
  return async (req: VercelRequest, res: any) => {
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({ code: 401, message: '未登录或token已过�?, timestamp: Date.now() })
    }
    ;(req as any).user = user
    return handler(req, res)
  }
}

function requireRole(roles: string[]) {
  return (handler: Function) => {
    return async (req: any, res: any) => {
      const user = req.user as AuthUser
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ code: 403, message: '权限不足', timestamp: Date.now() })
      }
      return handler(req, res)
    }
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const requestId = Math.random().toString(36).substring(7)
  const startTime = Date.now()
  
  try {
    console.log(`[Answers:${requestId}] Request received:`, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query,
      url: req.url
    })

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-request-id')

    if (req.method === 'OPTIONS') {
      console.log(`[Answers:${requestId}] OPTIONS request handled`)
      return res.status(200).end()
    }

    if (req.method === 'GET') {
      const { id, questionId, page = '1', limit = '20' } = req.query
      console.log(`[Answers:${requestId}] Getting answers:`, { id, questionId, page, limit })

      // 如果�?id 参数，返回回答详�?
      if (id) {
        console.log(`[Answers:${requestId}] Getting answer detail for id:`, id)
        const answer = await prisma.answer.findUnique({
          where: { 
            id: String(id),
            deletedAt: null
          },
          include: {
            question: {
              select: {
                id: true,
                title: true
              }
            }
          }
        })

        if (!answer) {
          console.log(`[Answers:${requestId}] Answer not found:`, { id })
          return res.status(404).json({
            code: 404,
            message: '回答不存�?,
            timestamp: Date.now()
          })
        }

        const duration = Date.now() - startTime
        console.log(`[Answers:${requestId}] Answer detail success:`, { answerId: answer.id, duration: `${duration}ms` })
        
        return res.json({
          code: 200,
          data: answer,
          timestamp: Date.now()
        })
      }

      if (!questionId) {
        console.log(`[Answers:${requestId}] Missing questionId`)
        return res.status(400).json({
          code: 400,
          message: '问题ID不能为空',
          timestamp: Date.now()
        })
      }

      const skip = (Number(page) - 1) * Number(limit)
      console.log(`[Answers:${requestId}] Querying answers for question:`, { questionId, skip, take: Number(limit) })

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
          message: '未登�?,
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
          message: '问题ID和内容不能为�?,
          timestamp: Date.now()
        })
      }

      // 检查问题是否存�?
      const question = await prisma.question.findUnique({
        where: { id: questionId }
      })

      if (!question) {
        return res.status(404).json({
          code: 404,
          message: '问题不存�?,
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
          status: 'pending' // 默认待审�?
        }
      })

      // 更新问题回答�?
      await prisma.question.update({
        where: { id: questionId },
        data: { answers: { increment: 1 } }
      })

      return res.status(201).json({
        code: 201,
        data: answer,
        message: '回答创建成功，等待审�?,
        timestamp: Date.now()
      })
    }

    return res.status(405).json({
      code: 405,
      message: '方法不允�?,
      timestamp: Date.now()
    })

  } catch (error: any) {
    console.error('[API /answers]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错�? ' + (error.message || 'Unknown'),
      error: error.message,
      timestamp: Date.now()
    })
  }
}
