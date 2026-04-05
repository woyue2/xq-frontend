/**
 * [POS] api/auth/login.ts
 *   所属：API 路由层 | 角色：用户登录
 *
 * [METHODS]
 *   - POST → 手机号+密码登录
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
    const { phone, password } = req.body

    if (!phone || !password) {
      return res.status(400).json({
        code: 400,
        message: '手机号和密码不能为空',
        timestamp: Date.now()
      })
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { phone }
    })

    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户不存在',
        timestamp: Date.now()
      })
    }

    if (!user.isActive) {
      return res.status(403).json({
        code: 403,
        message: '账号已被禁用',
        timestamp: Date.now()
      })
    }

    // 验证密码
    if (!user.passwordHash) {
      return res.status(401).json({
        code: 401,
        message: '请使用验证码登录',
        timestamp: Date.now()
      })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({
        code: 401,
        message: '密码错误',
        timestamp: Date.now()
      })
    }

    // 生成 token
    const token = generateToken({
      id: user.id,
      phone: user.phone,
      role: user.role,
      nickname: user.nickname
    })

    return res.json({
      code: 200,
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          grade: user.grade,
          age: user.age,
          school: user.school
        }
      },
      message: '登录成功',
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[API /auth/login]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}
