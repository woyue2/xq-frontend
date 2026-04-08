# Real Database Testing Plan

## Overview

This document outlines the strategy for testing the simplified Q&A application with the real Supabase PostgreSQL database. The current test suite uses mocked data; this plan covers integration testing with actual database operations.

## Testing Layers

### 1. Database Setup & Migration Testing
**Goal:** Verify schema is correctly applied to the database

**Steps:**
1. Apply migrations to test database
2. Verify all 6 tables exist (User, Question, Answer, Comment, Subject, Topic)
3. Verify indexes are created
4. Verify foreign key constraints work
5. Verify cascade deletes work correctly

**Commands:**
```bash
# Apply migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Verify schema
npx prisma db pull
```

### 2. API Integration Testing
**Goal:** Test API endpoints with real database operations

**Test Categories:**

#### A. Authentication API (`api/auth.ts`)
- [ ] Login with valid credentials returns JWT token
- [ ] Login with invalid password returns 401
- [ ] JWT token can be verified and decoded
- [ ] Token contains correct user data (id, role, phone)

#### B. Questions API (`api/questions.ts`)
- [ ] Create question with valid data saves to database
- [ ] Created question can be retrieved by ID
- [ ] Question list returns paginated results
- [ ] Filter by subject returns only matching questions
- [ ] Filter by topic returns only matching questions
- [ ] Search by title/content returns relevant results
- [ ] Update question modifies database record
- [ ] Update requires author permission (403 for non-author)
- [ ] Validation rejects title > 100 chars
- [ ] Validation rejects content > 500 chars
- [ ] Validation rejects > 3 images

#### C. Answers API (`api/answers.ts`)
- [ ] Create answer saves to database
- [ ] Get answers by questionId returns all answers
- [ ] Answer includes author info (name, avatar)
- [ ] Validation rejects empty content
- [ ] Cascade delete: deleting question deletes answers

#### D. Comments API (`api/comments.ts`)
- [ ] Create comment saves to database
- [ ] Get comments by questionId returns all comments
- [ ] Comment includes author info
- [ ] Validation rejects empty content
- [ ] Cascade delete: deleting question deletes comments

#### E. Subjects/Topics API (`api/subjects.ts`)
- [ ] Get subjects returns only enabled subjects
- [ ] Create subject (admin only) saves to database
- [ ] Update subject modifies database record
- [ ] Delete subject without associations succeeds
- [ ] Delete subject with questions returns 409
- [ ] Delete subject with topics returns 409
- [ ] Get topics by subjectKey returns filtered list
- [ ] Create topic saves with correct subjectKey
- [ ] Delete topic without questions succeeds
- [ ] Delete topic with questions returns 409
- [ ] Non-admin cannot create/update/delete (403)

#### F. Upload API (`api/upload.ts`)
- [ ] Upload valid image returns public URL
- [ ] Uploaded file exists in Supabase Storage
- [ ] Validation rejects invalid format
- [ ] Validation rejects file > 5MB
- [ ] URL is accessible publicly

### 3. End-to-End User Flows
**Goal:** Test complete user journeys through the application

#### Flow 1: Guest User Browsing
1. Visit homepage without login
2. See list of questions
3. Click on a question
4. View question details, answers, and comments
5. Try to create question → redirected to login

#### Flow 2: Teacher Creates Question
1. Login with teacher credentials
2. Navigate to /create
3. Fill in title, content, select subject and topic
4. Upload 1-2 images
5. Submit form
6. Verify question appears in database
7. Verify question appears on homepage
8. Click on created question
9. Verify all data displays correctly

#### Flow 3: Teacher Answers Question
1. Login as teacher
2. View question detail page
3. Click "Answer" button
4. Write answer content
5. Upload image (optional)
6. Submit answer
7. Verify answer appears in database
8. Verify answer displays on question page

#### Flow 4: Teacher Comments on Question
1. Login as teacher
2. View question detail page
3. Click "Comment" button
4. Write comment
5. Submit comment
6. Verify comment appears in database
7. Verify comment displays on question page

#### Flow 5: Admin Manages Subjects
1. Login as admin
2. Navigate to /admin/subjects
3. Create new subject
4. Verify subject appears in list
5. Edit subject details
6. Create topic under subject
7. Try to delete subject with topic → see 409 error
8. Delete topic first
9. Delete subject successfully

#### Flow 6: Question Filtering & Search
1. Visit homepage
2. Filter by subject → verify results
3. Filter by topic → verify results
4. Search by keyword → verify results
5. Combine filters → verify results
6. Test pagination

### 4. Data Integrity Testing
**Goal:** Verify database constraints and relationships

**Tests:**
- [ ] Cannot create duplicate subject key
- [ ] Cannot create duplicate topic value within same subject
- [ ] Deleting question cascades to answers
- [ ] Deleting question cascades to comments
- [ ] Deleting subject cascades to topics
- [ ] User phone must be unique
- [ ] Foreign key constraints prevent orphaned records

### 5. Performance Testing
**Goal:** Verify application performs well with realistic data

**Setup:**
- Seed database with 100 questions
- Seed 500 answers across questions
- Seed 1000 comments across questions
- Create 10 subjects with 50 topics each

**Tests:**
- [ ] Homepage loads in < 2 seconds
- [ ] Question detail page loads in < 1 second
- [ ] Search returns results in < 1 second
- [ ] Pagination works smoothly
- [ ] No N+1 query problems

## Test Environment Setup

### Option 1: Separate Test Database (Recommended)
Create a separate Supabase project for testing:

```bash
# .env.test
DATABASE_URL=postgresql://[test-db-connection]
DIRECT_URL=postgresql://[test-db-connection]
JWT_SECRET=[same-as-prod]
```

**Advantages:**
- Safe to run destructive tests
- Can reset database between test runs
- No risk to production data

### Option 2: Local PostgreSQL
Run PostgreSQL locally with Docker:

```bash
docker run -d \
  --name qa-test-db \
  -e POSTGRES_PASSWORD=testpass \
  -e POSTGRES_DB=qa_test \
  -p 5433:5432 \
  postgres:15

# .env.test
DATABASE_URL=postgresql://postgres:testpass@localhost:5433/qa_test
DIRECT_URL=postgresql://postgres:testpass@localhost:5433/qa_test
```

### Option 3: Use Production Database (Not Recommended)
Only for read-only tests or with extreme caution.

## Test Data Seeding

Create seed script for consistent test data:

```typescript
// prisma/seed.test.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seed() {
  // Create test users
  const adminPassword = await bcrypt.hash('admin123', 10)
  const teacherPassword = await bcrypt.hash('teacher123', 10)
  
  const admin = await prisma.user.create({
    data: {
      phone: '13800000001',
      nickname: 'Test Admin',
      role: 'admin',
      passwordHash: adminPassword
    }
  })
  
  const teacher = await prisma.user.create({
    data: {
      phone: '13800000002',
      nickname: 'Test Teacher',
      role: 'teacher',
      passwordHash: teacherPassword
    }
  })
  
  // Create subjects
  const mathSubject = await prisma.subject.create({
    data: {
      key: 'math',
      name: '数学',
      order: 1,
      enabled: true
    }
  })
  
  // Create topics
  await prisma.topic.create({
    data: {
      subjectKey: 'math',
      value: 'algebra',
      label: '代数',
      order: 1,
      enabled: true
    }
  })
  
  // Create sample questions
  await prisma.question.create({
    data: {
      title: '如何解一元二次方程？',
      content: '请详细说明解题步骤',
      subject: 'math',
      tags: ['algebra'],
      images: [],
      authorId: teacher.id,
      authorName: teacher.nickname,
      authorAvatar: teacher.avatar
    }
  })
  
  console.log('Test data seeded successfully')
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Run seed:
```bash
npx tsx prisma/seed.test.ts
```

## Integration Test Implementation

Create integration test file:

```typescript
// src/test/integration/api.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const API_BASE = 'http://localhost:3000/api'

describe('API Integration Tests', () => {
  let authToken: string
  let testUserId: string
  
  beforeAll(async () => {
    // Login to get auth token
    const response = await fetch(`${API_BASE}/auth?action=password-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '13800000002',
        password: 'teacher123'
      })
    })
    const data = await response.json()
    authToken = data.data.token
    testUserId = data.data.user.id
  })
  
  afterAll(async () => {
    await prisma.$disconnect()
  })
  
  describe('Questions API', () => {
    it('should create a question', async () => {
      const response = await fetch(`${API_BASE}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: 'Integration Test Question',
          content: 'This is a test',
          subject: 'math',
          tags: ['algebra'],
          images: []
        })
      })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.id).toBeDefined()
      
      // Verify in database
      const question = await prisma.question.findUnique({
        where: { id: data.data.id }
      })
      expect(question).toBeDefined()
      expect(question?.title).toBe('Integration Test Question')
    })
  })
})
```

## Manual Testing Checklist

### Pre-Testing Setup
- [ ] Database migrations applied
- [ ] Test data seeded
- [ ] Dev server running (`npm run dev`)
- [ ] Test credentials ready

### Authentication
- [ ] Login with valid credentials
- [ ] Login with invalid credentials shows error
- [ ] Token persists in localStorage
- [ ] Logout clears token

### Question Management
- [ ] Create question with all fields
- [ ] Create question with minimal fields
- [ ] Edit own question
- [ ] Cannot edit others' question
- [ ] Question appears on homepage
- [ ] Question detail page shows all data

### Answers & Comments
- [ ] Add answer to question
- [ ] Add comment to question
- [ ] Answer/comment shows author info
- [ ] Answer/comment shows timestamp

### Subject/Topic Management (Admin)
- [ ] View subjects list
- [ ] Create new subject
- [ ] Edit subject
- [ ] Delete empty subject
- [ ] Cannot delete subject with questions
- [ ] Create topic under subject
- [ ] Edit topic
- [ ] Delete empty topic
- [ ] Cannot delete topic with questions

### Filtering & Search
- [ ] Filter by subject
- [ ] Filter by topic
- [ ] Search by keyword
- [ ] Pagination works
- [ ] Clear filters

### Image Upload
- [ ] Upload valid image
- [ ] Image displays correctly
- [ ] Cannot upload invalid format
- [ ] Cannot upload oversized file

### Error Handling
- [ ] 401 redirects to login
- [ ] 403 shows permission error
- [ ] 400 shows validation errors
- [ ] 409 shows conflict message
- [ ] 500 shows generic error

## Execution Plan

### Phase 1: Database Setup (Day 1)
1. Create test database
2. Apply migrations
3. Create seed script
4. Verify schema

### Phase 2: API Integration Tests (Day 2-3)
1. Write integration tests for each API
2. Run tests against test database
3. Fix any issues found
4. Achieve 100% API coverage

### Phase 3: E2E Flow Testing (Day 4)
1. Manual testing of all user flows
2. Document any bugs found
3. Fix critical issues
4. Retest fixed issues

### Phase 4: Performance Testing (Day 5)
1. Seed large dataset
2. Test page load times
3. Identify bottlenecks
4. Optimize queries if needed

### Phase 5: Final Validation (Day 6)
1. Run full test suite
2. Manual smoke test
3. Document test results
4. Sign off for production

## Success Criteria

- [ ] All migrations apply successfully
- [ ] All API integration tests pass
- [ ] All E2E flows complete without errors
- [ ] No data integrity issues
- [ ] Performance meets targets (< 2s page loads)
- [ ] Error handling works correctly
- [ ] No console errors in browser
- [ ] All CRUD operations work correctly

## Tools & Resources

**Testing Tools:**
- Vitest (unit/integration tests)
- Playwright (E2E tests - optional)
- Postman/Thunder Client (API testing)
- Prisma Studio (database inspection)

**Monitoring:**
- Browser DevTools (Network, Console)
- Supabase Dashboard (query logs)
- Vercel Logs (serverless function logs)

**Documentation:**
- API_REFERENCE.md (API endpoints)
- requirements.md (acceptance criteria)
- design.md (technical specs)

## Risk Mitigation

**Risk:** Accidentally modifying production data
**Mitigation:** Always use separate test database

**Risk:** Test data conflicts
**Mitigation:** Clear database between test runs

**Risk:** Flaky tests due to timing
**Mitigation:** Use proper async/await and retries

**Risk:** Missing edge cases
**Mitigation:** Review requirements.md for all acceptance criteria

## Next Steps

1. Review this plan with team
2. Set up test database
3. Create seed script
4. Begin Phase 1 execution
5. Track progress in tasks.md
