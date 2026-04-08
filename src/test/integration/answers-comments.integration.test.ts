import { describe, it, expect, beforeAll } from 'vitest'
import { API_BASE, TEST_TEACHER, loginAs, authenticatedFetch, prisma } from './setup'

describe('Answers and Comments API Integration', () => {
  let teacherToken: string
  let questionId: string
  let createdAnswerId: string

  beforeAll(async () => {
    const auth = await loginAs(TEST_TEACHER)
    teacherToken = auth.token

    // Get a question from seed data
    const question = await prisma.question.findFirst()
    if (!question) {
      throw new Error('No questions found in database. Run seed script first.')
    }
    questionId = question.id
  })

  describe('Answers API', () => {
    describe('POST /api/answers', () => {
      it('should create an answer with valid data', async () => {
        const answerData = {
          questionId,
          content: 'This is an integration test answer',
          images: [],
        }

        const response = await authenticatedFetch(
          `${API_BASE}/answers`,
          teacherToken,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(answerData),
          }
        )

        expect(response.status).toBe(201)
        const data = await response.json()

        expect(data.code).toBe(201)
        expect(data.data.id).toBeDefined()
        expect(data.data.content).toBe(answerData.content)
        expect(data.data.questionId).toBe(questionId)

        createdAnswerId = data.data.id

        // Verify in database
        const dbAnswer = await prisma.answer.findUnique({
          where: { id: createdAnswerId },
        })
        expect(dbAnswer).toBeDefined()
        expect(dbAnswer?.content).toBe(answerData.content)
      })

      it('should reject answer without authentication', async () => {
        const response = await fetch(`${API_BASE}/answers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId,
            content: 'Unauthorized answer',
          }),
        })

        expect(response.status).toBe(401)
      })

      it('should reject answer with empty content', async () => {
        const response = await authenticatedFetch(
          `${API_BASE}/answers`,
          teacherToken,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionId,
              content: '',
            }),
          }
        )

        expect(response.status).toBe(400)
      })

      it('should reject answer without questionId', async () => {
        const response = await authenticatedFetch(
          `${API_BASE}/answers`,
          teacherToken,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: 'Answer without question',
            }),
          }
        )

        expect(response.status).toBe(400)
      })
    })

    describe('GET /api/answers?questionId=:id', () => {
      it('should get all answers for a question', async () => {
        const response = await fetch(`${API_BASE}/answers?questionId=${questionId}`)

        expect(response.status).toBe(200)
        const data = await response.json()

        expect(data.code).toBe(200)
        expect(Array.isArray(data.data)).toBe(true)
        expect(data.data.length).toBeGreaterThan(0)

        // All answers should belong to the question
        data.data.forEach((answer: any) => {
          expect(answer.questionId).toBe(questionId)
          expect(answer.content).toBeDefined()
          expect(answer.authorName).toBeDefined()
        })
      })

      it('should return empty array for question with no answers', async () => {
        // Create a new question without answers
        const newQuestion = await prisma.question.create({
          data: {
            title: 'Question without answers',
            subject: 'math',
            tags: [],
            images: [],
            authorId: 'test',
            authorName: 'Test',
          },
        })

        const response = await fetch(`${API_BASE}/answers?questionId=${newQuestion.id}`)

        expect(response.status).toBe(200)
        const data = await response.json()

        expect(Array.isArray(data.data)).toBe(true)
        expect(data.data.length).toBe(0)

        // Clean up
        await prisma.question.delete({ where: { id: newQuestion.id } })
      })
    })
  })

  describe('Comments API', () => {
    let createdCommentId: string

    describe('POST /api/comments', () => {
      it('should create a comment with valid data', async () => {
        const commentData = {
          questionId,
          content: 'This is an integration test comment',
          image: null,
        }

        const response = await authenticatedFetch(
          `${API_BASE}/comments`,
          teacherToken,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(commentData),
          }
        )

        expect(response.status).toBe(201)
        const data = await response.json()

        expect(data.code).toBe(201)
        expect(data.data.id).toBeDefined()
        expect(data.data.content).toBe(commentData.content)
        expect(data.data.questionId).toBe(questionId)

        createdCommentId = data.data.id

        // Verify in database
        const dbComment = await prisma.comment.findUnique({
          where: { id: createdCommentId },
        })
        expect(dbComment).toBeDefined()
        expect(dbComment?.content).toBe(commentData.content)
      })

      it('should create comment with image', async () => {
        const commentData = {
          questionId,
          content: 'Comment with image',
          image: 'https://example.com/image.jpg',
        }

        const response = await authenticatedFetch(
          `${API_BASE}/comments`,
          teacherToken,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(commentData),
          }
        )

        expect(response.status).toBe(201)
        const data = await response.json()

        expect(data.code).toBe(201)
      })

      it('should reject comment without authentication', async () => {
        const response = await fetch(`${API_BASE}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId,
            content: 'Unauthorized comment',
          }),
        })

        expect(response.status).toBe(401)
      })

      it('should reject comment with empty content', async () => {
        const response = await authenticatedFetch(
          `${API_BASE}/comments`,
          teacherToken,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionId,
              content: '',
            }),
          }
        )

        expect(response.status).toBe(400)
      })

      it('should reject comment without questionId', async () => {
        const response = await authenticatedFetch(
          `${API_BASE}/comments`,
          teacherToken,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: 'Comment without question',
            }),
          }
        )

        expect(response.status).toBe(400)
      })
    })

    describe('GET /api/comments?questionId=:id', () => {
      it('should get all comments for a question', async () => {
        const response = await fetch(`${API_BASE}/comments?questionId=${questionId}`)

        expect(response.status).toBe(200)
        const data = await response.json()

        expect(data.code).toBe(200)
        expect(Array.isArray(data.data)).toBe(true)
        expect(data.data.length).toBeGreaterThan(0)

        // All comments should belong to the question
        data.data.forEach((comment: any) => {
          expect(comment.questionId).toBe(questionId)
          expect(comment.content).toBeDefined()
          expect(comment.authorName).toBeDefined()
        })
      })

      it('should return empty array for question with no comments', async () => {
        // Create a new question without comments
        const newQuestion = await prisma.question.create({
          data: {
            title: 'Question without comments',
            subject: 'math',
            tags: [],
            images: [],
            authorId: 'test',
            authorName: 'Test',
          },
        })

        const response = await fetch(`${API_BASE}/comments?questionId=${newQuestion.id}`)

        expect(response.status).toBe(200)
        const data = await response.json()

        expect(Array.isArray(data.data)).toBe(true)
        expect(data.data.length).toBe(0)

        // Clean up
        await prisma.question.delete({ where: { id: newQuestion.id } })
      })
    })
  })

  describe('Cascade Delete', () => {
    it('should delete answers when question is deleted', async () => {
      // Create a test question with answer
      const testQuestion = await prisma.question.create({
        data: {
          title: 'Test cascade delete',
          subject: 'math',
          tags: [],
          images: [],
          authorId: 'test',
          authorName: 'Test',
        },
      })

      const testAnswer = await prisma.answer.create({
        data: {
          questionId: testQuestion.id,
          content: 'Test answer',
          images: [],
          authorId: 'test',
          authorName: 'Test',
        },
      })

      // Delete the question
      await prisma.question.delete({ where: { id: testQuestion.id } })

      // Verify answer was also deleted (cascade)
      const deletedAnswer = await prisma.answer.findUnique({
        where: { id: testAnswer.id },
      })
      expect(deletedAnswer).toBeNull()
    })

    it('should delete comments when question is deleted', async () => {
      // Create a test question with comment
      const testQuestion = await prisma.question.create({
        data: {
          title: 'Test cascade delete comments',
          subject: 'math',
          tags: [],
          images: [],
          authorId: 'test',
          authorName: 'Test',
        },
      })

      const testComment = await prisma.comment.create({
        data: {
          questionId: testQuestion.id,
          content: 'Test comment',
          authorId: 'test',
          authorName: 'Test',
        },
      })

      // Delete the question
      await prisma.question.delete({ where: { id: testQuestion.id } })

      // Verify comment was also deleted (cascade)
      const deletedComment = await prisma.comment.findUnique({
        where: { id: testComment.id },
      })
      expect(deletedComment).toBeNull()
    })
  })
})
