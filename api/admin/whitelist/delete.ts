/**
 * [POS] api/admin/whitelist/delete.ts
 *   所属：API 路由层 | 角色：删除白名单用户
 *
 * [METHODS]
 *   - POST → 软删除白名单用户
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
    const { id } = req.body
    const adminId = req.user?.id

    if (!id) {
      return res.status(400).json({
        code: 400,
        message: '白名单ID为必填项',
        timestamp: Date.now()
      })
    }

    // 检查白名单记录是否存在
    const whitelist = await prisma.userWhitelist.findUnique({
      where: { id }
    })

    if (!whitelist || whitelist.deletedAt) {
      return res.status(404).json({
        code: 404,
        message: '白名单用户不存在或已被删除',
        timestamp: Date.now()
      })
    }

    // 软删除
    await prisma.userWhitelist.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: adminId
      }
    })

    return res.json({
      code: 200,
      message: '白名单用户已删除',
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[API /admin/whitelist/delete]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}

// 仅管理员可访问
export default requireAuth(requireRole(['admin'])(handler))
