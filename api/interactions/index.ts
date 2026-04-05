/**
 * [POS] api/interactions/index.ts
 *   所属：API 路由层 | 角色：交互操作入口
 *   [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [METHODS]
 *   - POST /interactions/like          → 点赞/取消点赞
 *   - GET  /interactions/favorite      → 获取收藏列表
 *   - POST /interactions/favorite      → 添加收藏
 *   - DELETE /interactions/favorite    → 取消收藏
 *   - GET  /interactions/understanding → 获取理解状态
 *   - POST /interactions/understanding → 标记理解状态
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'
import { requireAuth } from '../_lib/auth'

async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { action } = req.query

  // Like
  if (action === 'like') {
    if (req.method === 'POST') return requireAuth(handleLike)(req, res)
    if (req.method === 'DELETE') return requireAuth(handleUnlike)(req, res)
  }

  // Favorite
  if (action === 'favorite') {
    if (req.method === 'GET') return requireAuth(handleGetFavorites)(req, res)
    if (req.method === 'POST') return requireAuth(handleAddFavorite)(req, res)
    if (req.method === 'DELETE') return requireAuth(handleRemoveFavorite)(req, res)
  }

  // Understanding
  if (action === 'understanding') {
    if (req.method === 'GET') return requireAuth(handleGetUnderstanding)(req, res)
    if (req.method === 'POST') return requireAuth(handleSetUnderstanding)(req, res)
  }

  return res.status(400).json({ code: 400, message: '无效的操作类型', timestamp: Date.now() })
}

// POST /interactions/like
async function handleLike(req: VercelRequest, res: VercelResponse) {
  try {
    const { targetType, targetId } = req.body
    const userId = (req as any).user?.id

    if (!targetType || !targetId || !['question', 'answer'].includes(targetType)) {
      return res.status(400).json({ code: 400, message: '无效的目标类型', timestamp: Date.now() })
    }

    const existing = await prisma.like.findUnique({
      where: { userId_targetType_targetId: { userId, targetType, targetId } }
    })

    if (existing) {
      return res.status(409).json({ code: 409, message: '已点赞', timestamp: Date.now() })
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.like.create({ data: { userId, targetType, targetId } })
      if (targetType === 'question') {
        await tx.question.update({ where: { id: targetId }, data: { likes: { increment: 1 } } })
      } else {
        await tx.answer.update({ where: { id: targetId }, data: { likes: { increment: 1 } } })
      }
    })

    return res.status(201).json({ code: 201, message: '点赞成功', timestamp: Date.now() })
  } catch (error: any) {
    console.error('[Interactions Like]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

// DELETE /interactions/like
async function handleUnlike(req: VercelRequest, res: VercelResponse) {
  try {
    const { targetType, targetId } = req.query
    const userId = (req as any).user?.id

    if (!targetType || !targetId) {
      return res.status(400).json({ code: 400, message: '参数不完整', timestamp: Date.now() })
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.like.deleteMany({ where: { userId, targetType: targetType as string, targetId: targetId as string } })
      if (targetType === 'question') {
        await tx.question.update({ where: { id: targetId as string }, data: { likes: { decrement: 1 } } })
      } else {
        await tx.answer.update({ where: { id: targetId as string }, data: { likes: { decrement: 1 } } })
      }
    })

    return res.json({ code: 200, message: '取消点赞成功', timestamp: Date.now() })
  } catch (error: any) {
    console.error('[Interactions Unlike]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

// GET /interactions/favorite
async function handleGetFavorites(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = (req as any).user?.id
    const { page = '1', limit = '20' } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId }, orderBy: { createdAt: 'desc' }, skip, take: Number(limit)
      }),
      prisma.favorite.count({ where: { userId } })
    ])

    // 手动查询关联的问题
    const questionIds = favorites.map((f: any) => f.questionId)
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } }
    })
    const questionMap = new Map(questions.map((q: any) => [q.id, q]))

    return res.json({
      code: 200,
      data: {
        list: favorites.map((f: any) => {
          const question = questionMap.get(f.questionId)
          return question ? { ...question, favoritedAt: f.createdAt } : null
        }).filter(Boolean),
        pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
      },
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('[Interactions Favorites GET]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

// POST /interactions/favorite
async function handleAddFavorite(req: VercelRequest, res: VercelResponse) {
  try {
    const { questionId } = req.body
    const userId = (req as any).user?.id

    if (!questionId) {
      return res.status(400).json({ code: 400, message: '问题ID为必填项', timestamp: Date.now() })
    }

    const existing = await prisma.favorite.findUnique({
      where: { userId_questionId: { userId, questionId } }
    })

    if (existing) {
      return res.status(409).json({ code: 409, message: '已收藏该问题', timestamp: Date.now() })
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.favorite.create({ data: { userId, questionId } })
      await tx.question.update({ where: { id: questionId }, data: { favorites: { increment: 1 } } })
    })

    return res.status(201).json({ code: 201, message: '收藏成功', timestamp: Date.now() })
  } catch (error: any) {
    console.error('[Interactions Favorite POST]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

// DELETE /interactions/favorite
async function handleRemoveFavorite(req: VercelRequest, res: VercelResponse) {
  try {
    const { questionId } = req.query
    const userId = (req as any).user?.id

    if (!questionId) {
      return res.status(400).json({ code: 400, message: '问题ID为必填项', timestamp: Date.now() })
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.favorite.deleteMany({ where: { userId, questionId: questionId as string } })
      await tx.question.update({ where: { id: questionId as string }, data: { favorites: { decrement: 1 } } })
    })

    return res.json({ code: 200, message: '取消收藏成功', timestamp: Date.now() })
  } catch (error: any) {
    console.error('[Interactions Favorite DELETE]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

// GET /interactions/understanding
async function handleGetUnderstanding(req: VercelRequest, res: VercelResponse) {
  try {
    const { questionId } = req.query
    const userId = (req as any).user?.id

    if (!questionId) {
      return res.status(400).json({ code: 400, message: '问题ID为必填项', timestamp: Date.now() })
    }

    const [understanding, question] = await Promise.all([
      prisma.questionUnderstanding.findUnique({
        where: { questionId_userId: { questionId: questionId as string, userId } }
      }),
      prisma.question.findUnique({
        where: { id: questionId as string },
        select: { understoodCount: true, notUnderstoodCount: true }
      })
    ])

    return res.json({
      code: 200,
      data: { myStatus: understanding?.status || null, stats: question || { understoodCount: 0, notUnderstoodCount: 0 } },
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('[Interactions Understanding GET]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

// POST /interactions/understanding
async function handleSetUnderstanding(req: VercelRequest, res: VercelResponse) {
  try {
    const { questionId, status } = req.body
    const userId = (req as any).user?.id

    if (!questionId || !status || !['understood', 'not_understood'].includes(status)) {
      return res.status(400).json({ code: 400, message: '无效参数', timestamp: Date.now() })
    }

    const question = await prisma.question.findUnique({ where: { id: questionId } })
    if (!question) {
      return res.status(404).json({ code: 404, message: '题目不存在', timestamp: Date.now() })
    }

    const existing = await prisma.questionUnderstanding.findUnique({
      where: { questionId_userId: { questionId, userId } }
    })

    await prisma.$transaction(async (tx: any) => {
      await tx.questionUnderstanding.upsert({
        where: { questionId_userId: { questionId, userId } },
        update: { status, updatedAt: new Date() },
        create: { questionId, userId, status }
      })

      if (existing && existing.status !== status) {
        if (status === 'understood') {
          await tx.question.update({
            where: { id: questionId },
            data: { understoodCount: { increment: 1 }, notUnderstoodCount: { decrement: 1 } }
          })
        } else {
          await tx.question.update({
            where: { id: questionId },
            data: { understoodCount: { decrement: 1 }, notUnderstoodCount: { increment: 1 } }
          })
        }
      } else if (!existing) {
        if (status === 'understood') {
          await tx.question.update({ where: { id: questionId }, data: { understoodCount: { increment: 1 } } })
        } else {
          await tx.question.update({ where: { id: questionId }, data: { notUnderstoodCount: { increment: 1 } } })
        }
      }
    })

    return res.json({ code: 200, message: status === 'understood' ? '已标记为懂了' : '已标记为没懂', timestamp: Date.now() })
  } catch (error: any) {
    console.error('[Interactions Understanding POST]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

export default handler
