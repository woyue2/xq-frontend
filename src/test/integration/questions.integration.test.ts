import { describe, it, expect, beforeAll } from 'vitest'
import { API_BASE, TEST_TEACHER, loginAs, authenticatedFetch, prisma } from './setup'

describe('Questions API Integration', () => {
  let teacherToken: string
  let teacherUserId: string
  let createdQuestionId: string

  beforeAll(async () => {
    const auth = await loginAs(TEST_TEACHER)
    teacherToken = auth.token
    teacherUserId = auth.user.id
  })

  describe('POST /api/questions', () => {
    it('should create a question with valid data', async () => {
      const questionData = {
        title: 'Integration Test Question',
        content: 'This is a test question created by integration test',
        subject: 'math',
        tags: ['algebra'],
        images: [],
      }

      const response = await authenticatedFetch(
        `${API_BASE}/questions`,
        teacherToken,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(questionData),
        }
      )

      expect(response.status).toBe(201)
      const data = await response.json()
      
      expect(data.code).toBe(201)
      expect(data.data.id).toBeDefined()
      expect(data.data.title).toBe(questionData.title)
      expect(data.data.content).toBe(questionData.content)
      expect(data.data.subject).toBe(questionData.subject)
      expect(data.data.tags).toEqual(questionData.tags)

      createdQuestionId = data.data.id

      // Verify in database
      const dbQuestion = await prisma.question.findUnique({
        where: { id: createdQuestionId },
      })
      expect(dbQuestion).toBeDefined()
      expect(dbQuestion?.title).toBe(questionData.title)
      expect(dbQuestion?.authorId).toBe(teacherUserId)
    })

    it('should reject question without authentication', async () => {
      const response = await fetch(`${API_BASE}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Unauthorized Question',
          subject: 'math',
        }),
      })

      expect(response.status).toBe(401)
    })

    it('should reject question with empty title', async () => {
      const response = await authenticatedFetch(
        `${API_BASE}/questions`,
        teacherToken,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: '',
            subject: 'math',
          }),
        }
      )

      expect(response.status).toBe(400)
    })

    it('should reject question with title > 100 chars', async () => {
      const response = await authenticatedFetch(
        `${API_BASE}/questions`,
        teacherToken,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'a'.repeat(101),
            subject: 'math',
          }),
        }
      )

      expect(response.status).toBe(400)
    })

    it('should reject question with content > 500 chars', async () => {
      const response = await authenticatedFetch(
        `${API_BASE}/questions`,
        teacherToken,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Valid Title',
            content: 'a'.repeat(501),
            subject: 'math',
          }),
        }
      )

      expect(response.status).toBe(400)
    })

    it('should reject question with > 3 images', async () => {
      const response = await authenticatedFetch(
        `${API_BASE}/questions`,
        teacherToken,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Valid Title',
            subject: 'math',
            images: ['url1', 'url2', 'url3', 'url4'],
          }),
        }
      )

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/questions', () => {
    it('should get questions list without authentication', async () => {
      const response = await fetch(`${API_BASE}/questions`)

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.code).toBe(200)
      expect(Array.isArray(data.data.items)).toBe(true)
      expect(data.data.total).toBeGreaterThan(0)
    })

    it('should filter questions by subject', async () => {
      const response = await fetch(`${API_BASE}/questions?subject=math`)

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(Array.isArray(data.data.items)).toBe(true)
      data.data.items.forEach((q: any) => {
        expect(q.subject).toBe('math')
      })
    })

    it('should filter questions by topic', async () => {
      const response = await fetch(`${API_BASE}/questions?topic=algebra`)

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(Array.isArray(data.data.items)).toBe(true)
      data.data.items.forEach((q: any) => {
        expect(q.tags).toContain('algebra')
      })
    })

    it('should search questions by keyword', async () => {
      const response = await fetch(`${API_BASE}/questions?search=方程`)

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(Array.isArray(data.data.items)).toBe(true)
      if (data.data.items.length > 0) {
        const hasKeyword = data.data.items.some((q: any) =>
          q.title.includes('方程') || q.content?.includes('方程')
        )
        expect(hasKeyword).toBe(true)
      }
    })

    it('should paginate results', async () => {
      const page1 = await fetch(`${API_BASE}/questions?page=1&pageSize=2`)
      const page2 = await fetch(`${API_BASE}/questions?page=2&pageSize=2`)

      expect(page1.status).toBe(200)
      expect(page2.status).toBe(200)

      const data1 = await page1.json()
      const data2 = await page2.json()

      expect(data1.data.items.length).toBeLessThanOrEqual(2)
      expect(data2.data.items.length).toBeLessThanOrEqual(2)

      // Verify different pages have different items
      if (data1.data.items.length > 0 && data2.data.items.length > 0) {
        expect(data1.data.items[0].id).not.toBe(data2.data.items[0].id)
      }
    })
  })

  describe('GET /api/questions?id=:id', () => {
    it('should get question by id', async () => {
      const response = await fetch(`${API_BASE}/questions?id=${createdQuestionId}`)

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.code).toBe(200)
      expect(data.data.id).toBe(createdQuestionId)
      expect(data.data.title).toBeDefined()
    })

    it('should return 404 for non-existent question', async () => {
      const response = await fetch(`${API_BASE}/questions?id=nonexistent`)

      expect(response.status).toBe(404)
    })
  })

  describe('PUT /api/questions?id=:id', () => {
    it('should update own question', async () => {
      const updateData = {
        title: 'Updated Integration Test Question',
        content: 'Updated content',
        subject: 'chinese',
        tags: ['reading'],
      }

      const response = await authenticatedFetch(
        `${API_BASE}/questions?id=${createdQuestionId}`,
        teacherToken,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.data.title).toBe(updateData.title)
      expect(data.data.content).toBe(updateData.content)
      expect(data.data.subject).toBe(updateData.subject)

      // Verify in database
      const dbQuestion = await prisma.question.findUnique({
        where: { id: createdQuestionId },
      })
      expect(dbQuestion?.title).toBe(updateData.title)
    })

    it('should reject update without authentication', async () => {
      const response = await fetch(`${API_BASE}/questions?id=${createdQuestionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Unauthorized Update' }),
      })

      expect(response.status).toBe(401)
    })
  })
})
