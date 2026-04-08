# Database Setup Guide - Fix Connection Issue

## 🚨 Current Problem

The Supabase database connection is failing with:
```
FATAL: Tenant or user not found
```

This means the Supabase project `fyqlmovtfkfwmklfpvnc` either:
1. Doesn't exist anymore
2. Has been deleted or suspended
3. The credentials are incorrect

## ✅ Solution: Get Correct Database Credentials

### Step 1: Check Your Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Log in with your account
3. Look for your project

### Step 2: Get Connection Strings

If the project exists:

1. Click on your project
2. Go to **Project Settings** (gear icon) → **Database**
3. Scroll down to **Connection string**
4. You'll see two connection strings:

**Connection pooling** (for DATABASE_URL):
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-X-ap-southeast-1.pooler.supabase.com:6543/postgres
```

**Direct connection** (for DIRECT_URL):
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-X-ap-southeast-1.pooler.supabase.com:5432/postgres
```

### Step 3: Update `.env.local`

Replace the DATABASE_URL and DIRECT_URL in `.env.local` with your correct values:

```env
DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-X-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5
DIRECT_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-X-ap-southeast-1.pooler.supabase.com:5432/postgres
```

**Important**: 
- Replace `[YOUR-PROJECT-REF]` with your actual project reference
- Replace `[YOUR-PASSWORD]` with your actual database password
- Replace `X` in `aws-X` with the correct number (0, 1, 2, etc.)

### Step 4: Test Connection

Run this command to test:
```bash
node test-db-connection.js
```

You should see:
```
✅ Connected successfully!
✅ Query successful
✅ Tables found
```

## 🆕 Alternative: Create New Supabase Project

If your project doesn't exist, create a new one:

### Step 1: Create Project

1. Go to: https://supabase.com/dashboard
2. Click **New Project**
3. Fill in:
   - Name: `xq-frontend` (or any name)
   - Database Password: (create a strong password)
   - Region: **Southeast Asia (Singapore)** (closest to you)
4. Click **Create new project**
5. Wait 2-3 minutes for setup

### Step 2: Get Connection Strings

1. Go to **Project Settings** → **Database**
2. Copy both connection strings (see Step 2 above)

### Step 3: Update `.env.local`

Update with your new credentials

### Step 4: Apply Database Schema

Run migrations to create tables:
```bash
npx prisma migrate deploy
npx prisma generate
```

## 🧪 After Fixing Connection

Once the connection works, run these commands:

### 1. Seed Database
```bash
npm run db:seed
```

Expected output:
```
🌱 Seeding test database...
✅ Created test users
✅ Created subjects
✅ Created topics
✅ Created sample questions
✅ Created sample answers
✅ Created sample comments
🎉 Test database seeded successfully!
```

### 2. Start Dev Server
```bash
npm run dev
```

### 3. Run Integration Tests
```bash
npm run test:integration
```

Expected output:
```
✓ src/test/integration/auth.integration.test.ts (5)
✓ src/test/integration/questions.integration.test.ts (15)
✓ src/test/integration/subjects.integration.test.ts (13)
✓ src/test/integration/answers-comments.integration.test.ts (14)

Test Files  4 passed (4)
Tests  47 passed (47)
```

## 📝 Test Credentials

After seeding, you can use these to test:

- **Admin**: Phone `13800000001`, Password `admin123`
- **Teacher**: Phone `13800000002`, Password `teacher123`

## 🔍 Troubleshooting

### Still Getting "Tenant or user not found"

1. **Double-check credentials**: Make sure you copied the EXACT connection strings from Supabase
2. **Check project status**: Verify project is active in Supabase dashboard
3. **Try direct connection**: Test with DIRECT_URL instead of DATABASE_URL
4. **Check region**: Make sure the region in URL matches your project region

### "Password authentication failed"

- The password in the connection string is wrong
- Get the correct password from Supabase dashboard

### "Connection timeout"

- Network/firewall issue
- Try from a different network
- Check if Supabase is accessible: https://status.supabase.com/

### "Database does not exist"

- The database name in the URL is wrong
- Should be `postgres` (default Supabase database)

## 💡 Quick Test Commands

Test connection:
```bash
node test-db-connection.js
```

Test with Prisma:
```bash
npx prisma db execute --stdin <<< "SELECT 1"
```

View database in browser:
```bash
npx prisma studio
```

## 📞 Need Help?

1. Check Supabase status: https://status.supabase.com/
2. Supabase docs: https://supabase.com/docs/guides/database
3. Supabase support: https://supabase.com/dashboard/support

## ✅ Success Checklist

- [ ] Supabase project exists and is active
- [ ] Connection strings copied from dashboard
- [ ] `.env.local` updated with correct credentials
- [ ] `node test-db-connection.js` shows ✅ Connected
- [ ] `npm run db:seed` completes successfully
- [ ] `npm run dev` starts without errors
- [ ] `npm run test:integration` shows 47 tests passing

Once all checkboxes are ✅, your integration tests are ready to run!
