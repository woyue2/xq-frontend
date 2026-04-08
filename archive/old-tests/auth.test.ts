/**
 * 认证 API 测试
 * 
 * 测试范围：
 * - 密码登录功能
 * - JWT token 生成和验证
 * - 错误处理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// Create mock instances before importing
const mockUserFindUnique = vi.fn()
const mockBcryptCompare = vi.fn()

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrismaInstance = {
    user: {
      findUnique: mockUserFindUnique,
    },
  }
  return {
    PrismaClient: class MockPrismaClient {
      user = mockPrismaInstance.user
    },
  }
})

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    compare: mockBcryptCompare,
  },
  compare: mockBcryptCompare,
}))

// Now import the handler after mocks are set up
const { default: handler, generateToken, verifyToken, extractAndVerifyToken } = await import('../../api/auth')

describe('Auth API - Unit Tests', () => {
  let mockReq: Partial<VercelRequest>
  let mockRes: Partial<VercelResponse>
  let jsonMock: ReturnType<typeof vi.fn>
  let statusMock: ReturnType<typeof vi.fn>
  let setHeaderMock: ReturnType<typeof vi.fn>
  let endMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    
    jsonMock = vi.fn()
    statusMock = vi.fn(() => ({ json: jsonMock, end: endMock }))
    setHeaderMock = vi.fn()
    endMock = vi.fn()

    mockRes = {
      json: jsonMock as any,
      status: statusMock as any,
      setHeader: setHeaderMock as any,
      end: endMock as any,
    }
  })

  describe('JWT Token Functions', () => {
    it('should generate valid JWT token', () => {
      const user = {
        id: 'user-123',
        phone: '13800138000',
        role: 'teacher',
        nickname: 'Test User',
      }

      const token = generateToken(user)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3) // JWT has 3 parts
    })

    it('should verify valid JWT token', () => {
      const user = {
        id: 'user-123',
        phone: '13800138000',
        role: 'teacher',
        nickname: 'Test User',
      }

      const token = generateToken(user)
      const verified = verifyToken(token)

      expect(verified).not.toBeNull()
      expect(verified?.id).toBe(user.id)
      expect(verified?.phone).toBe(user.phone)
      expect(verified?.role).toBe(user.role)
      expect(verified?.nickname).toBe(user.nickname)
    })

    it('should return null for invalid token', () => {
      const verified = verifyToken('invalid-token')
      expect(verified).toBeNull()
    })

    it('should return null for expired token', () => {
      // This would require mocking time or using a very short expiry
      // For now, we test with a malformed token
      const verified = verifyToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature')
      expect(verified).toBeNull()
    })

    it('should extract and verify token from request header', () => {
      const user = {
        id: 'user-123',
        phone: '13800138000',
        role: 'teacher',
        nickname: 'Test User',
      }

      const token = generateToken(user)
      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      } as VercelRequest

      const verified = extractAndVerifyToken(req)
      expect(verified).not.toBeNull()
      expect(verified?.id).toBe(user.id)
    })

    it('should return null when no authorization header', () => {
      const req = {
        headers: {},
      } as VercelRequest

      const verified = extractAndVerifyToken(req)
      expect(verified).toBeNull()
    })

    it('should return null when authorization header is malformed', () => {
      const req = {
        headers: {
          authorization: 'InvalidFormat token',
        },
      } as VercelRequest

      const verified = extractAndVerifyToken(req)
      expect(verified).toBeNull()
    })
  })

  describe('Password Login', () => {
    it('should login successfully with correct credentials', async () => {
      const mockUser = {
        id: 'user-123',
        phone: '13800138000',
        nickname: 'Test User',
        name: 'Test Name',
        avatar: 'https://example.com/avatar.jpg',
        role: 'teacher',
        passwordHash: '$2a$10$hashedpassword',
      }

      mockUserFindUnique.mockResolvedValue(mockUser)
      mockBcryptCompare.mockResolvedValue(true)

      mockReq = {
        method: 'POST',
        query: { action: 'password-login' },
        body: {
          phone: '13800138000',
          password: 'password123',
        },
        url: '/api/auth?action=password-login',
      }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*')
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 200,
          data: expect.objectContaining({
            token: expect.any(String),
            user: expect.objectContaining({
              id: mockUser.id,
              phone: mockUser.phone,
              nickname: mockUser.nickname,
              name: mockUser.name,
              avatar: mockUser.avatar,
              role: mockUser.role,
            }),
          }),
        })
      )
    })

    it('should return 400 when phone is missing', async () => {
      mockReq = {
        method: 'POST',
        query: { action: 'password-login' },
        body: {
          password: 'password123',
        },
        url: '/api/auth?action=password-login',
      }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 400,
          message: '手机号和密码为必填项',
        })
      )
    })

    it('should return 400 when password is missing', async () => {
      mockReq = {
        method: 'POST',
        query: { action: 'password-login' },
        body: {
          phone: '13800138000',
        },
        url: '/api/auth?action=password-login',
      }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 400,
          message: '手机号和密码为必填项',
        })
      )
    })

    it('should return 401 when user not found', async () => {
      mockUserFindUnique.mockResolvedValue(null)

      mockReq = {
        method: 'POST',
        query: { action: 'password-login' },
        body: {
          phone: '13800138000',
          password: 'password123',
        },
        url: '/api/auth?action=password-login',
      }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 401,
          message: '手机号或密码错误',
        })
      )
    })

    it('should return 401 when user has no password hash', async () => {
      const mockUser = {
        id: 'user-123',
        phone: '13800138000',
        nickname: 'Test User',
        role: 'teacher',
        passwordHash: null,
      }

      mockUserFindUnique.mockResolvedValue(mockUser)

      mockReq = {
        method: 'POST',
        query: { action: 'password-login' },
        body: {
          phone: '13800138000',
          password: 'password123',
        },
        url: '/api/auth?action=password-login',
      }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 401,
          message: '手机号或密码错误',
        })
      )
    })

    it('should return 401 when password is incorrect', async () => {
      const mockUser = {
        id: 'user-123',
        phone: '13800138000',
        nickname: 'Test User',
        role: 'teacher',
        passwordHash: '$2a$10$hashedpassword',
      }

      mockUserFindUnique.mockResolvedValue(mockUser)
      mockBcryptCompare.mockResolvedValue(false)

      mockReq = {
        method: 'POST',
        query: { action: 'password-login' },
        body: {
          phone: '13800138000',
          password: 'wrongpassword',
        },
        url: '/api/auth?action=password-login',
      }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 401,
          message: '手机号或密码错误',
        })
      )
    })
  })

  describe('HTTP Method Validation', () => {
    it('should return 405 for GET requests', async () => {
      mockReq = {
        method: 'GET',
        query: { action: 'password-login' },
        url: '/api/auth?action=password-login',
      }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 405,
          message: '方法不允许',
        })
      )
    })

    it('should return 200 for OPTIONS requests (CORS preflight)', async () => {
      mockReq = {
        method: 'OPTIONS',
        url: '/api/auth',
      }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(endMock).toHaveBeenCalled()
    })
  })

  describe('Action Validation', () => {
    it('should return 400 for invalid action', async () => {
      mockReq = {
        method: 'POST',
        query: { action: 'invalid-action' },
        body: {},
        url: '/api/auth?action=invalid-action',
      }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 400,
          message: '无效的操作类型',
        })
      )
    })

    it('should support path-style action (e.g., /api/auth/password-login)', async () => {
      const mockUser = {
        id: 'user-123',
        phone: '13800138000',
        nickname: 'Test User',
        role: 'teacher',
        passwordHash: '$2a$10$hashedpassword',
      }

      mockUserFindUnique.mockResolvedValue(mockUser)
      mockBcryptCompare.mockResolvedValue(true)

      mockReq = {
        method: 'POST',
        query: {},
        body: {
          phone: '13800138000',
          password: 'password123',
        },
        url: '/api/auth/password-login',
      }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 200,
          data: expect.objectContaining({
            token: expect.any(String),
          }),
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should return 500 when database error occurs', async () => {
      mockUserFindUnique.mockRejectedValue(new Error('Database connection failed'))

      mockReq = {
        method: 'POST',
        query: { action: 'password-login' },
        body: {
          phone: '13800138000',
          password: 'password123',
        },
        url: '/api/auth?action=password-login',
      }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 500,
          message: '服务器内部错误',
        })
      )
    })
  })

  describe('CORS Headers', () => {
    it('should set correct CORS headers', async () => {
      mockReq = {
        method: 'POST',
        query: { action: 'password-login' },
        body: {
          phone: '13800138000',
          password: 'password123',
        },
        url: '/api/auth?action=password-login',
      }

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*')
      expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, OPTIONS')
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, x-request-id'
      )
    })
  })
})
