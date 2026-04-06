/**
 * [POS] api/comments/index.ts
 *   所属：API 路由�?| 角色：评论列�?创建
 *
 * [METHODS]
 *   - GET  �?获取问题评论列表
 *   - POST �?创建评论
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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const requestId = Math.random().toString(36).substring(7)
  const startTime = Date.now()
  
  try {
    console.log(`[Comments:${requestId}] Request received:`, {
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
      console.log(`[Comments:${requestId}] OPTIONS request handled`)
      return res.status(200).end()
    }

    if (req.method === 'GET') {
      const { questionId, page = '1', limit = '20' } = req.query
      console.log(`[Comments:${requestId}] Getting comments:`, { questionId, page, limit })

      if (!questionId) {
        console.log(`[Comments:${requestId}] Missing questionId`)
        return res.status(400).json({
          code: 400,
          message: '问题ID不能为空',
          timestamp: Date.now()
        })
      }

      const skip = (Number(page) - 1) * Number(limit)
      console.log(`[Comments:${requestId}] Querying comments for question:`, { questionId, skip, take: Number(limit) })

      const [comments, total] = await Promise.all([
        prisma.comment.findMany({
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
            image: true,
            authorId: true,
            authorName: true,
            authorAvatar: true,
            status: true,
            createdAt: true
          }
        }),
        prisma.comment.count({
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
          list: comments,
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

      const { questionId, content, image } = req.body

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

      // 创建评论
      const comment = await prisma.comment.create({
        data: {
          questionId,
          content,
          image,
          authorId: user.id,
          authorName: user.nickname,
          authorAvatar: null,
          status: 'pending' // 默认待审�?
        }
      })

      // 更新问题评论�?
      await prisma.question.update({
        where: { id: questionId },
        data: { comments: { increment: 1 } }
      })

      return res.status(201).json({
        code: 201,
        data: comment,
        message: '评论创建成功，等待审�?,
        timestamp: Date.now()
      })
    }

    return res.status(405).json({
      code: 405,
      message: '方法不允�?,
      timestamp: Date.now()
    })

  } catch (error: any) {
    console.error('[API /comments]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错�? ' + (error.message || 'Unknown'),
      error: error.message,
      timestamp: Date.now()
    })
  }
}
