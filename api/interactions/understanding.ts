/**
 * [POS] api/interactions/understanding.ts
 *   所属：API 路由层 | 角色：题目理解状态管理
 *
 * [METHODS]
 *   - GET  → 获取用户对题目的理解状态
 *   - POST → 标记题目理解状态（懂了/没懂）
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'
import { requireAuth } from '../_lib/auth'

async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const userId = req.user?.id

  // GET - 获取理解状态
  if (req.method === 'GET') {
    try {
      const { questionId } = req.query

      if (!questionId) {
        return res.status(400).json({
          code: 400,
          message: '题目ID为必填项',
          timestamp: Date.now()
        })
      }

      const understanding = await prisma.questionUnderstanding.findUnique({
        where: {
          questionId_userId: {
            questionId: questionId as string,
            userId
          }
        }
      })

      // 获取题目的统计数据
      const question = await prisma.question.findUnique({
        where: { id: questionId as string },
        select: {
          understoodCount: true,
          notUnderstoodCount: true
        }
      })

      return res.json({
        code: 200,
        data: {
          myStatus: understanding?.status || null,
          stats: question || { understoodCount: 0, notUnderstoodCount: 0 }
        },
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('[API /interactions/understanding GET]', error)
      return res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        timestamp: Date.now()
      })
    }
  }

  // POST - 标记理解状态
  if (req.method === 'POST') {
    try {
      const { questionId, status } = req.body

      if (!questionId || !status) {
        return res.status(400).json({
          code: 400,
          message: '题目ID和状态为必填项',
          timestamp: Date.now()
        })
      }

      if (!['understood', 'not_understood'].includes(status)) {
        return res.status(400).json({
          code: 400,
          message: '状态必须是 understood 或 not_understood',
          timestamp: Date.now()
        })
      }

      // 检查题目是否存在
      const question = await prisma.question.findUnique({
        where: { id: questionId }
      })

      if (!question) {
        return res.status(404).json({
          code: 404,
          message: '题目不存在',
          timestamp: Date.now()
        })
      }

      // 获取之前的理解状态
      const existing = await prisma.questionUnderstanding.findUnique({
        where: {
          questionId_userId: {
            questionId,
            userId
          }
        }
      })

      // 使用事务更新理解状态和计数
      const result = await prisma.$transaction(async (tx) => {
        // 更新或创建理解状态
        const understanding = await tx.questionUnderstanding.upsert({
          where: {
            questionId_userId: {
              questionId,
              userId
            }
          },
          update: {
            status,
            updatedAt: new Date()
          },
          create: {
            questionId,
            userId,
            status
          }
        })

        // 更新题目的理解计数
        if (existing) {
          // 如果之前的状态不同，需要调整计数
          if (existing.status !== status) {
            if (status === 'understood') {
              await tx.question.update({
                where: { id: questionId },
                data: {
                  understoodCount: { increment: 1 },
                  notUnderstoodCount: { decrement: 1 }
                }
              })
            } else {
              await tx.question.update({
                where: { id: questionId },
                data: {
                  understoodCount: { decrement: 1 },
                  notUnderstoodCount: { increment: 1 }
                }
              })
            }
          }
        } else {
          // 新记录，直接增加计数
          if (status === 'understood') {
            await tx.question.update({
              where: { id: questionId },
              data: {
                understoodCount: { increment: 1 }
              }
            })
          } else {
            await tx.question.update({
              where: { id: questionId },
              data: {
                notUnderstoodCount: { increment: 1 }
              }
            })
          }
        }

        return understanding
      })

      return res.json({
        code: 200,
        data: result,
        message: status === 'understood' ? '已标记为懂了' : '已标记为没懂',
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('[API /interactions/understanding POST]', error)
      return res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        timestamp: Date.now()
      })
    }
  }

  return res.status(405).json({
    code: 405,
    message: '方法不允许',
    timestamp: Date.now()
  })
}

export default requireAuth(handler)
