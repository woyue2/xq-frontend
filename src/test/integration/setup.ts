import { beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()

// Base API URL - adjust based on your setup
export const API_BASE = process.env.VITE_API_BASE || 'http://localhost:3000/api'

// Test credentials
export const TEST_ADMIN = {
  phone: '13800000001',
  password: 'admin123',
}

export const TEST_TEACHER = {
  phone: '13800000002',
  password: 'teacher123',
}

// Helper to login and get token
export async function loginAs(credentials: { phone: string; password: string }) {
  const response = await fetch(`${API_BASE}/auth?action=password-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`)
  }

  const data = await response.json()
  return {
    token: data.data.token,
    user: data.data.user,
  }
}

// Helper to make authenticated requests
export async function authenticatedFetch(
  url: string,
  token: string,
  options: RequestInit = {}
) {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}

// Global setup
beforeAll(async () => {
  console.log('🔧 Setting up integration tests...')
  // Verify database connection
  try {
    await prisma.$connect()
    console.log('✅ Database connected')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
})

// Global teardown
afterAll(async () => {
  console.log('🧹 Cleaning up integration tests...')
  await prisma.$disconnect()
})
