/**
 * [POS] api/parent/index.ts
 *   所属：API 路由层 | 角色：家长管理
 *
 * [METHODS]
 *   - POST /parent/bind → 绑定孩子
 *   - GET /parent/children → 获取已绑定孩子列表
 *   - POST /parent/unbind → 解绑孩子
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

async function getCurrentUser(req: any): Promise<AuthUser | null> {
  const authHeader = req.headers?.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  return verifyToken(authHeader.slice(7))
}

function requireAuth(handler: Function) {
  return async (req: any, res: any) => {
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({ code: 401, message: '未登录或token已过期', timestamp: Date.now() })
    }
    return handler(req, res)
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { action } = req.query

  // POST /parent/bind
  if (action === 'bind' && req.method === 'POST') {
    return requireAuth(handleBind)(req, res)
  }

  // GET /parent/children
  if (action === 'children' && req.method === 'GET') {
    return requireAuth(handleGetChildren)(req, res)
  }

  // POST /parent/unbind
  if (action === 'unbind' && req.method === 'POST') {
    return requireAuth(handleUnbind)(req, res)
  }

  return res.status(400).json({ code: 400, message: '无效的操作类型', timestamp: Date.now() })
}

async function handleBind(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({ code: 401, message: '未登录', timestamp: Date.now() })
    }

    const { childId } = req.body

    if (!childId) {
      return res.status(400).json({ code: 400, message: '孩子ID为必填项', timestamp: Date.now() })
    }

    // 检查孩子是否存在
    const child = await prisma.user.findUnique({
      where: { id: childId, role: 'student' }
    })

    if (!child) {
      return res.status(404).json({ code: 404, message: '孩子不存在或不是学生角色', timestamp: Date.now() })
    }

    // 检查是否已绑定
    const existing = await prisma.parentChild.findUnique({
      where: {
        parentId_childId: {
          parentId: user.id,
          childId
        }
      }
    })

    if (existing) {
      return res.status(409).json({ code: 409, message: '已经绑定了该孩子', timestamp: Date.now() })
    }

    // 创建绑定关系
    const binding = await prisma.parentChild.create({
      data: {
        parentId: user.id,
        childId
      }
    })

    return res.status(201).json({
      code: 201,
      data: {
        id: binding.id,
        childId,
        child: {
          id: child.id,
          nickname: child.nickname,
          name: child.name,
          grade: child.grade
        }
      },
      message: '绑定成功',
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('[Parent Bind]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), timestamp: Date.now() })
  }
}

async function handleGetChildren(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({ code: 401, message: '未登录', timestamp: Date.now() })
    }

    const bindings = await prisma.parentChild.findMany({
      where: { parentId: user.id },
      include: {
        child: {
          select: {
            id: true,
            nickname: true,
            name: true,
            grade: true,
            school: true,
            avatar: true
          }
        }
      }
    })

    return res.json({
      code: 200,
      data: bindings.map(binding => ({
        id: binding.id,
        child: binding.child
      })),
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('[Parent GetChildren]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), timestamp: Date.now() })
  }
}

async function handleUnbind(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({ code: 401, message: '未登录', timestamp: Date.now() })
    }

    const { childId } = req.body

    if (!childId) {
      return res.status(400).json({ code: 400, message: '孩子ID为必填项', timestamp: Date.now() })
    }

    // 删除绑定关系
    const deleted = await prisma.parentChild.deleteMany({
      where: {
        parentId: user.id,
        childId
      }
    })

    if (deleted.count === 0) {
      return res.status(404).json({ code: 404, message: '未找到绑定关系', timestamp: Date.now() })
    }

    return res.json({
      code: 200,
      data: { success: true },
      message: '解绑成功',
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('[Parent Unbind]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), timestamp: Date.now() })
  }
}
