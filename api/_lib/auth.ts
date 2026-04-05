/**
 * [POS] api/_lib/auth.ts
 *   所属：API 工具层 | 角色：JWT 鉴权中间件
 */
import jwt from 'jsonwebtoken'
import type { VercelRequest } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET!

export interface AuthUser {
  id: string
  phone: string
  role: string
  nickname: string
}

// 扩展 VercelRequest 类型
declare module '@vercel/node' {
  interface VercelRequest {
    user?: AuthUser
  }
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded
  } catch {
    return null
  }
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}

export async function getCurrentUser(req: any): Promise<AuthUser | null> {
  const authHeader = req.headers?.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.slice(7)
  return verifyToken(token)
}

export function requireAuth(handler: Function) {
  return async (req: any, res: any) => {
    const user = await getCurrentUser(req)
    
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '未登录或token已过期',
        timestamp: Date.now()
      })
    }
    
    req.user = user
    return handler(req, res)
  }
}

export function requireRole(roles: string[]) {
  return (handler: Function) => {
    return async (req: any, res: any) => {
      const user = req.user as AuthUser
      
      if (!user) {
        return res.status(401).json({
          code: 401,
          message: '未登录',
          timestamp: Date.now()
        })
      }
      
      if (!roles.includes(user.role)) {
        return res.status(403).json({
          code: 403,
          message: '权限不足',
          timestamp: Date.now()
        })
      }
      
      return handler(req, res)
    }
  }
}
