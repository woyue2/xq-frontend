/**
 * [POS] api/users/me.ts
 *   所属：API 路由层 | 角色：获取当前用户信息
 *
 * [METHODS]
 *   - GET → 获取当前登录用户信息
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'
import { requireAuth } from '../_lib/auth'

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
    const userId = req.user.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        nickname: true,
        name: true,
        avatar: true,
        role: true,
        grade: true,
        age: true,
        school: true,
        isActive: true,
        createdAt: true
      }
    })

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        timestamp: Date.now()
      })
    }

    return res.json({
      code: 200,
      data: user,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[API /users/me]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}

export default requireAuth(handler)
