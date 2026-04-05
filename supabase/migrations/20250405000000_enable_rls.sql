-- [POS] supabase/migrations/20250405000000_enable_rls.sql
--   所属：数据库层 | 角色：启用 RLS 策略

-- 启用所有表的 RLS
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Question" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Answer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Like" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Favorite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuestionUnderstanding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserWhitelist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParentChild" ENABLE ROW LEVEL SECURITY;

-- User 表策略
CREATE POLICY "Users can view own profile" ON "User"
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON "User"
  FOR UPDATE USING (auth.uid()::text = id);

-- Question 表策略
CREATE POLICY "Anyone can view approved questions" ON "Question"
  FOR SELECT USING (status = 'approved' AND "deletedAt" IS NULL);

CREATE POLICY "Authors can view own questions" ON "Question"
  FOR SELECT USING ("authorId" = auth.uid()::text);

CREATE POLICY "Admins can view all questions" ON "Question"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid()::text AND role IN ('admin', 'teacher'))
  );

CREATE POLICY "Authenticated users can create questions" ON "Question"
  FOR INSERT WITH CHECK (auth.uid()::text = "authorId");

CREATE POLICY "Authors can update own questions" ON "Question"
  FOR UPDATE USING ("authorId" = auth.uid()::text);

-- Answer 表策略
CREATE POLICY "Anyone can view approved answers" ON "Answer"
  FOR SELECT USING (status = 'approved' AND "deletedAt" IS NULL);

CREATE POLICY "Authors can view own answers" ON "Answer"
  FOR SELECT USING ("authorId" = auth.uid()::text);

-- Comment 表策略
CREATE POLICY "Anyone can view approved comments" ON "Comment"
  FOR SELECT USING (status = 'approved' AND "deletedAt" IS NULL);

-- Like 表策略
CREATE POLICY "Users can view own likes" ON "Like"
  FOR SELECT USING ("userId" = auth.uid()::text);

CREATE POLICY "Users can create own likes" ON "Like"
  FOR INSERT WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "Users can delete own likes" ON "Like"
  FOR DELETE USING ("userId" = auth.uid()::text);

-- Favorite 表策略
CREATE POLICY "Users can view own favorites" ON "Favorite"
  FOR SELECT USING ("userId" = auth.uid()::text);

CREATE POLICY "Users can create own favorites" ON "Favorite"
  FOR INSERT WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "Users can delete own favorites" ON "Favorite"
  FOR DELETE USING ("userId" = auth.uid()::text);

-- Notification 表策略
CREATE POLICY "Users can view own notifications" ON "Notification"
  FOR SELECT USING ("userId" = auth.uid()::text);

CREATE POLICY "Users can update own notifications" ON "Notification"
  FOR UPDATE USING ("userId" = auth.uid()::text);

-- QuestionUnderstanding 表策略
CREATE POLICY "Users can view own understanding" ON "QuestionUnderstanding"
  FOR SELECT USING ("userId" = auth.uid()::text);

CREATE POLICY "Users can create own understanding" ON "QuestionUnderstanding"
  FOR INSERT WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "Users can update own understanding" ON "QuestionUnderstanding"
  FOR UPDATE USING ("userId" = auth.uid()::text);

-- UserWhitelist 表策略（仅管理员）
CREATE POLICY "Admins can manage whitelist" ON "UserWhitelist"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid()::text AND role IN ('admin', 'teacher'))
  );

-- AuditLog 表策略（仅管理员）
CREATE POLICY "Admins can view audit logs" ON "AuditLog"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid()::text AND role IN ('admin', 'teacher'))
  );

-- ParentChild 表策略
CREATE POLICY "Parents can view own children" ON "ParentChild"
  FOR SELECT USING ("parentId" = auth.uid()::text);

CREATE POLICY "Children can view own parents" ON "ParentChild"
  FOR SELECT USING ("childId" = auth.uid()::text);
