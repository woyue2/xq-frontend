/**
 * [POS] api/admin/whitelist/index.ts
 *   所属：API 路由层 | 角色：白名单管理
 *
 * [METHODS]
 *   - GET  → 获取白名单列表
 *   - POST → 添加白名单用户
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../../src/lib/prisma'
import { requireAuth, requireRole } from '../../_lib/auth'

async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // GET - 获取白名单列表
  if (req.method === 'GET') {
    try {
      const { 
        role, 
        isRegistered, 
        page = '1', 
        limit = '20',
        search
      } = req.query
      
      const skip = (Number(page) - 1) * Number(limit)
      
      const where: any = { deletedAt: null }
      
      if (role) {
        where.role = role as string
      }
      
      if (isRegistered !== undefined) {
        where.isRegistered = isRegistered === 'true'
      }
      
      if (search) {
        where.OR = [
          { phone: { contains: search as string } },
          { name: { contains: search as string } }
        ]
      }

      const [list, total] = await Promise.all([
        prisma.userWhitelist.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
                createdAt: true
              }
            }
          }
        }),
        prisma.userWhitelist.count({ where })
      ])

      return res.json({
        code: 200,
        data: {
          list,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        },
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('[API /admin/whitelist GET]', error)
      return res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        timestamp: Date.now()
      })
    }
  }

  // POST - 添加白名单用户
  if (req.method === 'POST') {
    try {
      const { phone, name, role, grade, validUntil, notes } = req.body

      if (!phone || !name || !role) {
        return res.status(400).json({
          code: 400,
          message: '手机号、姓名和角色为必填项',
          timestamp: Date.now()
        })
      }

      // 验证手机号格式
      const phoneRegex = /^1[3-9]\d{9}$/
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          code: 400,
          message: '手机号格式不正确',
          timestamp: Date.now()
        })
      }

      // 检查是否已存在
      const existing = await prisma.userWhitelist.findUnique({
        where: { phone }
      })

      if (existing && !existing.deletedAt) {
        return res.status(409).json({
          code: 409,
          message: '该手机号已在白名单中',
          timestamp: Date.now()
        })
      }

      // 如果已删除，则恢复并更新
      if (existing && existing.deletedAt) {
        const updated = await prisma.userWhitelist.update({
          where: { id: existing.id },
          data: {
            name,
            role,
            grade,
            validUntil: validUntil ? new Date(validUntil) : null,
            notes,
            deletedAt: null,
            deletedBy: null,
            updatedAt: new Date()
          }
        })

        return res.status(200).json({
          code: 200,
          data: updated,
          message: '白名单用户已恢复并更新',
          timestamp: Date.now()
        })
      }

      // 创建新的白名单记录
      const whitelist = await prisma.userWhitelist.create({
        data: {
          phone,
          name,
          role,
          grade,
          validUntil: validUntil ? new Date(validUntil) : null,
          notes,
          isRegistered: false
        }
      })

      return res.status(201).json({
        code: 201,
        data: whitelist,
        message: '白名单用户添加成功',
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('[API /admin/whitelist POST]', error)
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

// 仅管理员可访问
export default requireAuth(requireRole(['admin'])(handler))
