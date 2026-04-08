import { describe, it, expect, beforeAll } from 'vitest'
import { API_BASE, TEST_ADMIN, TEST_TEACHER, loginAs, authenticatedFetch, prisma } from './setup'

describe('Subjects API Integration', () => {
  let adminToken: string
  let teacherToken: string
  let testSubjectId: string
  let testSubjectKey: string
  let testTopicId: string

  beforeAll(async () => {
    const adminAuth = await loginAs(TEST_ADMIN)
    adminToken = adminAuth.token

    const teacherAuth = await loginAs(TEST_TEACHER)
    teacherToken = teacherAuth.token
  })

  describe('GET /api/subjects', () => {
    it('should get all enabled subjects without authentication', async () => {
      const response = await fetch(`${API_BASE}/subjects`)

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.code).toBe(200)
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBeGreaterThan(0)
      
      // All subjects should be enabled
      data.data.forEach((subject: any) => {
        expect(subject.enabled).toBe(true)
      })
    })
  })

  describe('POST /api/subjects', () => {
    it('should create subject as admin', async () => {
      const timestamp = Date.now()
      const subjectData = {
        key: `test-subject-${timestamp}`,
        name: 'Test Subject',
        description: 'Created by integration test',
        order: 99,
        enabled: true,
      }

      const response = await authenticatedFetch(
        `${API_BASE}/subjects`,
        adminToken,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subjectData),
        }
      )

      expect(response.status).toBe(201)
      const data = await response.json()
      
      expect(data.code).toBe(201)
      expect(data.data.key).toBe(subjectData.key)
      expect(data.data.name).toBe(subjectData.name)

      testSubjectId = data.data.id
      testSubjectKey = data.data.key

      // Verify in database
      const dbSubject = await prisma.subject.findUnique({
        where: { key: subjectData.key },
      })
      expect(dbSubject).toBeDefined()
      expect(dbSubject?.name).toBe(subjectData.name)
    })

    it('should reject subject creation by non-admin', async () => {
      const response = await authenticatedFetch(
        `${API_BASE}/subjects`,
        teacherToken,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'unauthorized-subject',
            name: 'Unauthorized',
            order: 1,
          }),
        }
      )

      expect(response.status).toBe(403)
    })

    it('should reject subject creation without authentication', async () => {
      const response = await fetch(`${API_BASE}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'no-auth-subject',
          name: 'No Auth',
          order: 1,
        }),
      })

      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/subjects?id=:id', () => {
    it('should update subject as admin', async () => {
      const updateData = {
        name: 'Updated Test Subject',
        description: 'Updated description',
        order: 100,
      }

      const response = await authenticatedFetch(
        `${API_BASE}/subjects?id=${testSubjectId}`,
        adminToken,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.data.name).toBe(updateData.name)
      expect(data.data.description).toBe(updateData.description)

      // Verify in database
      const dbSubject = await prisma.subject.findUnique({
        where: { id: testSubjectId },
      })
      expect(dbSubject?.name).toBe(updateData.name)
    })

    it('should reject update by non-admin', async () => {
      const response = await authenticatedFetch(
        `${API_BASE}/subjects?id=${testSubjectId}`,
        teacherToken,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Unauthorized Update' }),
        }
      )

      expect(response.status).toBe(403)
    })
  })

  describe('Topics Management', () => {
    let testTopicId: string

    it('should create topic under subject', async () => {
      const timestamp = Date.now()
      const topicData = {
        subjectKey: testSubjectKey,
        value: `test-topic-${timestamp}`,
        label: 'Test Topic',
        order: 1,
        enabled: true,
      }

      const response = await authenticatedFetch(
        `${API_BASE}/subjects?topics=1`,
        adminToken,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(topicData),
        }
      )

      expect(response.status).toBe(201)
      const data = await response.json()
      
      expect(data.code).toBe(201)
      expect(data.data.value).toBe(topicData.value)
      expect(data.data.label).toBe(topicData.label)
      expect(data.data.subjectKey).toBe(topicData.subjectKey)

      testTopicId = data.data.id

      // Verify in database
      const dbTopic = await prisma.topic.findUnique({
        where: { id: testTopicId },
      })
      expect(dbTopic).toBeDefined()
    })

    it('should get topics by subject key', async () => {
      const response = await fetch(`${API_BASE}/subjects?key=test-subject&topics=1`)

      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBeGreaterThan(0)
      
      data.data.forEach((topic: any) => {
        expect(topic.subjectKey).toBe('test-subject')
      })
    })

    it('should delete topic without questions', async () => {
      const response = await authenticatedFetch(
        `${API_BASE}/subjects?topicId=${testTopicId}`,
        adminToken,
        {
          method: 'DELETE',
        }
      )

      expect(response.status).toBe(200)

      // Verify deleted from database
      const dbTopic = await prisma.topic.findUnique({
        where: { id: testTopicId },
      })
      expect(dbTopic).toBeNull()
    })
  })

  describe('DELETE /api/subjects?id=:id', () => {
    it('should delete subject without associations', async () => {
      const response = await authenticatedFetch(
        `${API_BASE}/subjects?id=${testSubjectId}`,
        adminToken,
        {
          method: 'DELETE',
        }
      )

      expect(response.status).toBe(200)

      // Verify deleted from database
      const dbSubject = await prisma.subject.findUnique({
        where: { id: testSubjectId },
      })
      expect(dbSubject).toBeNull()
    })

    it('should reject delete of subject with questions (409)', async () => {
      // Math subject has questions from seed data
      const mathSubject = await prisma.subject.findUnique({
        where: { key: 'math' },
      })

      const response = await authenticatedFetch(
        `${API_BASE}/subjects?id=${mathSubject?.id}`,
        adminToken,
        {
          method: 'DELETE',
        }
      )

      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.message).toContain('关联')
    })

    it('should reject delete by non-admin', async () => {
      const response = await authenticatedFetch(
        `${API_BASE}/subjects?id=${testSubjectId}`,
        teacherToken,
        {
          method: 'DELETE',
        }
      )

      expect(response.status).toBe(403)
    })
  })
})
