/**
 * Bug Condition Exploration Test for Image Upload V3 API Fix
 * 
 * **Validates: Requirements 1.2, 2.2, 2.3**
 * 
 * This test explores the bug condition where uploadToOSS fails to parse
 * successful imgurl.org V3 API responses because it checks result.status
 * instead of result.code.
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 * 
 * Expected outcome on UNFIXED code: Test FAILS with "Invalid response format" error
 * Expected outcome on FIXED code: Test PASSES
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'

// Mock the uploadToOSS function behavior
// We'll test the actual implementation by importing and mocking fetch
const mockFetch = vi.fn()
global.fetch = mockFetch as any

describe('Property 1: Bug Condition - V3 API Response Parsing with code field', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should correctly parse successful V3 API responses with code: 200', async () => {
    // Property-based test: Generate various successful V3 API responses
    await fc.assert(
      fc.asyncProperty(
        // Generate valid image URLs
        fc.webUrl({ validSchemes: ['https'] }),
        async (imageUrl) => {
          // Mock imgurl.org V3 API successful response
          const v3ApiResponse = {
            code: 200,
            data: {
              url: imageUrl
            }
          }

          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => v3ApiResponse
          })

          // Import the uploadToOSS function
          // Note: We need to dynamically import to ensure mocks are in place
          const { uploadToOSS } = await import('../test-helpers/upload-helper')

          // Create test file buffer
          const testBuffer = Buffer.from('fake-image-data')
          const testFileName = 'test-image.png'
          const testMimeType = 'image/png'

          // Call uploadToOSS
          const result = await uploadToOSS(testBuffer, testFileName, testMimeType)

          // EXPECTED BEHAVIOR: Should return the URL from result.data.url
          expect(result).toBe(imageUrl)
        }
      ),
      { numRuns: 10 } // Run 10 test cases with different URLs
    )
  })

  it('should parse V3 API response with specific example', async () => {
    // Specific example test case
    const expectedUrl = 'https://example.com/image.png'
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: 200,
        data: {
          url: expectedUrl
        }
      })
    })

    const { uploadToOSS } = await import('../test-helpers/upload-helper')
    
    const testBuffer = Buffer.from('fake-image-data')
    const result = await uploadToOSS(testBuffer, 'test.png', 'image/png')

    // EXPECTED BEHAVIOR: Should extract URL from result.data.url
    expect(result).toBe(expectedUrl)
  })

  it('should parse V3 API response with JPEG image', async () => {
    const expectedUrl = 'https://example.com/photo.jpg'
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: 200,
        data: {
          url: expectedUrl
        }
      })
    })

    const { uploadToOSS } = await import('../test-helpers/upload-helper')
    
    const testBuffer = Buffer.from('fake-jpeg-data')
    const result = await uploadToOSS(testBuffer, 'photo.jpg', 'image/jpeg')

    expect(result).toBe(expectedUrl)
  })
})
