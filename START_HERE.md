# 🚀 Quick Start - Local Development

The backend folder has been deleted. Everything now runs as Vercel serverless functions.

---

## Step 1: Start the Development Server

Open terminal and run:

```bash
vercel dev
```

**What this does:**
- Starts serverless functions at `http://localhost:3000/api`
- Starts frontend at `http://localhost:3000`
- Loads environment variables from `.env.local`
- Hot reloads on file changes

**Expected output:**
```
Vercel CLI 50.39.0
> Ready! Available at http://localhost:3000
```

---

## Step 2: Open Your Browser

Go to: **http://localhost:3000**

You should see your app running!

---

## Step 3: Test Login

1. Open the app in browser
2. Try to login with test account:
   - Phone: `13800138000`
   - Password: `password123`
   - Code: `123456` (fixed code for development)

---

## Debugging

### See API Logs

All API logs appear in the terminal where you ran `vercel dev`:

```
[Content API] Action: questions-list
[Auth API] Login attempt: 13800138000
```

### See Frontend Errors

Open browser DevTools (F12):
- **Console tab**: JavaScript errors
- **Network tab**: API requests/responses

### Add Debug Logs

Edit any API file (e.g., `api/content.ts`):

```typescript
export default async function handler(req, res) {
  console.log('🔍 Debug:', req.query);  // Add this
  // ... rest of code
}
```

Save the file, and logs will appear in terminal.

---

## Common Commands

```bash
# Start development
vercel dev

# Start on different port
vercel dev --listen 3001

# View database in browser
npx prisma studio

# Check TypeScript errors
npm run type-check

# Build for production
npm run build
```

---

## File Structure

```
/api                    ← Serverless functions (your backend)
  auth.ts              ← Login, register
  content.ts           ← Questions, answers, comments
  admin.ts             ← Whitelist, audit
  social.ts            ← Like, favorite
  upload.ts            ← Image upload
  core.ts              ← Config, subjects
  _helpers.ts          ← Shared utilities

/src                    ← Frontend (React)
  /pages               ← Page components
  /services            ← API calls
  /hooks               ← React hooks
  /components          ← UI components

/prisma                 ← Database schema
  schema.prisma        ← Database models

.env.local             ← Local environment variables
```

---

## Testing APIs Directly

Use curl to test APIs:

```bash
# Health check
curl http://localhost:3000/api/core?action=health

# Login
curl -X POST http://localhost:3000/api/auth?action=login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"password123"}'

# Get subjects
curl http://localhost:3000/api/core?action=subjects
```

---

## Troubleshooting

### Port 3000 already in use?

```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
vercel dev --listen 3001
```

### Database connection error?

Check `.env.local` has correct DATABASE_URL from Supabase.

### Prisma client error?

```bash
npx prisma generate
```

### Environment variables not loading?

Make sure `.env.local` exists in project root.

---

## Next Steps

1. ✅ Start `vercel dev`
2. ✅ Open `http://localhost:3000`
3. ✅ Test login
4. ✅ Check terminal for API logs
5. ✅ Check browser DevTools for frontend logs

**Read more**: See `LOCAL_DEVELOPMENT.md` for detailed guide.

---

## Need Help?

1. Check terminal for errors
2. Check browser console (F12)
3. Check Network tab for API responses
4. Add `console.log()` to debug
5. Read `LOCAL_DEVELOPMENT.md`

Happy coding! 🎉
