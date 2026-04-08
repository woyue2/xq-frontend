# Testing Guide - Simplified Version

## Prerequisites

1. **Vercel CLI** (for full stack testing)
   ```bash
   npm install -g vercel
   ```

2. **Environment Variables**
   - `.env.local` file exists with DATABASE_URL
   - All required env vars are set

---

## Testing Options

### Option 1: Full Stack Testing (RECOMMENDED)

Use Vercel Dev to test both frontend and API:

```bash
vercel dev
```

**What it does**:
- Starts Vite frontend on `http://localhost:3000`
- Starts all 6 API serverless functions:
  - `/api/auth` - Password login
  - `/api/questions` - Question CRUD
  - `/api/answers` - Answer CRUD
  - `/api/comments` - Comment CRUD
  - `/api/subjects` - Subject/Topic management
  - `/api/upload` - Image upload
- Connects to Supabase database
- Simulates production environment

**Test Flow**:
1. Open `http://localhost:3000`
2. Try logging in (password login)
3. Create a question
4. View question details
5. Add an answer
6. Test admin subjects page (if admin user)

---

### Option 2: Frontend Only Testing

Use Vite dev server (API calls will fail):

```bash
npm run dev
```

**What it does**:
- Starts Vite frontend on `http://localhost:5173`
- Fast HMR (Hot Module Replacement)
- No backend - API calls will fail

**Use when**:
- Testing UI components only
- Testing styling/layout
- Not testing API integration

---

### Option 3: API Testing Only

Test API endpoints directly without frontend:

```bash
# Start Vercel dev in API-only mode
vercel dev --listen 3000

# Then use curl or Postman to test endpoints
curl -X POST http://localhost:3000/api/auth?action=password-login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"password123"}'
```

---

## Verification Checklist

### 1. TypeScript Compilation
```bash
npx tsc --noEmit
```
**Expected**: 0 errors

### 2. Build Process
```bash
npm run build
```
**Expected**: Build succeeds, creates `dist/` folder

### 3. Unit Tests
```bash
npm run test
```
**Expected**: All tests pass

### 4. Integration Tests
```bash
npm run test:integration
```
**Expected**: 47 tests pass (requires DATABASE_URL)

### 5. Dev Server
```bash
vercel dev
```
**Expected**: Server starts on port 3000

### 6. Manual Testing

#### Test 1: Login
1. Navigate to `http://localhost:3000/login`
2. Enter phone: `13800138000`
3. Enter password: `password123`
4. Click "登录"
5. **Expected**: Redirect to home page

#### Test 2: Create Question
1. Click "提问" button
2. Fill in title, content, select subject
3. Click "发布问题"
4. **Expected**: Question created, redirect to question detail

#### Test 3: Admin Subjects
1. Login as admin user
2. Navigate to `/admin/subjects`
3. Try adding/editing subjects and topics
4. **Expected**: CRUD operations work

---

## Troubleshooting

### Issue: Vercel CLI not found
```bash
npm install -g vercel
# or
npx vercel dev
```

### Issue: DATABASE_URL not found
Check `.env.local` file exists and contains:
```
DATABASE_URL=postgresql://...
```

### Issue: Prisma Client errors
```bash
npx prisma generate
```

### Issue: Port already in use
```bash
# Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port:
vercel dev --listen 3001
```

### Issue: API returns 404
Check `vercel.json` rewrites are correct:
- `/api/auth` → `api/auth.ts`
- `/api/questions` → `api/questions.ts`
- etc.

---

## API Endpoints Reference

### Auth API
- `POST /api/auth?action=password-login` - Login with password
  ```json
  { "phone": "13800138000", "password": "password123" }
  ```

### Questions API
- `GET /api/questions` - List questions
- `GET /api/questions?id={id}` - Get question by ID
- `POST /api/questions` - Create question
- `PUT /api/questions?id={id}` - Update question
- `DELETE /api/questions?id={id}` - Delete question

### Answers API
- `GET /api/answers?questionId={id}` - List answers for question
- `POST /api/answers` - Create answer

### Comments API
- `GET /api/comments?questionId={id}` - List comments for question
- `POST /api/comments` - Create comment

### Subjects API
- `GET /api/subjects` - List all subjects
- `GET /api/subjects?key={key}&topics=1` - Get subject with topics
- `POST /api/subjects` - Create subject (admin)
- `PUT /api/subjects?id={id}` - Update subject (admin)
- `DELETE /api/subjects?id={id}` - Delete subject (admin)
- `POST /api/subjects?topics=1` - Create topic (admin)
- `PUT /api/subjects?topicId={id}` - Update topic (admin)
- `DELETE /api/subjects?topicId={id}` - Delete topic (admin)

### Upload API
- `POST /api/upload/image` - Upload image (multipart/form-data)

---

## Environment Variables

Required in `.env.local`:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@host:5432/database
DIRECT_URL=postgresql://postgres:password@host:5432/database

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Upload (optional)
OSS_UPLOAD_BASE_URL=https://www.imgurl.org/api/v3/upload
OSS_UPLOAD_TOKEN=your-token

# Development
DEV_FIXED_CODE=123456
```

---

## Success Criteria

✅ TypeScript compiles (0 errors)  
✅ Build succeeds  
✅ Vercel dev starts  
✅ Can login with password  
✅ Can create question  
✅ Can view question details  
✅ Can add answer  
✅ Can add comment  
✅ Admin can manage subjects/topics  
✅ Image upload works  

---

## Next Steps After Verification

1. If all tests pass → Deploy to Vercel production
2. If issues found → Debug and fix
3. Run integration tests → Verify API layer
4. Manual testing → Verify user flows
5. Update documentation → Reflect simplified version

