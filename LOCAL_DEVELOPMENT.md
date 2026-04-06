# Local Development Guide

Now that the backend folder is deleted, here's how to run and debug locally.

---

## Quick Start

### 1. Start Vercel Dev Server

This runs your serverless functions locally:

```bash
vercel dev
```

This will:
- Start serverless functions at `http://localhost:3000/api`
- Start frontend at `http://localhost:3000`
- Hot reload on file changes
- Use environment variables from `.env` or Vercel

### 2. Access Your App

Open browser: `http://localhost:3000`

---

## Environment Variables

Vercel dev will look for environment variables in this order:
1. `.env.local` (create this for local development)
2. `.env.production` (your current file)
3. Vercel project settings (if linked)

### Create `.env.local` for Local Development

```bash
# Copy from .env.production and modify for local
cp .env.production .env.local
```

Then edit `.env.local`:

```bash
# Database (use your Supabase connection)
DATABASE_URL=postgresql://postgres.fyqlmovtfkfwmklfpvnc:-ZH2*FkV98LEB95@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5
DIRECT_URL=postgresql://postgres.fyqlmovtfkfwmklfpvnc:-ZH2*FkV98LEB95@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres

# JWT
JWT_SECRET=A67TvMwv+d70aF6qrfW1FJ6GJ4C9INU63b+VX46Mm5E=

# AI Audit
AI_AUDIT_BASE_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
AI_AUDIT_API_KEY=3a8af59ffcbb4e0eb47066b65375e0e7.P1UlkXbGChGAj0tE
AI_AUDIT_MODEL=glm-4-flash

# OSS Upload
OSS_UPLOAD_BASE_URL=https://www.imgurl.org/api/v3/upload
OSS_UPLOAD_TOKEN=sk-GZqa0eF4eTDzZiuze194MyApMF8JmZk6GXoImZInczAsFASxquqmBQgtxEKai

# Local development - fixed code for testing
DEV_FIXED_CODE=123456
```

---

## Debugging

### 1. Console Logs

Add `console.log()` in your API files:

```typescript
// api/content.ts
export default async function handler(req, res) {
  console.log('[Content API] Action:', req.query.action);
  console.log('[Content API] User:', user);
  // ... rest of code
}
```

Logs will appear in the terminal where you ran `vercel dev`.

### 2. Check API Responses

Use browser DevTools Network tab:
- Open DevTools (F12)
- Go to Network tab
- Filter by "Fetch/XHR"
- Click on API requests to see request/response

### 3. Test API Directly

Use curl or Postman:

```bash
# Health check
curl http://localhost:3000/api/core?action=health

# Login (get token)
curl -X POST http://localhost:3000/api/auth?action=login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"password123"}'

# Get questions (with auth)
curl http://localhost:3000/api/content?action=questions-list \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. VS Code Debugging

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vercel Dev",
      "runtimeExecutable": "vercel",
      "runtimeArgs": ["dev"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

Then press F5 to start debugging with breakpoints.

---

## Common Issues

### Issue 1: Port Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
vercel dev --listen 3001
```

### Issue 2: Environment Variables Not Loading

```bash
# Check which env file is being used
vercel env ls

# Pull env from Vercel project
vercel env pull .env.local
```

### Issue 3: Database Connection Error

Check your DATABASE_URL:
- Make sure Supabase project is running
- Check connection pooling is enabled
- Verify password is correct

### Issue 4: Prisma Client Not Found

```bash
# Regenerate Prisma Client
npx prisma generate
```

---

## Development Workflow

### 1. Start Development

```bash
# Terminal 1: Start Vercel dev server
vercel dev

# Terminal 2: Watch for TypeScript errors (optional)
npm run type-check -- --watch
```

### 2. Make Changes

Edit files in `/api` or `/src`:
- API changes: Hot reload automatically
- Frontend changes: Vite hot reload

### 3. Test Changes

- Open `http://localhost:3000`
- Check browser console for frontend errors
- Check terminal for API errors

### 4. Debug Issues

- Add `console.log()` statements
- Check Network tab in DevTools
- Use VS Code debugger with breakpoints

---

## Testing Specific Features

### Test Authentication

```bash
# 1. Register (if not already)
curl -X POST http://localhost:3000/api/auth?action=register \
  -H "Content-Type: application/json" \
  -d '{
    "phone":"13800138000",
    "password":"password123",
    "code":"123456",
    "nickname":"测试用户"
  }'

# 2. Login
curl -X POST http://localhost:3000/api/auth?action=login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"password123"}'

# Save the token from response
```

### Test Questions

```bash
# Create question
curl -X POST http://localhost:3000/api/content?action=questions-create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title":"测试问题",
    "content":"这是一个测试问题的详细描述",
    "subject":"math"
  }'

# List questions
curl http://localhost:3000/api/content?action=questions-list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Admin Features

```bash
# Get pending questions (requires teacher/admin role)
curl http://localhost:3000/api/admin?action=audit-pending&type=question \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Logs and Monitoring

### View Logs

All logs appear in the terminal where you ran `vercel dev`:

```
[Content API] Action: questions-list
[Content API] User: { id: 'xxx', role: 'student' }
[Content API] Query: { page: 1, pageSize: 20 }
```

### Add Structured Logging

```typescript
// api/_helpers.ts
export function log(context: string, data: any) {
  console.log(`[${context}]`, JSON.stringify(data, null, 2));
}

// Use in API
import { log } from './_helpers';
log('Content API', { action, user: user?.id });
```

---

## Production Deployment

When ready to deploy:

```bash
# Deploy to production
vercel --prod

# Or push to git (if auto-deploy is enabled)
git push origin main
```

---

## Tips

1. **Keep terminal open**: Don't close the terminal running `vercel dev`
2. **Check both terminals**: Frontend errors in browser, API errors in terminal
3. **Use console.log liberally**: Add logs to understand flow
4. **Test incrementally**: Test each feature as you build
5. **Use DevTools Network tab**: See all API requests/responses
6. **Check Prisma Studio**: View database data with `npx prisma studio`

---

## Quick Commands Reference

```bash
# Start development
vercel dev

# Start on different port
vercel dev --listen 3001

# Pull environment variables
vercel env pull .env.local

# View Prisma database
npx prisma studio

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Type check
npm run type-check

# Build for production
npm run build
```

---

## Need Help?

1. Check terminal for error messages
2. Check browser console for frontend errors
3. Check Network tab for API responses
4. Add console.log() to debug
5. Check this guide for common issues

Happy coding! 🚀
