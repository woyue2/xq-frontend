/**
 * [POS] api/auth/register.ts
 *   所属：API 路由层 | 角色：用户注册（需白名单）
 *
 * [METHODS]
 *   - POST → 手机号注册
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'
import { generateToken } from '../_lib/auth'
import bcrypt from 'bcryptjs'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ code: 405, message: '方法不允许' })
  }

  try {
    const { phone, password, nickname, code } = req.body

    if (!phone || !password || !nickname) {
      return res.status(400).json({
        code: 400,
        message: '手机号、密码、昵称不能为空',
        timestamp: Date.now()
      })
    }

    // 检查白名单
    const whitelist = await prisma.userWhitelist.findUnique({
      where: { phone }
    })

    if (!whitelist || whitelist.deletedAt) {
      return res.status(403).json({
        code: 403,
        message: '手机号不在白名单中，无法注册',
        timestamp: Date.now()
      })
    }

    if (whitelist.isRegistered) {
      return res.status(409).json({
        code: 409,
        message: '该手机号已注册',
        timestamp: Date.now()
      })
    }

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { phone }
    })

    if (existingUser) {
      return res.status(409).json({
        code: 409,
        message: '用户已存在',
        timestamp: Date.now()
      })
    }

    // 创建用户
    const passwordHash = await bcrypt.hash(password, 10)
    
    const user = await prisma.user.create({
      data: {
        phone,
        passwordHash,
        nickname,
        name: whitelist.name,
        role: whitelist.role,
        grade: whitelist.grade
      }
    })

    // 更新白名单状态
    await prisma.userWhitelist.update({
      where: { phone },
      data: {
        isRegistered: true,
        userId: user.id,
        registeredAt: new Date()
      }
    })

    // 生成 token
    const token = generateToken({
      id: user.id,
      phone: user.phone,
      role: user.role,
      nickname: user.nickname
    })

    return res.status(201).json({
      code: 201,
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          name: user.name,
          role: user.role,
          grade: user.grade
        }
      },
      message: '注册成功',
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[API /auth/register]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}
