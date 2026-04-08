-- This migration simplifies the database schema by removing unnecessary tables and fields
-- Requirements: 8.1, 8.2

-- Drop unnecessary tables
DROP TABLE IF EXISTS "VerificationCode" CASCADE;
DROP TABLE IF EXISTS "UserWhitelist" CASCADE;
DROP TABLE IF EXISTS "RefreshToken" CASCADE;
DROP TABLE IF EXISTS "LoginLog" CASCADE;
DROP TABLE IF EXISTS "Like" CASCADE;
DROP TABLE IF EXISTS "Favorite" CASCADE;
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "BehaviorLog" CASCADE;
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "QuestionDimension" CASCADE;
DROP TABLE IF EXISTS "QuestionDimensionOption" CASCADE;
DROP TABLE IF EXISTS "ParentChild" CASCADE;
DROP TABLE IF EXISTS "QuestionUnderstanding" CASCADE;

-- Remove unnecessary fields from User table
ALTER TABLE "User" DROP COLUMN IF EXISTS "grade";
ALTER TABLE "User" DROP COLUMN IF EXISTS "age";
ALTER TABLE "User" DROP COLUMN IF EXISTS "school";
ALTER TABLE "User" DROP COLUMN IF EXISTS "expiresAt";
ALTER TABLE "User" DROP COLUMN IF EXISTS "isActive";
ALTER TABLE "User" DROP COLUMN IF EXISTS "isBanned";

-- Remove unnecessary fields from Question table
ALTER TABLE "Question" DROP COLUMN IF EXISTS "difficulty";
ALTER TABLE "Question" DROP COLUMN IF EXISTS "status";
ALTER TABLE "Question" DROP COLUMN IF EXISTS "isGoodQuestion";
ALTER TABLE "Question" DROP COLUMN IF EXISTS "isPinned";
ALTER TABLE "Question" DROP COLUMN IF EXISTS "score";
ALTER TABLE "Question" DROP COLUMN IF EXISTS "aiResult";
ALTER TABLE "Question" DROP COLUMN IF EXISTS "likes";
ALTER TABLE "Question" DROP COLUMN IF EXISTS "favorites";
ALTER TABLE "Question" DROP COLUMN IF EXISTS "comments";
ALTER TABLE "Question" DROP COLUMN IF EXISTS "answers";
ALTER TABLE "Question" DROP COLUMN IF EXISTS "understoodCount";
ALTER TABLE "Question" DROP COLUMN IF EXISTS "notUnderstoodCount";

-- Remove unnecessary fields from Answer table
ALTER TABLE "Answer" DROP COLUMN IF EXISTS "audioUrl";
ALTER TABLE "Answer" DROP COLUMN IF EXISTS "likes";
ALTER TABLE "Answer" DROP COLUMN IF EXISTS "status";
ALTER TABLE "Answer" DROP COLUMN IF EXISTS "aiResult";
ALTER TABLE "Answer" DROP COLUMN IF EXISTS "deletedAt";

-- Remove unnecessary fields from Comment table
ALTER TABLE "Comment" DROP COLUMN IF EXISTS "status";
ALTER TABLE "Comment" DROP COLUMN IF EXISTS "aiResult";
ALTER TABLE "Comment" DROP COLUMN IF EXISTS "deletedAt";
