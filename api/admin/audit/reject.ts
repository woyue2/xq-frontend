/**
 * [POS] api/admin/audit/reject.ts
 *   所属：API 路由层 | 角色：拒绝审核内容
 *   [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [METHODS]
 *   - POST → 拒绝问题/回答/评论
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
    return res.status(405).json({
      code: 405,
      message: '方法不允许',
      timestamp: Date.now()
    })
  }

  try {
    const { id, type, reason } = req.body
    const auditorId = req.user?.id

    if (!id || !type) {
      return res.status(400).json({
        code: 400,
        message: '内容ID和类型为必填项',
        timestamp: Date.now()
      })
    }

    // 根据类型更新对应表
    if (type === 'question') {
      const question = await prisma.question.findUnique({ where: { id } })
      if (!question) {
        return res.status(404).json({ code: 404, message: '问题不存在', timestamp: Date.now() })
      }
      await prisma.question.update({
        where: { id },
        data: { status: 'rejected' }
      })
    } else if (type === 'answer') {
      const answer = await prisma.answer.findUnique({ where: { id } })
      if (!answer || answer.deletedAt) {
        return res.status(404).json({ code: 404, message: '回答不存在', timestamp: Date.now() })
      }
      await prisma.answer.update({
        where: { id },
        data: { status: 'rejected' }
      })
    } else if (type === 'comment') {
      const comment = await prisma.comment.findUnique({ where: { id } })
      if (!comment || comment.deletedAt) {
        return res.status(404).json({ code: 404, message: '评论不存在', timestamp: Date.now() })
      }
      await prisma.comment.update({
        where: { id },
        data: { status: 'rejected' }
      })
    } else {
      return res.status(400).json({ code: 400, message: '无效的内容类型', timestamp: Date.now() })
    }

    // 记录审核日志
    await prisma.auditLog.create({
      data: {
        auditorId,
        targetType: type,
        targetId: id,
        action: 'reject',
        reason
      }
    })

    return res.json({
      code: 200,
      data: { id, type, status: 'rejected' },
      message: '已拒绝',
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[API /admin/audit/reject]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}

export default requireAuth(requireRole(['admin', 'teacher'])(handler))
