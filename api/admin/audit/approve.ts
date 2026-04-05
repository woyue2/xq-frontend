/**
 * [POS] api/admin/audit/approve.ts
 *   所属：API 路由层 | 角色：审核通过
 *
 * [METHODS]
 *   - POST → 审核通过问题/回答/评论
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../../src/lib/prisma'
import { requireAuth, requireRole } from '../../_lib/auth'

async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ code: 405, message: '方法不允许' })
  }

  try {
    const { type, id } = req.body
    const auditorId = req.user.id

    if (!type || !id) {
      return res.status(400).json({
        code: 400,
        message: '类型和ID不能为空',
        timestamp: Date.now()
      })
    }

    // 审核通过
    if (type === 'question') {
      await prisma.question.update({
        where: { id },
        data: { status: 'approved' }
      })
    } else if (type === 'answer') {
      await prisma.answer.update({
        where: { id },
        data: { status: 'approved' }
      })
    } else if (type === 'comment') {
      await prisma.comment.update({
        where: { id },
        data: { status: 'approved' }
      })
    } else {
      return res.status(400).json({
        code: 400,
        message: '无效的类型',
        timestamp: Date.now()
      })
    }

    // 记录审核日志
    await prisma.auditLog.create({
      data: {
        auditorId,
        targetType: type,
        targetId: id,
        action: 'approve'
      }
    })

    return res.json({
      code: 200,
      message: '审核通过',
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[API /admin/audit/approve]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}

export default requireAuth(requireRole(['admin', 'teacher'])(handler))
