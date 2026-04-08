# Database Simplification Migration

## Overview
This migration simplifies the database schema by removing unnecessary tables and fields according to Requirements 8.1 and 8.2 of the app-simplification spec.

## Changes Made

### Tables Dropped (Requirement 8.1)
The following 13 tables have been removed:
1. `VerificationCode` - Verification code management
2. `UserWhitelist` - User whitelist system
3. `RefreshToken` - Refresh token storage
4. `LoginLog` - Login history tracking
5. `Like` - Like/upvote functionality
6. `Favorite` - Favorite/bookmark functionality
7. `Notification` - Notification system
8. `BehaviorLog` - User behavior tracking
9. `AuditLog` - Audit trail logging
10. `QuestionDimension` - Question dimension classification
11. `QuestionDimensionOption` - Question dimension options
12. `ParentChild` - Parent-child relationship tracking
13. `QuestionUnderstanding` - Question understanding tracking

### Tables Retained (Requirement 8.2)
The following 6 core tables are preserved:
1. `User` - User accounts
2. `Question` - Questions
3. `Answer` - Answers to questions
4. `Comment` - Comments on questions
5. `Subject` - Subject categories
6. `Topic` - Topic/考点 categories

### Fields Removed from User Table (Requirement 8.3)
- `grade` - Student grade level
- `age` - User age
- `school` - School name
- `expiresAt` - Account expiration date
- `isActive` - Active status flag
- `isBanned` - Banned status flag

### Fields Removed from Question Table (Requirement 8.4)
- `difficulty` - Question difficulty level
- `status` - Question status
- `isGoodQuestion` - Good question flag
- `isPinned` - Pinned status
- `score` - Question score
- `aiResult` - AI analysis result
- `likes` - Like count
- `favorites` - Favorite count
- `comments` - Comment count
- `answers` - Answer count
- `understoodCount` - Understood count
- `notUnderstoodCount` - Not understood count

### Fields Removed from Answer Table (Requirement 8.5)
- `audioUrl` - Audio answer URL
- `likes` - Like count
- `status` - Answer status
- `aiResult` - AI analysis result
- `deletedAt` - Soft delete timestamp

### Fields Removed from Comment Table (Requirement 8.6)
- `status` - Comment status
- `aiResult` - AI analysis result
- `deletedAt` - Soft delete timestamp

## How to Apply This Migration

### Option 1: Apply to Database (Recommended)
If you have a working database connection:
```bash
npx prisma migrate deploy
```

### Option 2: Manual Application
If you need to apply this migration manually:
```bash
# Connect to your database
psql $DATABASE_URL

# Run the migration SQL
\i prisma/migrations/20260401000000_simplify_schema/migration.sql
```

### Option 3: Reset and Recreate
If you want to start fresh (WARNING: This will delete all data):
```bash
npx prisma migrate reset
```

## Verification

After applying the migration, verify the changes:

```bash
# Check the current database schema
npx prisma db pull

# Generate Prisma Client with the new schema
npx prisma generate
```

## Rollback

If you need to rollback this migration, you would need to:
1. Restore from a database backup
2. Or manually recreate the dropped tables and columns

**Note:** This migration is destructive and cannot be automatically rolled back. Ensure you have a backup before applying.

## Related Files
- Schema definition: `prisma/schema.prisma`
- Simplified schema: `prisma/schema.simplified.prisma`
- Requirements: `.kiro/specs/app-simplification/requirements.md` (Requirement 8)
- Design: `.kiro/specs/app-simplification/design.md`
