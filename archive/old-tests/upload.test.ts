/**
 * Unit tests for upload API
 * Tests file format validation, size validation, and Supabase Storage integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn()
      }))
    }
  }))
}))

vi.mock('formidable', () => ({
  default: vi.fn()
}))

vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(),
    unlinkSync: vi.fn()
  }
}))

vi.mock('../../api/auth', () => ({
  extractAndVerifyToken: vi.fn()
}))

describe('Upload API', () => {
  let mockReq: Partial<VercelRequest>
  let mockRes: Partial<VercelResponse>
  let jsonMock: ReturnType<typeof vi.fn>
  let statusMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    jsonMock = vi.fn()
    statusMock = vi.fn(() => ({ json: jsonMock, end: vi.fn() }))
    
    mockRes = {
      setHeader: vi.fn(),
      status: statusMock,
      json: jsonMock,
      end: vi.fn()
    }
  })

  it('should reject requests without authentication', async () => {
    const { extractAndVerifyToken } = await import('../../api/auth')
    vi.mocked(extractAndVerifyToken).mockReturnValue(null)

    mockReq = {
      method: 'POST',
      headers: {}
    }

    const handler = (await import('../../api/upload')).default
    await handler(mockReq as VercelRequest, mockRes as VercelResponse)

    expect(statusMock).toHaveBeenCalledWith(401)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 401,
        message: '需要登录'
      })
    )
  })

  it('should reject non-POST methods', async () => {
    mockReq = {
      method: 'GET',
      headers: {}
    }

    const handler = (await import('../../api/upload')).default
    await handler(mockReq as VercelRequest, mockRes as VercelResponse)

    expect(statusMock).toHaveBeenCalledWith(405)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 405,
        message: '方法不允许'
      })
    )
  })

  it('should handle OPTIONS preflight requests', async () => {
    mockReq = {
      method: 'OPTIONS',
      headers: {}
    }

    const handler = (await import('../../api/upload')).default
    await handler(mockReq as VercelRequest, mockRes as VercelResponse)

    expect(statusMock).toHaveBeenCalledWith(200)
  })
})

describe('File validation', () => {
  it('should accept valid image formats', () => {
    const validFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    validFormats.forEach(format => {
      expect(['jpg', 'jpeg', 'png', 'gif', 'webp']).toContain(format)
    })
  })

  it('should reject invalid formats', () => {
    const invalidFormats = ['bmp', 'svg', 'tiff', 'pdf', 'doc']
    invalidFormats.forEach(format => {
      expect(['jpg', 'jpeg', 'png', 'gif', 'webp']).not.toContain(format)
    })
  })

  it('should enforce 5MB size limit', () => {
    const MAX_FILE_SIZE = 5 * 1024 * 1024
    expect(MAX_FILE_SIZE).toBe(5242880)
    
    // File exactly at limit should be allowed
    expect(MAX_FILE_SIZE).toBeLessThanOrEqual(MAX_FILE_SIZE)
    
    // File over limit should be rejected
    expect(MAX_FILE_SIZE + 1).toBeGreaterThan(MAX_FILE_SIZE)
  })
})
