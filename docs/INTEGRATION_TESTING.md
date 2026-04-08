# Integration Testing Guide

## Overview

This guide explains how to run automated integration tests against the real Supabase database. These tests verify that the application works correctly with actual database operations.

## Prerequisites

1. **Database Connection**: Ensure `.env.local` has valid Supabase credentials
2. **Dependencies Installed**: Run `npm install`
3. **Prisma Client Generated**: Run `npx prisma generate`
4. **Dev Server Running**: The API endpoints must be accessible

## Quick Start

### 1. Seed the Test Database

First, populate the database with test data:

```bash
npm run db:seed
```

This creates:
- 2 test users (admin and teacher)
- 2 subjects (Math, Chinese)
- 3 topics
- 2 sample questions
- 1 sample answer
- 1 sample comment

**Test Credentials:**
- Admin: Phone `13800000001`, Password `admin123`
- Teacher: Phone `13800000002`, Password `teacher123`

### 2. Start the Development Server

In a separate terminal:

```bash
npm run dev
```

Wait for the server to start (usually at `http://localhost:3000`)

### 3. Run Integration Tests

```bash
npm run test:integration
```

Or run in watch mode:

```bash
npm run test:integration:watch
```

## Test Coverage

### Authentication Tests (`auth.integration.test.ts`)
- ✅ Login with valid admin credentials
- ✅ Login with valid teacher credentials
- ✅ Reject invalid password
- ✅ Reject non-existent user
- ✅ Reject missing credentials

### Questions Tests (`questions.integration.test.ts`)
- ✅ Create question with valid data
- ✅ Reject question without authentication
- ✅ Reject empty title
- ✅ Reject title > 100 chars
- ✅ Reject content > 500 chars
- ✅ Reject > 3 images
- ✅ Get questions list without auth
- ✅ Filter by subject
- ✅ Filter by topic
- ✅ Search by keyword
- ✅ Pagination
- ✅ Get question by ID
- ✅ Update own question
- ✅ Reject unauthorized update

### Subjects Tests (`subjects.integration.test.ts`)
- ✅ Get all enabled subjects
- ✅ Create subject as admin
- ✅ Reject creation by non-admin
- ✅ Reject creation without auth
- ✅ Update subject as admin
- ✅ Reject update by non-admin
- ✅ Create topic under subject
- ✅ Get topics by subject key
- ✅ Delete topic without questions
- ✅ Delete subject without associations
- ✅ Reject delete of subject with questions (409)
- ✅ Reject delete by non-admin

## Test Structure

```
src/test/integration/
├── setup.ts                      # Test configuration and helpers
├── auth.integration.test.ts      # Authentication API tests
├── questions.integration.test.ts # Questions API tests
└── subjects.integration.test.ts  # Subjects/Topics API tests
```

## Helper Functions

### `loginAs(credentials)`
Login and get authentication token:

```typescript
const { token, user } = await loginAs(TEST_ADMIN)
```

### `authenticatedFetch(url, token, options)`
Make authenticated API requests:

```typescript
const response = await authenticatedFetch(
  `${API_BASE}/questions`,
  token,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }
)
```

### `prisma`
Direct database access for verification:

```typescript
const question = await prisma.question.findUnique({
  where: { id: questionId },
})
```

## Writing New Tests

### Example: Testing Answers API

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { API_BASE, TEST_TEACHER, loginAs, authenticatedFetch, prisma } from './setup'

describe('Answers API Integration', () => {
  let teacherToken: string
  let questionId: string

  beforeAll(async () => {
    const auth = await loginAs(TEST_TEACHER)
    teacherToken = auth.token
    
    // Get a question from seed data
    const question = await prisma.question.findFirst()
    questionId = question!.id
  })

  it('should create an answer', async () => {
    const answerData = {
      questionId,
      content: 'This is a test answer',
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

    expect(response.status).toBe(200)
    const data = await response.json()
    
    expect(data.data.content).toBe(answerData.content)

    // Verify in database
    const dbAnswer = await prisma.answer.findUnique({
      where: { id: data.data.id },
    })
    expect(dbAnswer).toBeDefined()
  })
})
```

## Troubleshooting

### Tests Fail with "Connection Refused"

**Problem**: Dev server is not running

**Solution**: Start the dev server in a separate terminal:
```bash
npm run dev
```

### Tests Fail with "User not found"

**Problem**: Database not seeded

**Solution**: Run the seed script:
```bash
npm run db:seed
```

### Tests Fail with Database Errors

**Problem**: Database schema not up to date

**Solution**: Apply migrations:
```bash
npx prisma migrate deploy
npx prisma generate
```

### Tests Pass but Data Persists

**Note**: Integration tests create real data in the database. To reset:

```bash
# Re-run seed (clears and recreates test data)
npm run db:seed
```

## Environment Variables

The tests use these environment variables from `.env.local`:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=...
VITE_API_BASE=http://localhost:3000/api
```

## CI/CD Integration

To run integration tests in CI:

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - run: npm install
      - run: npx prisma generate
      - run: npm run db:seed
      
      - name: Start dev server
        run: npm run dev &
        
      - name: Wait for server
        run: npx wait-on http://localhost:3000
        
      - name: Run integration tests
        run: npm run test:integration
```

## Best Practices

1. **Always seed before testing**: Ensures consistent test data
2. **Use test credentials**: Don't use production user accounts
3. **Clean up after tests**: Delete test data created during tests
4. **Verify in database**: Check that API changes persist to database
5. **Test error cases**: Verify proper error handling (401, 403, 400, 409)
6. **Use descriptive test names**: Make failures easy to understand

## Next Steps

- [ ] Add tests for Answers API
- [ ] Add tests for Comments API
- [ ] Add tests for Upload API
- [ ] Add E2E tests with Playwright
- [ ] Add performance tests
- [ ] Set up CI/CD pipeline

## Support

If you encounter issues:
1. Check that all prerequisites are met
2. Review the troubleshooting section
3. Check the test output for specific error messages
4. Verify database connection in Supabase dashboard
