/**
 * [POS] api/questions/detail.ts
 *   所属：API 路由层 | 角色：问题详情
 *   路由: /api/questions/detail?id=xxx
 *
 * [METHODS]
 *   - GET → 获取问题详情
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ code: 405, message: '方法不允许' })
  }

  try {
    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        code: 400,
        message: '问题ID不能为空',
        timestamp: Date.now()
      })
    }

    const question = await prisma.question.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        subject: true,
        tags: true,
        images: true,
        difficulty: true,
        status: true,
        isGoodQuestion: true,
        isPinned: true,
        score: true,
        likes: true,
        favorites: true,
        comments: true,
        answers: true,
        understoodCount: true,
        notUnderstoodCount: true,
        authorId: true,
        authorName: true,
        authorAvatar: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!question) {
      return res.status(404).json({
        code: 404,
        message: '问题不存在',
        timestamp: Date.now()
      })
    }

    // 未审核通过的问题不返回详情
    if (question.status !== 'approved') {
      return res.status(404).json({
        code: 404,
        message: '问题不存在或审核中',
        timestamp: Date.now()
      })
    }

    return res.json({
      code: 200,
      data: question,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[API /questions/detail]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}
