/**
 * [POS] api/admin/audit/ban.ts
 *   所属：API 路由层 | 角色：封禁违规内容
 *   [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [METHODS]
 *   - POST → 封禁问题/回答/评论（软删除+标记违规）
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

    const now = new Date()

    // 根据类型更新对应表（软删除）
    if (type === 'question') {
      const question = await prisma.question.findUnique({ where: { id } })
      if (!question) {
        return res.status(404).json({ code: 404, message: '问题不存在', timestamp: Date.now() })
      }
      // 问题不软删除，只改状态为 rejected
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
        data: { 
          status: 'rejected',
          deletedAt: now 
        }
      })
      // 更新问题回答数
      await prisma.question.update({
        where: { id: answer.questionId },
        data: { answers: { decrement: 1 } }
      })
    } else if (type === 'comment') {
      const comment = await prisma.comment.findUnique({ where: { id } })
      if (!comment || comment.deletedAt) {
        return res.status(404).json({ code: 404, message: '评论不存在', timestamp: Date.now() })
      }
      await prisma.comment.update({
        where: { id },
        data: { 
          status: 'rejected',
          deletedAt: now 
        }
      })
      // 更新问题评论数
      await prisma.question.update({
        where: { id: comment.questionId },
        data: { comments: { decrement: 1 } }
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
        action: 'ban',
        reason
      }
    })

    return res.json({
      code: 200,
      data: { id, type, status: 'banned' },
      message: '已封禁',
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[API /admin/audit/ban]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}

export default requireAuth(requireRole(['admin', 'teacher'])(handler))
