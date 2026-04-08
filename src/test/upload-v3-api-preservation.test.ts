/**
 * Preservation Property Tests for Image Upload V3 API Fix
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 * 
 * These tests verify that error handling, validation, authentication, and cleanup
 * behavior remain unchanged after the fix. They follow the observation-first methodology:
 * 1. Observe behavior on UNFIXED code for non-buggy inputs
 * 2. Write property-based tests capturing observed behavior patterns
 * 3. Run tests on UNFIXED code - they should PASS
 * 4. After fix, re-run tests - they should still PASS (no regressions)
 * 
 * IMPORTANT: These tests should PASS on unfixed code to establish baseline behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from '../../api/upload'

// Mock dependencies
vi.mock('formidable', () => {
  return {
    default: vi.fn()
  }
})

vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(),
    unlinkSync: vi.fn()
  }
}))

vi.mock('../../api/auth', () => ({
  extractAndVerifyToken: vi.fn()
}))

describe('Property 2: Preservation - Error Handling and Validation Behavior', () => {
  let mockReq: Partial<VercelRequest>
  let mockRes: Partial<VercelResponse>
  let jsonSpy: ReturnType<typeof vi.fn>
  let statusSpy: ReturnType<typeof vi.fn>
  let setHeaderSpy: ReturnType<typeof vi.fn>
  let endSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    
    jsonSpy = vi.fn().mockReturnThis()
    statusSpy = vi.fn().mockReturnThis()
    setHeaderSpy = vi.fn().mockReturnThis()
    endSpy = vi.fn().mockReturnThis()

    mockReq = {
      method: 'POST',
      headers: {}
    }

    mockRes = {
      json: jsonSpy,
      status: statusSpy,
      setHeader: setHeaderSpy,
      end: endSpy
    } as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('File Size Validation Preservation (Requirement 3.1)', () => {
    it('should reject files exceeding 5MB with specific error message', async () => {
      // Property-based test: Generate file sizes over 5MB
      await fc.assert(
        fc.asyncProperty(
          // Generate file sizes from 5MB+1 byte to 10MB
          fc.integer({ min: 5 * 1024 * 1024 + 1, max: 10 * 1024 * 1024 }),
          async (fileSize) => {
            const { extractAndVerifyToken } = await import('../../api/auth')
            const formidable = (await import('formidable')).default
            
            // Mock authenticated user
            vi.mocked(extractAndVerifyToken).mockReturnValue({ id: 'user123', role: 'student' })

            // Mock formidable to simulate file size error
            vi.mocked(formidable).mockReturnValue({
              parse: vi.fn((req, callback) => {
                const error = new Error('maxFileSize exceeded')
                ;(error as any).code = 'LIMIT_FILE_SIZE'
                callback(error, {}, {})
              })
            } as any)

            await handler(mockReq as VercelRequest, mockRes as VercelResponse)

            // EXPECTED BEHAVIOR: Should return 400 with specific Chinese error message
            expect(statusSpy).toHaveBeenCalledWith(400)
            expect(jsonSpy).toHaveBeenCalledWith(
              expect.objectContaining({
                code: 400,
                message: '图片大小不能超过 5MB'
              })
            )
          }
        ),
        { numRuns: 5 }
      )
    })

    it('should reject oversized file with exact error message', async () => {
      const { extractAndVerifyToken } = await import('../../api/auth')
      const formidable = (await import('formidable')).default
      
      vi.mocked(extractAndVerifyToken).mockReturnValue({ id: 'user123', role: 'student' })

      vi.mocked(formidable).mockReturnValue({
        parse: vi.fn((req, callback) => {
          const error = new Error('maxFileSize exceeded, received 6291456 bytes of field data')
          ;(error as any).code = 'LIMIT_FILE_SIZE'
          callback(error, {}, {})
        })
      } as any)

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalledWith({
        code: 400,
        message: '图片大小不能超过 5MB',
        timestamp: expect.any(Number)
      })
    })
  })

  describe('File Format Validation Preservation (Requirement 3.2)', () => {
    it('should reject unsupported file formats with format list', async () => {
      // Property-based test: Generate unsupported file extensions
      await fc.assert(
        fc.asyncProperty(
          // Generate random unsupported extensions
          fc.constantFrom('bmp', 'tiff', 'svg', 'pdf', 'txt', 'doc', 'exe'),
          async (unsupportedExt) => {
            const { extractAndVerifyToken } = await import('../../api/auth')
            const formidable = (await import('formidable')).default
            
            vi.mocked(extractAndVerifyToken).mockReturnValue({ id: 'user123', role: 'student' })

            const mockFile = {
              originalFilename: `test.${unsupportedExt}`,
              size: 1024 * 1024, // 1MB
              mimetype: `image/${unsupportedExt}`,
              filepath: '/tmp/test'
            }

            vi.mocked(formidable).mockReturnValue({
              parse: vi.fn((req, callback) => {
                callback(null, {}, { file: mockFile })
              })
            } as any)

            await handler(mockReq as VercelRequest, mockRes as VercelResponse)

            // EXPECTED BEHAVIOR: Should return 400 with format list
            expect(statusSpy).toHaveBeenCalledWith(400)
            expect(jsonSpy).toHaveBeenCalledWith(
              expect.objectContaining({
                code: 400,
                message: expect.stringContaining('不支持的图片格式')
              })
            )
            
            // Verify the error message contains the allowed formats
            const callArgs = jsonSpy.mock.calls[0][0]
            expect(callArgs.message).toMatch(/jpg|jpeg|png|gif|webp/)
          }
        ),
        { numRuns: 5 }
      )
    })

    it('should reject .bmp file with specific error message', async () => {
      const { extractAndVerifyToken } = await import('../../api/auth')
      const formidable = (await import('formidable')).default
      
      vi.mocked(extractAndVerifyToken).mockReturnValue({ id: 'user123', role: 'student' })

      const mockFile = {
        originalFilename: 'image.bmp',
        size: 1024 * 1024,
        mimetype: 'image/bmp',
        filepath: '/tmp/test.bmp'
      }

      vi.mocked(formidable).mockReturnValue({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: mockFile })
        })
      } as any)

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalledWith({
        code: 400,
        message: '不支持的图片格式，仅支持 jpg, jpeg, png, gif, webp',
        timestamp: expect.any(Number)
      })
    })
  })

  describe('Authentication Preservation (Requirement 3.3)', () => {
    it('should return 401 for unauthenticated requests', async () => {
      // Property-based test: Test with various unauthenticated scenarios
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // No user token
          async () => {
            const { extractAndVerifyToken } = await import('../../api/auth')
            
            // Mock unauthenticated user
            vi.mocked(extractAndVerifyToken).mockReturnValue(null)

            await handler(mockReq as VercelRequest, mockRes as VercelResponse)

            // EXPECTED BEHAVIOR: Should return 401 with Chinese error message
            expect(statusSpy).toHaveBeenCalledWith(401)
            expect(jsonSpy).toHaveBeenCalledWith({
              code: 401,
              message: '需要登录',
              timestamp: expect.any(Number)
            })
          }
        ),
        { numRuns: 3 }
      )
    })

    it('should reject unauthenticated upload with exact error', async () => {
      const { extractAndVerifyToken } = await import('../../api/auth')
      
      vi.mocked(extractAndVerifyToken).mockReturnValue(null)

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(statusSpy).toHaveBeenCalledWith(401)
      expect(jsonSpy).toHaveBeenCalledWith({
        code: 401,
        message: '需要登录',
        timestamp: expect.any(Number)
      })
    })
  })

  describe('OSS API Error Handling Preservation (Requirement 3.4)', () => {
    it('should handle OSS API errors with 500 status', async () => {
      // Property-based test: Generate various OSS error scenarios
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(400, 403, 404, 500, 502, 503),
          async (errorStatus) => {
            const { extractAndVerifyToken } = await import('../../api/auth')
            const formidable = (await import('formidable')).default
            const fs = (await import('fs')).default
            
            vi.mocked(extractAndVerifyToken).mockReturnValue({ id: 'user123', role: 'student' })

            const mockFile = {
              originalFilename: 'test.png',
              size: 1024 * 1024,
              mimetype: 'image/png',
              filepath: '/tmp/test.png'
            }

            vi.mocked(formidable).mockReturnValue({
              parse: vi.fn((req, callback) => {
                callback(null, {}, { file: mockFile })
              })
            } as any)

            vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('fake-image-data'))

            // Mock fetch to return OSS error
            global.fetch = vi.fn().mockResolvedValue({
              ok: false,
              status: errorStatus,
              text: async () => 'OSS Error'
            })

            await handler(mockReq as VercelRequest, mockRes as VercelResponse)

            // EXPECTED BEHAVIOR: Should return 500 with Chinese error message
            expect(statusSpy).toHaveBeenCalledWith(500)
            expect(jsonSpy).toHaveBeenCalledWith({
              code: 500,
              message: '图片上传失败',
              timestamp: expect.any(Number)
            })
          }
        ),
        { numRuns: 5 }
      )
    })

    it('should handle OSS network failure', async () => {
      const { extractAndVerifyToken } = await import('../../api/auth')
      const formidable = (await import('formidable')).default
      const fs = (await import('fs')).default
      
      vi.mocked(extractAndVerifyToken).mockReturnValue({ id: 'user123', role: 'student' })

      const mockFile = {
        originalFilename: 'test.jpg',
        size: 2 * 1024 * 1024,
        mimetype: 'image/jpeg',
        filepath: '/tmp/test.jpg'
      }

      vi.mocked(formidable).mockReturnValue({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: mockFile })
        })
      } as any)

      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('fake-jpeg-data'))

      // Mock fetch to throw network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(statusSpy).toHaveBeenCalledWith(500)
      expect(jsonSpy).toHaveBeenCalledWith({
        code: 500,
        message: '图片上传失败',
        timestamp: expect.any(Number)
      })
    })
  })

  describe('Temporary File Cleanup Preservation (Requirement 3.5)', () => {
    it('should cleanup temporary files after OSS errors', async () => {
      // Property-based test: Verify cleanup happens for OSS error scenarios
      // Note: On unfixed code, successful API responses with code:200 throw errors
      // because the code checks result.status instead of result.code
      // So we test cleanup behavior with actual OSS errors (response.ok === false)
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(400, 403, 500),
          async (errorStatus) => {
            const { extractAndVerifyToken } = await import('../../api/auth')
            const formidable = (await import('formidable')).default
            const fs = (await import('fs')).default
            
            vi.mocked(extractAndVerifyToken).mockReturnValue({ id: 'user123', role: 'student' })

            const mockFilePath = '/tmp/upload-test-file'
            const mockFile = {
              originalFilename: 'test.png',
              size: 1024 * 1024,
              mimetype: 'image/png',
              filepath: mockFilePath
            }

            vi.mocked(formidable).mockReturnValue({
              parse: vi.fn((req, callback) => {
                callback(null, {}, { file: mockFile })
              })
            } as any)

            vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('fake-image-data'))
            const unlinkSpy = vi.mocked(fs.unlinkSync)

            // Mock OSS error (response.ok === false)
            global.fetch = vi.fn().mockResolvedValue({
              ok: false,
              status: errorStatus,
              text: async () => 'OSS Error'
            })

            await handler(mockReq as VercelRequest, mockRes as VercelResponse)

            // EXPECTED BEHAVIOR: Temporary file cleanup is NOT called on error
            // The code only cleans up after successful upload
            // This is the baseline behavior we want to preserve
            expect(unlinkSpy).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 3 }
      )
    })

    it('should not cleanup temp file when OSS returns error', async () => {
      const { extractAndVerifyToken } = await import('../../api/auth')
      const formidable = (await import('formidable')).default
      const fs = (await import('fs')).default
      
      vi.mocked(extractAndVerifyToken).mockReturnValue({ id: 'user123', role: 'student' })

      const mockFilePath = '/tmp/test-cleanup.png'
      const mockFile = {
        originalFilename: 'cleanup-test.png',
        size: 1024 * 1024,
        mimetype: 'image/png',
        filepath: mockFilePath
      }

      vi.mocked(formidable).mockReturnValue({
        parse: vi.fn((req, callback) => {
          callback(null, {}, { file: mockFile })
        })
      } as any)

      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('fake-image-data'))
      const unlinkSpy = vi.mocked(fs.unlinkSync)

      // Mock OSS error
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server Error'
      })

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      // OBSERVED BEHAVIOR: Cleanup is NOT called when upload fails
      // This is the baseline behavior to preserve
      expect(unlinkSpy).not.toHaveBeenCalled()
    })
  })

  describe('CORS Headers Preservation', () => {
    it('should set CORS headers for all requests', async () => {
      const { extractAndVerifyToken } = await import('../../api/auth')
      
      vi.mocked(extractAndVerifyToken).mockReturnValue(null)

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      // EXPECTED BEHAVIOR: CORS headers should be set
      expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*')
      expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, OPTIONS')
      expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    })

    it('should handle OPTIONS preflight requests', async () => {
      mockReq.method = 'OPTIONS'

      await handler(mockReq as VercelRequest, mockRes as VercelResponse)

      expect(statusSpy).toHaveBeenCalledWith(200)
      expect(endSpy).toHaveBeenCalled()
    })
  })

  describe('Method Validation Preservation', () => {
    it('should reject non-POST methods', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('GET', 'PUT', 'DELETE', 'PATCH'),
          async (method) => {
            mockReq.method = method

            await handler(mockReq as VercelRequest, mockRes as VercelResponse)

            expect(statusSpy).toHaveBeenCalledWith(405)
            expect(jsonSpy).toHaveBeenCalledWith({
              code: 405,
              message: '方法不允许',
              timestamp: expect.any(Number)
            })
          }
        ),
        { numRuns: 4 }
      )
    })
  })
})
