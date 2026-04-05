/**
 * [POS] api/answers/detail.ts
 *   所属：API 路由层 | 角色：回答详情查询
 *   [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [METHODS]
 *   - GET → 获取回答详情
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
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
    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        code: 400,
        message: '回答ID为必填项',
        timestamp: Date.now()
      })
    }

    const answer = await prisma.answer.findUnique({
      where: { 
        id,
        deletedAt: null
      },
      include: {
        question: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    })

    if (!answer) {
      return res.status(404).json({
        code: 404,
        message: '回答不存在',
        timestamp: Date.now()
      })
    }

    return res.json({
      code: 200,
      data: answer,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[API /answers/detail]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}
