/**
 * [POS] api/admin/stats.ts
 *   所属：API 路由层 | 角色：管理员统计数据
 *   [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [METHODS]
 *   - GET → 获取管理员仪表盘统计数据
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
    // 并行获取各项统计数据
    const [
      // 用户统计
      totalUsers,
      newUsersToday,
      usersByRole,
      
      // 问题统计
      totalQuestions,
      pendingQuestions,
      approvedQuestions,
      rejectedQuestions,
      questionsToday,
      
      // 回答统计
      totalAnswers,
      pendingAnswers,
      answersToday,
      
      // 评论统计
      totalComments,
      pendingComments,
      
      // 白名单统计
      totalWhitelist,
      registeredWhitelist
    ] = await Promise.all([
      // 用户统计
      prisma.user.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true }
      }),
      
      // 问题统计
      prisma.question.count(),
      prisma.question.count({ where: { status: 'pending' } }),
      prisma.question.count({ where: { status: 'approved' } }),
      prisma.question.count({ where: { status: 'rejected' } }),
      prisma.question.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // 回答统计
      prisma.answer.count({ where: { deletedAt: null } }),
      prisma.answer.count({ where: { status: 'pending', deletedAt: null } }),
      prisma.answer.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          },
          deletedAt: null
        }
      }),
      
      // 评论统计
      prisma.comment.count({ where: { deletedAt: null } }),
      prisma.comment.count({ where: { status: 'pending', deletedAt: null } }),
      
      // 白名单统计
      prisma.userWhitelist.count({ where: { deletedAt: null } }),
      prisma.userWhitelist.count({ where: { isRegistered: true, deletedAt: null } })
    ])

    return res.json({
      code: 200,
      data: {
        users: {
          total: totalUsers,
          newToday: newUsersToday,
          byRole: usersByRole.reduce((acc, item) => {
            acc[item.role] = item._count.id
            return acc
          }, {} as Record<string, number>)
        },
        questions: {
          total: totalQuestions,
          pending: pendingQuestions,
          approved: approvedQuestions,
          rejected: rejectedQuestions,
          today: questionsToday
        },
        answers: {
          total: totalAnswers,
          pending: pendingAnswers,
          today: answersToday
        },
        comments: {
          total: totalComments,
          pending: pendingComments
        },
        whitelist: {
          total: totalWhitelist,
          registered: registeredWhitelist,
          pending: totalWhitelist - registeredWhitelist
        }
      },
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[API /admin/stats]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}

// 仅管理员/教师可访问
export default requireAuth(requireRole(['admin', 'teacher'])(handler))
