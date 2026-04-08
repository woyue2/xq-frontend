import { describe, it, expect } from 'vitest'
import { API_BASE, TEST_ADMIN, TEST_TEACHER } from './setup'

describe('Authentication API Integration', () => {
  describe('POST /api/auth?action=password-login', () => {
    it('should login with valid admin credentials', async () => {
      const response = await fetch(`${API_BASE}/auth?action=password-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_ADMIN),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.code).toBe(200)
      expect(data.data.token).toBeDefined()
      expect(typeof data.data.token).toBe('string')
      expect(data.data.user).toBeDefined()
      expect(data.data.user.phone).toBe(TEST_ADMIN.phone)
      expect(data.data.user.role).toBe('admin')
    })

    it('should login with valid teacher credentials', async () => {
      const response = await fetch(`${API_BASE}/auth?action=password-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_TEACHER),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.code).toBe(200)
      expect(data.data.token).toBeDefined()
      expect(data.data.user.phone).toBe(TEST_TEACHER.phone)
      expect(data.data.user.role).toBe('teacher')
    })

    it('should reject invalid password', async () => {
      const response = await fetch(`${API_BASE}/auth?action=password-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: TEST_ADMIN.phone,
          password: 'wrongpassword',
        }),
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.code).toBe(401)
    })

    it('should reject non-existent user', async () => {
      const response = await fetch(`${API_BASE}/auth?action=password-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '99999999999',
          password: 'anypassword',
        }),
      })

      expect(response.status).toBe(401)
    })

    it('should reject missing credentials', async () => {
      const response = await fetch(`${API_BASE}/auth?action=password-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
    })
  })
})
