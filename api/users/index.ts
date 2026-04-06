/**
 * [POS] api/users/index.ts
 *   所属：API 路由层 | 角色：用户管理入口
 *   [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [METHODS]
 *   - GET  /users/me       → 获取当前用户信息
 *   - GET  /users/profile  → 获取用户详细资料
 *   - PUT  /users/profile  → 更新用户资料
 *   - GET  /users/likes    → 获取用户点赞列表
 *   - GET  /users/list     → 获取用户列表（管理员）
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import * as jwt from 'jsonwebtoken'

// === 内联 Prisma 客户端 ===
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
  if (!authHeader?.startsWith('Bearer ')) return null
  return verifyToken(authHeader.slice(7))
}

function requireAuth(handler: Function) {
  return async (req: VercelRequest, res: any) => {
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({ code: 401, message: '未登录或token已过期', timestamp: Date.now() })
    }
    ;(req as AuthenticatedRequest).user = user
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

async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = Math.random().toString(36).substring(7)
  const startTime = Date.now()
  
  try {
    console.log(`[Users:${requestId}] Request received:`, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query,
      url: req.url
    })

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-request-id')

    if (req.method === 'OPTIONS') {
      console.log(`[Users:${requestId}] OPTIONS request handled`)
      return res.status(200).end()
    }

    const urlAction = req.url?.split('?')[0].split('/api/users/')[1]
    const action = req.query.action || urlAction
    console.log(`[Users:${requestId}] Processing action:`, { action, method: req.method })

    // GET /users/me
    if (action === 'me' && req.method === 'GET') {
      return requireAuth(handleMe)(req, res)
    }

    // GET /users/profile
    if (action === 'profile' && req.method === 'GET') {
      return requireAuth(handleGetProfile)(req, res)
    }

    // GET /users/likes
    if (action === 'likes' && req.method === 'GET') {
      return requireAuth(handleLikes)(req, res)
    }

    // GET /users/list
    if (action === 'list' && req.method === 'GET') {
      return requireAuth(requireRole(['admin'])(handleList))(req, res)
    }

    const duration = Date.now() - startTime
    console.log(`[Users:${requestId}] Invalid action:`, { action, method: req.method, duration: `${duration}ms` })
    return res.status(400).json({ code: 400, message: '无效的操作类型', timestamp: Date.now() })
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`[Users:${requestId}] ERROR:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      duration: `${duration}ms`
    })
    return res.status(500).json({ 
      code: 500, 
      message: '服务器内部错误: ' + (error.message || 'Unknown'), 
      error: error.message, 
      timestamp: Date.now() 
    })
  }
}

// GET /users/me
async function handleMe(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const userId = req.user?.id as string
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, phone: true, nickname: true, name: true,
        avatar: true, role: true, grade: true, school: true
      }
    })

    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在', timestamp: Date.now() })
    }

    return res.json({ code: 200, data: user, timestamp: Date.now() })
  } catch (error: any) {
    console.error('[Users Me]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

// GET /users/profile
async function handleGetProfile(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const userId = req.user?.id as string
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, phone: true, name: true, nickname: true, avatar: true,
        role: true, grade: true, age: true, school: true,
        expiresAt: true, createdAt: true, isActive: true
      }
    })

    if (!user) {
      return res.status(404).json({ code: 404, message: '用户不存在', timestamp: Date.now() })
    }

    const [questionCount, answerCount, favoriteCount] = await Promise.all([
      prisma.question.count({ where: { authorId: userId } }),
      prisma.answer.count({ where: { authorId: userId } }),
      prisma.favorite.count({ where: { userId } })
    ])

    return res.json({
      code: 200,
      data: { ...user, stats: { questionCount, answerCount, favoriteCount } },
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('[Users Profile GET]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

// PUT /users/profile
async function handleUpdateProfile(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const userId = req.user?.id as string
    const { nickname, avatar, grade, age, school, name } = req.body

    const updateData: any = {}
    if (nickname !== undefined) updateData.nickname = nickname
    if (avatar !== undefined) updateData.avatar = avatar
    if (grade !== undefined) updateData.grade = grade
    if (age !== undefined) updateData.age = age
    if (school !== undefined) updateData.school = school
    if (name !== undefined) updateData.name = name

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ code: 400, message: '没有要更新的字段', timestamp: Date.now() })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true, phone: true, name: true, nickname: true, avatar: true,
        role: true, grade: true, age: true, school: true, updatedAt: true
      }
    })

    return res.json({ code: 200, data: user, message: '资料更新成功', timestamp: Date.now() })
  } catch (error: any) {
    console.error('[Users Profile PUT]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

// GET /users/likes
async function handleLikes(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const userId = req.user?.id as string
    const { page = '1', limit = '20' } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const [likes, total] = await Promise.all([
      prisma.like.findMany({
        where: { userId, targetType: 'question' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.like.count({ where: { userId, targetType: 'question' } })
    ])

    // 手动查询关联的问题
    const questionIds = likes.map((l: any) => l.targetId)
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } }
    })
    const questionMap = new Map(questions.map((q: any) => [q.id, q]))

    const validLikes = likes.filter((like: any) => questionMap.has(like.targetId))

    return res.json({
      code: 200,
      data: {
        list: validLikes.map((like: any) => ({
          ...(questionMap.get(like.targetId) as any),
          likedAt: like.createdAt
        })),
        pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
      },
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('[Users Likes]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

// GET /users/list
async function handleList(req: VercelRequest, res: VercelResponse) {
  try {
    const { role, isActive, isBanned, search, page = '1', limit = '20' } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where: any = {}
    if (role) where.role = role as string
    if (isActive !== undefined) where.isActive = isActive === 'true'
    if (isBanned !== undefined) where.isBanned = isBanned === 'true'
    if (search) {
      where.OR = [
        { phone: { contains: search as string } },
        { name: { contains: search as string } },
        { nickname: { contains: search as string } }
      ]
    }

    const [list, total] = await Promise.all([
      prisma.user.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit),
        select: {
          id: true, phone: true, name: true, nickname: true, avatar: true,
          role: true, grade: true, school: true, isActive: true, isBanned: true,
          createdAt: true, updatedAt: true,
          whitelist: { select: { validUntil: true, isRegistered: true } },
          _count: { select: { children: true, parents: true } }
        }
      }),
      prisma.user.count({ where })
    ])

    return res.json({
      code: 200,
      data: { list, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } },
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('[Users List]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

export default handler
