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
import { prisma } from '../_lib/prisma'
import { requireAuth, requireRole } from '../_lib/auth'

async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { action } = req.query

  // GET /users/me
  if (action === 'me' && req.method === 'GET') {
    return requireAuth(handleMe)(req, res)
  }

  // GET /users/profile
  if (action === 'profile' && req.method === 'GET') {
    return requireAuth(handleGetProfile)(req, res)
  }

  // PUT /users/profile
  if (action === 'profile' && req.method === 'PUT') {
    return requireAuth(handleUpdateProfile)(req, res)
  }

  // GET /users/likes
  if (action === 'likes' && req.method === 'GET') {
    return requireAuth(handleLikes)(req, res)
  }

  // GET /users/list
  if (action === 'list' && req.method === 'GET') {
    return requireAuth(requireRole(['admin'])(handleList))(req, res)
  }

  return res.status(400).json({ code: 400, message: '无效的操作类型', timestamp: Date.now() })
}

// GET /users/me
async function handleMe(req: any, res: VercelResponse) {
  try {
    const userId = (req as any).user?.id as string
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
async function handleGetProfile(req: any, res: VercelResponse) {
  try {
    const userId = (req as any).user?.id as string
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
async function handleUpdateProfile(req: any, res: VercelResponse) {
  try {
    const userId = (req as any).user?.id as string
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
async function handleLikes(req: any, res: VercelResponse) {
  try {
    const userId = (req as any).user?.id as string
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
