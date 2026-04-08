# Supabase Project Not Found

## 🚨 Problem

Your `.env.production` file has complete credentials, but the Supabase project doesn't exist:

```
Project ID: fyqlmovtfkfwmklfpvnc
Error: FATAL: Tenant or user not found
```

This means the Supabase project has been **deleted** or **never existed**.

## ✅ Solution

### Option 1: Find Your Existing Project

1. Go to: **https://supabase.com/dashboard**
2. Log in with your account
3. Look at your projects list
4. If you see a project, click on it
5. Go to **Project Settings** (gear icon) → **Database**
6. Copy the **Connection pooling** string
7. Copy the **Direct connection** string
8. Update `.env.local` and `.env.production` with the new strings

### Option 2: Create New Project (Recommended)

Since the old project doesn't exist, create a new one:

#### Step 1: Create Project

1. Go to: **https://supabase.com/dashboard**
2. Click **"New Project"** button
3. Fill in:
   - **Name**: `xq-frontend` (or any name you like)
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: **Southeast Asia (Singapore)** (closest to China)
   - **Pricing Plan**: Free (or your preferred plan)
4. Click **"Create new project"**
5. Wait 2-3 minutes for the project to be created

#### Step 2: Get Connection Strings

1. Once created, go to **Project Settings** (gear icon on left sidebar)
2. Click **Database** in the settings menu
3. Scroll down to **Connection string** section
4. You'll see two strings:

**Connection pooling** (for DATABASE_URL):
```
postgresql://postgres.[NEW-PROJECT-ID]:[YOUR-PASSWORD]@aws-X-ap-southeast-1.pooler.supabase.com:6543/postgres
```

**Direct connection** (for DIRECT_URL):
```
postgresql://postgres.[NEW-PROJECT-ID]:[YOUR-PASSWORD]@aws-X-ap-southeast-1.pooler.supabase.com:5432/postgres
```

#### Step 3: Update Environment Files

Update **both** `.env.local` and `.env.production`:

```env
DATABASE_URL=postgresql://postgres.[NEW-PROJECT-ID]:[YOUR-PASSWORD]@aws-X-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5
DIRECT_URL=postgresql://postgres.[NEW-PROJECT-ID]:[YOUR-PASSWORD]@aws-X-ap-southeast-1.pooler.supabase.com:5432/postgres
```

**Important**: Replace `[NEW-PROJECT-ID]` and `[YOUR-PASSWORD]` with your actual values!

#### Step 4: Apply Database Schema

Run these commands to create the database tables:

```bash
# Generate Prisma client
npx prisma generate

# Apply migrations to create tables
npx prisma migrate deploy
```

You should see:
```
✅ Migration applied successfully
```

#### Step 5: Test Connection

```bash
node test-db-connection.js
```

You should see:
```
✅ Connected successfully!
✅ Query successful
✅ Tables found
```

#### Step 6: Seed Test Data

```bash
npm run db:seed
```

You should see:
```
🌱 Seeding test database...
✅ Created test users
✅ Created subjects
✅ Created topics
✅ Created sample questions
🎉 Test database seeded successfully!
```

#### Step 7: Run Tests

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run tests
npm run test:integration
```

You should see:
```
✓ 47 tests passed
```

## 📝 Important Notes

### Save Your Database Password!

When you create the Supabase project, **save the database password** somewhere safe. You'll need it for the connection strings.

### Update Both Files

Make sure to update **both**:
- `.env.local` (for local development)
- `.env.production` (for production deployment)

### Region Selection

Choose **Southeast Asia (Singapore)** for best performance if you're in China.

## 🎯 After Setup

Once your new Supabase project is created and connected:

1. ✅ Database tables will be created by migrations
2. ✅ Test data will be seeded
3. ✅ 47 integration tests will run automatically
4. ✅ Your application will work with real database

## 🆘 Still Having Issues?

### "Migration failed"

Make sure you ran:
```bash
npx prisma generate
npx prisma migrate deploy
```

### "Connection still failing"

1. Double-check you copied the EXACT connection strings from Supabase
2. Make sure you replaced `[YOUR-PASSWORD]` with your actual password
3. Verify the project is active in Supabase dashboard

### "Can't find my project"

If you don't see any projects in your Supabase dashboard:
- You might be logged into the wrong account
- Or you need to create a new project (follow Option 2 above)

## ✅ Quick Checklist

- [ ] Go to https://supabase.com/dashboard
- [ ] Create new project (or find existing one)
- [ ] Copy connection strings from Project Settings → Database
- [ ] Update `.env.local` with new credentials
- [ ] Update `.env.production` with new credentials
- [ ] Run `npx prisma migrate deploy`
- [ ] Run `node test-db-connection.js` (should show ✅)
- [ ] Run `npm run db:seed`
- [ ] Run `npm run test:integration`

Once all steps are ✅, your integration tests will work!
