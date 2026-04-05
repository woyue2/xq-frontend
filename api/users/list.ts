/**
 * [POS] api/users/list.ts
 *   所属：API 路由层 | 角色：用户列表查询（管理员）
 *   [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [METHODS]
 *   - GET → 获取用户列表（支持筛选和分页）
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'
import { requireAuth, requireRole } from '../_lib/auth'

async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      code: 405,
      message: '方法不允许',
      timestamp: Date.now()
    })
  }

  try {
    const {
      role,
      isActive,
      isBanned,
      search,
      page = '1',
      limit = '20'
    } = req.query

    const skip = (Number(page) - 1) * Number(limit)

    // 构建查询条件
    const where: any = {}

    if (role) {
      where.role = role as string
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    if (isBanned !== undefined) {
      where.isBanned = isBanned === 'true'
    }

    if (search) {
      where.OR = [
        { phone: { contains: search as string } },
        { name: { contains: search as string } },
        { nickname: { contains: search as string } }
      ]
    }

    const [list, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        select: {
          id: true,
          phone: true,
          name: true,
          nickname: true,
          avatar: true,
          role: true,
          grade: true,
          school: true,
          isActive: true,
          isBanned: true,
          createdAt: true,
          updatedAt: true,
          whitelist: {
            select: {
              validUntil: true,
              isRegistered: true
            }
          },
          _count: {
            select: {
              children: true,
              parents: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ])

    return res.json({
      code: 200,
      data: {
        list,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      },
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[API /users/list]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}

// 仅管理员可访问
export default requireAuth(requireRole(['admin'])(handler))
