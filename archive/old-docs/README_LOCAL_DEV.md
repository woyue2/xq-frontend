# 🎯 Local Development - Quick Reference

Backend folder deleted ✅ | Everything runs on Vercel serverless functions

---

## 🚀 Start Development (One Command)

```bash
vercel dev
```

Then open: **http://localhost:3000**

---

## 📁 What You Have Now

```
/api                    ← Your backend (serverless functions)
  ├── auth.ts          ← Login, register, password
  ├── content.ts       ← Questions, answers, comments
  ├── admin.ts         ← Whitelist, audit
  ├── social.ts        ← Like, favorite
  ├── upload.ts        ← Image upload
  ├── core.ts          ← Config, subjects
  └── _helpers.ts      ← Shared utilities

/src                    ← Your frontend (React)
/prisma                 ← Database schema
.env.local             ← Local environment variables
```

---

## 🔍 How to Debug

### 1. Terminal Logs (API)
All API logs appear in terminal where you ran `vercel dev`:
```
[Content API] Action: questions-list
[Auth API] Login: 13800138000
```

### 2. Browser Console (Frontend)
Press F12 → Console tab:
```javascript
console.log('User:', user);
```

### 3. Network Tab (API Requests)
Press F12 → Network tab → Filter "Fetch/XHR"
- See all API requests
- Click to view request/response
- Check status codes

### 4. Add Debug Logs
Edit any file in `/api`:
```typescript
export default async function handler(req, res) {
  console.log('🔍 Debug:', req.query, req.body);
  // ... your code
}
```

---

## 🧪 Test APIs

### Option 1: Use Test Script (Windows)
```powershell
.\test-api.ps1
```

### Option 2: Use curl
```bash
# Health check
curl http://localhost:3000/api/core?action=health

# Login
curl -X POST http://localhost:3000/api/auth?action=login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"password123"}'
```

### Option 3: Use Browser
Just use your app normally at http://localhost:3000

---

## 🐛 Common Issues

### Port 3000 in use?
```bash
npx kill-port 3000
# or
vercel dev --listen 3001
```

### Database error?
Check `.env.local` has correct `DATABASE_URL`

### Prisma error?
```bash
npx prisma generate
```

### Changes not showing?
- Save the file (Ctrl+S)
- Check terminal for errors
- Refresh browser (Ctrl+R)

---

## 📚 Documentation

- **START_HERE.md** - Quick start guide
- **LOCAL_DEVELOPMENT.md** - Detailed development guide
- **API_REFERENCE.md** - Complete API documentation
- **MIGRATION_COMPLETE.md** - What was migrated

---

## 🎯 Development Workflow

1. **Start server**: `vercel dev`
2. **Make changes**: Edit files in `/api` or `/src`
3. **See changes**: Auto-reload (no restart needed)
4. **Debug**: Check terminal + browser console
5. **Test**: Use test script or browser

---

## 💡 Pro Tips

1. **Keep terminal visible** - See API logs in real-time
2. **Use console.log()** - Add logs everywhere to debug
3. **Check Network tab** - See all API requests/responses
4. **Test incrementally** - Test each feature as you build
5. **Use Prisma Studio** - View database: `npx prisma studio`

---

## 🚢 Deploy to Production

When ready:
```bash
vercel --prod
```

Or just push to git (if auto-deploy enabled).

---

## ✅ Quick Checklist

- [ ] Run `vercel dev`
- [ ] Open http://localhost:3000
- [ ] Test login
- [ ] Check terminal for API logs
- [ ] Check browser console for errors
- [ ] Make changes and see auto-reload
- [ ] Run test script to verify APIs

---

## 🆘 Need Help?

1. Check terminal for errors
2. Check browser console (F12)
3. Check Network tab for API responses
4. Add `console.log()` to debug
5. Read detailed guides in docs folder

**You're all set! Start coding! 🎉**
