/**
 * [POS] api/admin/audit/pending.ts
 *   所属：API 路由层 | 角色：获取待审核内容
 *
 * [METHODS]
 *   - GET → 获取待审核问题/回答/评论列表
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../../src/lib/prisma'
import { requireAuth, requireRole } from '../../_lib/auth'

async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ code: 405, message: '方法不允许' })
  }

  try {
    const { type = 'question', page = '1', limit = '20' } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    let data: any[] = []
    let total = 0

    if (type === 'question') {
      ;[data, total] = await Promise.all([
        prisma.question.findMany({
          where: { status: 'pending' },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit)
        }),
        prisma.question.count({ where: { status: 'pending' } })
      ])
    } else if (type === 'answer') {
      ;[data, total] = await Promise.all([
        prisma.answer.findMany({
          where: { status: 'pending', deletedAt: null },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit)
        }),
        prisma.answer.count({ where: { status: 'pending', deletedAt: null } })
      ])
    } else if (type === 'comment') {
      ;[data, total] = await Promise.all([
        prisma.comment.findMany({
          where: { status: 'pending', deletedAt: null },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit)
        }),
        prisma.comment.count({ where: { status: 'pending', deletedAt: null } })
      ])
    }

    return res.json({
      code: 200,
      data: {
        list: data,
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
    console.error('[API /admin/audit/pending]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}

// 仅管理员/教师可访问
export default requireAuth(requireRole(['admin', 'teacher'])(handler))
