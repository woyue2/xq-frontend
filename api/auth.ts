/**
 * [POS] api/auth.ts
 *   所属：API 路由层 | 角色：认证统一入口
 *   简化版：仅支持密码登录和 JWT token 验证
 *
 * [INPUT]
 *   - action=password-login: { phone: string, password: string }
 *   - ./_helpers            → prisma / JWT_SECRET
 *
 * [OUTPUT]
 *   - 登录成功: { code: 200, data: { token: string, user: UserDTO } }
 *   - 错误: { code: number, message: string, timestamp: number }
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. api/CLAUDE.md 的文件清单
 *   3. 依赖 _helpers.ts 的 prisma 单例和 JWT_SECRET
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import type { UserDTO } from '../src/types/dto'
import { prisma, JWT_SECRET } from './_helpers'

// === 类型定义 ===
interface AuthUser {
  id: string
  phone: string
  role: string
  nickname: string
}

// === JWT 工具函数 ===

/**
 * 生成 JWT token
 * @param user 用户信息
 * @returns JWT token 字符串
 */
export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}

/**
 * 验证 JWT token
 * @param token JWT token 字符串
 * @returns 解析后的用户信息，验证失败返回 null
 */
export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser
  } catch (error) {
    return null
  }
}

/**
 * 从请求头中提取并验证 token
 * @param req Vercel 请求对象
 * @returns 验证成功返回用户信息，失败返回 null
 */
export function extractAndVerifyToken(req: VercelRequest): AuthUser | null {
  const authHeader = req.headers?.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.slice(7)
  return verifyToken(token)
}

// === 密码登录处理 ===

/**
 * 处理密码登录请求
 */
async function handlePasswordLogin(req: VercelRequest, res: VercelResponse) {
  const requestId = Math.random().toString(36).substring(7)
  const startTime = Date.now()
  
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Auth Login:${requestId}] Request received`);
    }

    const { phone, password } = req.body

    // 验证必填字段
    if (!phone || !password) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Auth Login:${requestId}] Missing credentials`);
      }
      return res.status(400).json({ 
        code: 400, 
        message: '手机号和密码为必填项', 
        timestamp: Date.now() 
      })
    }

    // 查询用户
    const user = await prisma.user.findUnique({ where: { phone } })

    if (!user || !user.passwordHash) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Auth Login:${requestId}] User not found or no password`);
      }
      return res.status(401).json({ 
        code: 401, 
        message: '手机号或密码错误', 
        timestamp: Date.now() 
      })
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Auth Login:${requestId}] Password verification failed`);
      }
      return res.status(401).json({ 
        code: 401, 
        message: '手机号或密码错误', 
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

    const duration = Date.now() - startTime
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Auth Login:${requestId}] Success:`, { 
        userId: user.id, 
        role: user.role, 
        duration: `${duration}ms` 
      });
    }
    
    // 返回成功响应
    return res.json({
      code: 200,
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          name: user.name || undefined,
          avatar: user.avatar || undefined,
          role: user.role
        } as UserDTO
      },
      timestamp: Date.now()
    })
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error(`[Auth Login:${requestId}] ERROR:`, {
      message: errorMessage,
      stack: errorStack,
      duration: `${duration}ms`
    })
    return res.status(500).json({ 
      code: 500, 
      message: '服务器内部错误', 
      timestamp: Date.now() 
    })
  }
}

// === 主处理函数 ===

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-request-id')

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // 只允许 POST 方法
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      code: 405, 
      message: '方法不允许', 
      timestamp: Date.now() 
    })
  }

  try {
    // 支持两种路由风格：
    // 1. /api/auth?action=password-login  (query param)
    // 2. /api/auth/password-login         (path style)
    const urlAction = req.url?.split('?')[0].split('/api/auth/')[1]
    const action = req.query.action || urlAction

    // 只支持 password-login 操作
    if (action === 'password-login') {
      return handlePasswordLogin(req, res)
    }

    // 不支持的操作
    return res.status(400).json({ 
      code: 400, 
      message: '无效的操作类型', 
      timestamp: Date.now() 
    })
    
  } catch (error: unknown) {
    console.error('[Auth API Error]', error)
    return res.status(500).json({ 
      code: 500, 
      message: '服务器内部错误',
      timestamp: Date.now() 
    })
  }
}
