/**
 * [POS] api/admin/index.ts
 *   所属：API 路由层 | 角色：管理员入口
 *   [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [METHODS]
 *   - GET  /admin/audit/pending   → 获取待审核列表
 *   - POST /admin/audit/approve   → 审核通过
 *   - POST /admin/audit/reject    → 审核拒绝
 *   - POST /admin/audit/ban       → 封禁内容
 *   - GET  /admin/stats           → 获取统计数据
 *   - GET  /admin/whitelist       → 获取白名单
 *   - POST /admin/whitelist       → 添加白名单
 *   - POST /admin/whitelist/delete→ 删除白名单
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

// === 内联 Prisma 客户端 ===
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
      return res.status(401).json({ code: 401, message: '未登录或token已过期', timestamp: Date.now() })
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

async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = Math.random().toString(36).substring(7)
  const startTime = Date.now()
  
  try {
    console.log(`[Admin:${requestId}] Request received:`, {
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
      console.log(`[Admin:${requestId}] OPTIONS request handled`)
      return res.status(200).end()
    }

    const urlAction = req.url?.split('?')[0].split('/api/admin/')[1]
    const action = req.query.action || urlAction
    console.log(`[Admin:${requestId}] Processing action:`, { action, method: req.method })

    // Audit
    if (action === 'audit') {
      const { subaction } = req.query
      console.log(`[Admin:${requestId}] Audit subaction:`, { subaction })
      
      if (req.method === 'GET' && subaction === 'pending') {
        return requireAuth(requireRole(['admin', 'teacher'])(handleAuditPending))(req, res)
      }
      if (req.method === 'POST' && subaction === 'approve') {
        return requireAuth(requireRole(['admin', 'teacher'])(handleAuditApprove))(req, res)
      }
      if (req.method === 'POST' && subaction === 'reject') {
        return requireAuth(requireRole(['admin', 'teacher'])(handleAuditReject))(req, res)
      }
      if (req.method === 'POST' && subaction === 'ban') {
        return requireAuth(requireRole(['admin', 'teacher'])(handleAuditBan))(req, res)
      }
    }

    // Stats
    if (action === 'stats' && req.method === 'GET') {
      console.log(`[Admin:${requestId}] Getting stats`)
      return requireAuth(requireRole(['admin', 'teacher'])(handleStats))(req, res)
    }

    // Whitelist
    if (action === 'whitelist') {
      const { subaction } = req.query
      console.log(`[Admin:${requestId}] Whitelist subaction:`, { subaction, method: req.method })
      
      if (req.method === 'GET') {
        return requireAuth(requireRole(['admin'])(handleWhitelistList))(req, res)
      }
      if (req.method === 'POST' && subaction === 'delete') {
        return requireAuth(requireRole(['admin'])(handleWhitelistDelete))(req, res)
      }
      if (req.method === 'POST') {
        return requireAuth(requireRole(['admin'])(handleWhitelistAdd))(req, res)
      }
    }

    const duration = Date.now() - startTime
    console.log(`[Admin:${requestId}] Invalid action:`, { action, method: req.method, duration: `${duration}ms` })
    return res.status(400).json({ code: 400, message: '无效的操作类型', timestamp: Date.now() })
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`[Admin:${requestId}] ERROR:`, {
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

// GET /admin/audit/pending
async function handleAuditPending(req: VercelRequest, res: VercelResponse) {
  try {
    const { type = 'question', page = '1', limit = '20' } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    let data: any[] = [], total = 0

    if (type === 'question') {
      ;[data, total] = await Promise.all([
        prisma.question.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
        prisma.question.count({ where: { status: 'pending' } })
      ])
    } else if (type === 'answer') {
      ;[data, total] = await Promise.all([
        prisma.answer.findMany({ where: { status: 'pending', deletedAt: null }, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
        prisma.answer.count({ where: { status: 'pending', deletedAt: null } })
      ])
    } else if (type === 'comment') {
      ;[data, total] = await Promise.all([
        prisma.comment.findMany({ where: { status: 'pending', deletedAt: null }, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
        prisma.comment.count({ where: { status: 'pending', deletedAt: null } })
      ])
    }

    return res.json({
      code: 200, data: { list: data, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } },
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('[Admin Audit Pending]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

// POST /admin/audit/approve
async function handleAuditApprove(req: any, res: VercelResponse) {
  try {
    const { id, type, isGoodQuestion, score, tags, difficulty } = req.body
    const auditorId = (req as any).user?.id as string

    if (!id || !type) {
      return res.status(400).json({ code: 400, message: '内容ID和类型为必填项', timestamp: Date.now() })
    }

    if (type === 'question') {
      await prisma.question.update({
        where: { id },
        data: { status: 'approved', isGoodQuestion: isGoodQuestion || false, score, tags, difficulty }
      })
    } else if (type === 'answer') {
      await prisma.answer.update({ where: { id }, data: { status: 'approved' } })
    } else if (type === 'comment') {
      await prisma.comment.update({ where: { id }, data: { status: 'approved' } })
    }

    await prisma.auditLog.create({ data: { auditorId, targetType: type, targetId: id, action: 'approve' } })

    return res.json({ code: 200, data: { id, type, status: 'approved' }, message: '审核通过', timestamp: Date.now() })
  } catch (error: any) {
    console.error('[Admin Audit Approve]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

// POST /admin/audit/reject
async function handleAuditReject(req: any, res: VercelResponse) {
  try {
    const { id, type, reason } = req.body
    const auditorId = (req as any).user?.id as string

    if (!id || !type) {
      return res.status(400).json({ code: 400, message: '内容ID和类型为必填项', timestamp: Date.now() })
    }

    if (type === 'question') {
      await prisma.question.update({ where: { id }, data: { status: 'rejected' } })
    } else if (type === 'answer') {
      await prisma.answer.update({ where: { id }, data: { status: 'rejected' } })
    } else if (type === 'comment') {
      await prisma.comment.update({ where: { id }, data: { status: 'rejected' } })
    }

    await prisma.auditLog.create({ data: { auditorId, targetType: type, targetId: id, action: 'reject', reason } })

    return res.json({ code: 200, data: { id, type, status: 'rejected' }, message: '已拒绝', timestamp: Date.now() })
  } catch (error: any) {
    console.error('[Admin Audit Reject]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

// POST /admin/audit/ban
async function handleAuditBan(req: any, res: VercelResponse) {
  try {
    const { id, type, reason } = req.body
    const auditorId = (req as any).user?.id as string
    const now = new Date()

    if (!id || !type) {
      return res.status(400).json({ code: 400, message: '内容ID和类型为必填项', timestamp: Date.now() })
    }

    if (type === 'question') {
      await prisma.question.update({ where: { id }, data: { status: 'rejected' } })
    } else if (type === 'answer') {
      const answer = await prisma.answer.findUnique({ where: { id } })
      await prisma.answer.update({ where: { id }, data: { status: 'rejected', deletedAt: now } })
      if (answer) await prisma.question.update({ where: { id: answer.questionId }, data: { answers: { decrement: 1 } } })
    } else if (type === 'comment') {
      const comment = await prisma.comment.findUnique({ where: { id } })
      await prisma.comment.update({ where: { id }, data: { status: 'rejected', deletedAt: now } })
      if (comment) await prisma.question.update({ where: { id: comment.questionId }, data: { comments: { decrement: 1 } } })
    }

    await prisma.auditLog.create({ data: { auditorId, targetType: type, targetId: id, action: 'ban', reason } })

    return res.json({ code: 200, data: { id, type, status: 'banned' }, message: '已封禁', timestamp: Date.now() })
  } catch (error: any) {
    console.error('[Admin Audit Ban]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

// GET /admin/stats
async function handleStats(req: VercelRequest, res: VercelResponse) {
  try {
    const [
      totalUsers, newUsersToday, usersByRole,
      totalQuestions, pendingQuestions, approvedQuestions, rejectedQuestions, questionsToday,
      totalAnswers, pendingAnswers, answersToday,
      totalComments, pendingComments,
      totalWhitelist, registeredWhitelist
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
      prisma.question.count(), prisma.question.count({ where: { status: 'pending' } }),
      prisma.question.count({ where: { status: 'approved' } }), prisma.question.count({ where: { status: 'rejected' } }),
      prisma.question.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      prisma.answer.count({ where: { deletedAt: null } }), prisma.answer.count({ where: { status: 'pending', deletedAt: null } }),
      prisma.answer.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, deletedAt: null } }),
      prisma.comment.count({ where: { deletedAt: null } }), prisma.comment.count({ where: { status: 'pending', deletedAt: null } }),
      prisma.userWhitelist.count({ where: { deletedAt: null } }), prisma.userWhitelist.count({ where: { isRegistered: true, deletedAt: null } })
    ])

    return res.json({
      code: 200,
      data: {
        users: { total: totalUsers, newToday: newUsersToday, byRole: usersByRole.reduce((acc: any, item: any) => ({ ...acc, [item.role]: item._count.id }), {}) },
        questions: { total: totalQuestions, pending: pendingQuestions, approved: approvedQuestions, rejected: rejectedQuestions, today: questionsToday },
        answers: { total: totalAnswers, pending: pendingAnswers, today: answersToday },
        comments: { total: totalComments, pending: pendingComments },
        whitelist: { total: totalWhitelist, registered: registeredWhitelist, pending: totalWhitelist - registeredWhitelist }
      },
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('[Admin Stats]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

// GET /admin/whitelist
async function handleWhitelistList(req: VercelRequest, res: VercelResponse) {
  try {
    const { role, isRegistered, page = '1', limit = '20', search } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { deletedAt: null }

    if (role) where.role = role as string
    if (isRegistered !== undefined) where.isRegistered = isRegistered === 'true'
    if (search) where.OR = [{ phone: { contains: search as string } }, { name: { contains: search as string } }]

    const [list, total] = await Promise.all([
      prisma.userWhitelist.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit),
        include: { user: { select: { id: true, nickname: true, avatar: true, createdAt: true } } }
      }),
      prisma.userWhitelist.count({ where })
    ])

    return res.json({
      code: 200, data: { list, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } },
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('[Admin Whitelist List]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

// POST /admin/whitelist
async function handleWhitelistAdd(req: VercelRequest, res: VercelResponse) {
  try {
    const { phone, name, role, grade, validUntil, notes } = req.body

    if (!phone || !name || !role) {
      return res.status(400).json({ code: 400, message: '手机号、姓名和角色为必填项', timestamp: Date.now() })
    }

    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ code: 400, message: '手机号格式不正确', timestamp: Date.now() })
    }

    const existing = await prisma.userWhitelist.findUnique({ where: { phone } })
    if (existing && !existing.deletedAt) {
      return res.status(409).json({ code: 409, message: '该手机号已在白名单中', timestamp: Date.now() })
    }

    if (existing && existing.deletedAt) {
      const updated = await prisma.userWhitelist.update({
        where: { id: existing.id },
        data: { name, role, grade, validUntil: validUntil ? new Date(validUntil) : null, notes, deletedAt: null, deletedBy: null, updatedAt: new Date() }
      })
      return res.status(200).json({ code: 200, data: updated, message: '白名单用户已恢复并更新', timestamp: Date.now() })
    }

    const whitelist = await prisma.userWhitelist.create({
      data: { phone, name, role, grade, validUntil: validUntil ? new Date(validUntil) : null, notes, isRegistered: false }
    })

    return res.status(201).json({ code: 201, data: whitelist, message: '白名单用户添加成功', timestamp: Date.now() })
  } catch (error: any) {
    console.error('[Admin Whitelist Add]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

// POST /admin/whitelist/delete
async function handleWhitelistDelete(req: any, res: VercelResponse) {
  try {
    const { id } = req.body
    const adminId = (req as any).user?.id as string

    if (!id) {
      return res.status(400).json({ code: 400, message: '白名单ID为必填项', timestamp: Date.now() })
    }

    const whitelist = await prisma.userWhitelist.findUnique({ where: { id } })
    if (!whitelist || whitelist.deletedAt) {
      return res.status(404).json({ code: 404, message: '白名单用户不存在或已被删除', timestamp: Date.now() })
    }

    await prisma.userWhitelist.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: adminId } })

    return res.json({ code: 200, message: '白名单用户已删除', timestamp: Date.now() })
  } catch (error: any) {
    console.error('[Admin Whitelist Delete]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

export default handler
