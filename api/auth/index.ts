/**
 * [POS] api/auth/index.ts
 *   所属：API 路由层 | 角色：认证入口
 *   [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [METHODS]
 *   - POST /auth/login    → 用户登录
 *   - POST /auth/register → 用户注册
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
import * as jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

// === 内联 Prisma 客户端 ===
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma = globalForPrisma.prisma ?? new PrismaClient()

// === 内联 Auth 工具 ===
const JWT_SECRET = process.env.JWT_SECRET!

interface AuthUser {
  id: string
  phone: string
  role: string
  nickname: string
}

function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-request-id')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ code: 405, message: '方法不允许', timestamp: Date.now() })
  }

  const { action } = req.query

  // POST /auth/login
  if (action === 'login') {
    return handleLogin(req, res)
  }

  // POST /auth/password-login  
  if (action === 'password-login') {
    return handleLogin(req, res)
  }

  // POST /auth/register
  if (action === 'register') {
    return handleRegister(req, res)
  }

  // POST /auth/send-code
  if (action === 'send-code') {
    return handleSendCode(req, res)
  }

  // POST /auth/set-password
  if (action === 'set-password') {
    return handleSetPassword(req, res)
  }

  return res.status(400).json({ code: 400, message: '无效的操作类型', timestamp: Date.now() })
}

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  try {
    const { phone, password } = req.body

    if (!phone || !password) {
      return res.status(400).json({ code: 400, message: '手机号和密码为必填项', timestamp: Date.now() })
    }

    const user = await prisma.user.findUnique({ where: { phone } })

    if (!user || !user.passwordHash) {
      return res.status(401).json({ code: 401, message: '手机号或密码错误', timestamp: Date.now() })
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return res.status(401).json({ code: 401, message: '手机号或密码错误', timestamp: Date.now() })
    }

    if (!user.isActive) {
      return res.status(403).json({ code: 403, message: '账号已被禁用', timestamp: Date.now() })
    }

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
          school: user.school
        }
      },
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('[Auth Login]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

async function handleRegister(req: VercelRequest, res: VercelResponse) {
  try {
    const { phone, password, nickname, name, role, grade, school, inviteCode } = req.body

    if (!phone || !password || !nickname || !role) {
      return res.status(400).json({
        code: 400,
        message: '手机号、密码、昵称和角色为必填项',
        timestamp: Date.now()
      })
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ code: 400, message: '手机号格式不正确', timestamp: Date.now() })
    }

    // 检查白名单（如果是学生/家长角色）
    if (role === 'student' || role === 'parent') {
      const whitelist = await prisma.userWhitelist.findUnique({ where: { phone } })
      if (!whitelist || whitelist.deletedAt) {
        return res.status(403).json({ code: 403, message: '该手机号不在白名单中', timestamp: Date.now() })
      }
      if (whitelist.validUntil && new Date(whitelist.validUntil) < new Date()) {
        return res.status(403).json({ code: 403, message: '白名单已过期', timestamp: Date.now() })
      }
    }

    // 检查手机号是否已注册
    const existing = await prisma.user.findUnique({ where: { phone } })
    if (existing) {
      return res.status(409).json({ code: 409, message: '该手机号已注册', timestamp: Date.now() })
    }

    // 创建用户
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        phone,
        passwordHash,
        nickname,
        name,
        role,
        grade,
        school,
        isActive: true
      }
    })

    // 更新白名单注册状态
    await prisma.userWhitelist.updateMany({
      where: { phone },
      data: { isRegistered: true, registeredAt: new Date(), userId: user.id }
    })

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
          avatar: user.avatar,
          role: user.role,
          grade: user.grade,
          school: user.school
        }
      },
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('[Auth Register]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), error: error.message, timestamp: Date.now() })
  }
}

async function handleSendCode(req: VercelRequest, res: VercelResponse) {
  try {
    const { phone, type } = req.body

    if (!phone) {
      return res.status(400).json({ code: 400, message: '手机号为必填项', timestamp: Date.now() })
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ code: 400, message: '手机号格式不正确', timestamp: Date.now() })
    }

    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // 这里应该调用短信服务发送验证码，暂时返回模拟数据
    console.log(`[Send Code] 手机号: ${phone}, 验证码: ${code}, 类型: ${type || 'login'}`)

    return res.json({
      code: 200,
      data: {
        success: true,
        message: '验证码已发送',
        // 开发环境返回验证码，生产环境不返回
        ...(process.env.NODE_ENV !== 'production' && { code })
      },
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('[Auth SendCode]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), timestamp: Date.now() })
  }
}

async function handleSetPassword(req: VercelRequest, res: VercelResponse) {
  try {
    const { newPassword } = req.body

    if (!newPassword) {
      return res.status(400).json({ code: 400, message: '新密码为必填项', timestamp: Date.now() })
    }

    // 验证密码长度
    if (newPassword.length < 6) {
      return res.status(400).json({ code: 400, message: '密码长度至少6位', timestamp: Date.now() })
    }

    // 从 JWT token 获取用户信息
    const authHeader = req.headers?.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ code: 401, message: '未登录或token已过期', timestamp: Date.now() })
    }

    const token = authHeader.slice(7)
    let user: AuthUser
    try {
      user = jwt.verify(token, JWT_SECRET) as any
    } catch {
      return res.status(401).json({ code: 401, message: 'token无效', timestamp: Date.now() })
    }

    // 更新密码
    const passwordHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    })

    return res.json({
      code: 200,
      data: { success: true },
      message: '密码设置成功',
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('[Auth SetPassword]', error)
    return res.status(500).json({ code: 500, message: '服务器内部错误: ' + (error.message || 'Unknown'), timestamp: Date.now() })
  }
}
