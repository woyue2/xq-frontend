/**
 * [POS] api/questions/delete.ts
 *   所属：API 路由层 | 角色：删除问题（软删除）
 *   [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [METHODS]
 *   - POST → 软删除问题（作者或管理员）
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'
import { requireAuth } from '../_lib/auth'

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
    const { id } = req.body
    const userId = req.user?.id
    const userRole = req.user?.role

    if (!id) {
      return res.status(400).json({
        code: 400,
        message: '问题ID为必填项',
        timestamp: Date.now()
      })
    }

    // 查询问题
    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        answerList: { where: { deletedAt: null } },
        commentList: { where: { deletedAt: null } }
      }
    })

    if (!question) {
      return res.status(404).json({
        code: 404,
        message: '问题不存在',
        timestamp: Date.now()
      })
    }

    // 权限检查：只有作者或管理员可以删除
    if (question.authorId !== userId && userRole !== 'admin') {
      return res.status(403).json({
        code: 403,
        message: '无权删除此问题',
        timestamp: Date.now()
      })
    }

    // 软删除问题及相关内容
    await prisma.$transaction(async (tx) => {
      // 软删除所有回答
      if (question.answerList.length > 0) {
        await tx.answer.updateMany({
          where: { questionId: id },
          data: { deletedAt: new Date() }
        })
      }

      // 软删除所有评论
      if (question.commentList.length > 0) {
        await tx.comment.updateMany({
          where: { questionId: id },
          data: { deletedAt: new Date() }
        })
      }

      // 软删除问题（标记为 rejected 状态）
      await tx.question.update({
        where: { id },
        data: { status: 'rejected' }
      })
    })

    return res.json({
      code: 200,
      message: '问题已删除',
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[API /questions/delete]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}

export default requireAuth(handler)
