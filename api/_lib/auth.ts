/**
 * [POS] api/_lib/auth.ts
 *   所属：API 工具�?| 角色：JWT 鉴权中间�?
 *   [PROTOCOL]: 变更时更新此头部，然后检�?CLAUDE.md
 *
 * [INPUT]
 *   - jwt �?JSON Web Token 处理
 *   - VercelRequest �?扩展请求类型
 *   - prisma �?数据库客户端
 *
 * [OUTPUT]
 *   - AuthUser �?认证用户接口
 *   - AuthenticatedRequest �?扩展的请求接�?
 *   - verifyToken �?Token 验证函数
 *   - generateToken �?Token 生成函数
 *   - getCurrentUser �?获取当前用户
 *   - requireAuth �?鉴权中间�?
 *   - requireRole �?角色权限中间�?
 */
import jwt from 'jsonwebtoken'
import type { VercelRequest } from '@vercel/node'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET!

export interface AuthUser {
  id: string
  phone: string
  role: string
  nickname: string
}

// 扩展�?VercelRequest 类型
export interface AuthenticatedRequest extends VercelRequest {
  user?: AuthUser
}

export type { VercelRequest } from '@vercel/node'

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
  return async (req: VercelRequest, res: any) => {
    const user = await getCurrentUser(req)
    
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '未登录或token已过�?,
        timestamp: Date.now()
      })
    }
    
    ;(req as AuthenticatedRequest).user = user
    return handler(req, res)
  }
}

export function requireRole(roles: string[]) {
  return (handler: Function) => {
    return async (req: VercelRequest, res: any) => {
      const user = (req as AuthenticatedRequest).user
      
      if (!user) {
        return res.status(401).json({
          code: 401,
          message: '未登�?,
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
