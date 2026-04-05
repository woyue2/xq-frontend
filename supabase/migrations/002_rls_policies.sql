-- ============================================
-- RLS (Row Level Security) 策略
-- ============================================

-- 启用 RLS
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Question" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Answer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Like" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Favorite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuestionUnderstanding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParentChild" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- User 表策略
-- ============================================

-- 用户可读自己的完整信息
CREATE POLICY "Users read own data" ON "User"
  FOR SELECT USING (auth.uid()::text = id::text);

-- 用户可更新自己的信息
CREATE POLICY "Users update own data" ON "User"
  FOR UPDATE USING (auth.uid()::text = id::text);

-- ============================================
-- Question 表策略
-- ============================================

-- 所有人可读已审核通过的问题
CREATE POLICY "Public read approved questions" ON "Question"
  FOR SELECT USING (status = 'approved');

-- 作者可读自己的问题（任何状态）
CREATE POLICY "Authors read own questions" ON "Question"
  FOR SELECT USING (auth.uid()::text = author_id::text);

-- 教师/管理员可读所有问题
CREATE POLICY "Teachers read all questions" ON "Question"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "User" 
      WHERE id::text = auth.uid()::text 
      AND role IN ('teacher', 'admin')
    )
  );

-- 用户可创建问题
CREATE POLICY "Users create questions" ON "Question"
  FOR INSERT WITH CHECK (auth.uid()::text = author_id::text);

-- 作者可更新自己的问题（仅 pending 状态）
CREATE POLICY "Authors update own pending questions" ON "Question"
  FOR UPDATE USING (
    auth.uid()::text = author_id::text 
    AND status = 'pending'
  );

-- ============================================
-- Answer 表策略
-- ============================================

-- 所有人可读已审核通过的回答
CREATE POLICY "Public read approved answers" ON "Answer"
  FOR SELECT USING (status = 'approved');

-- 作者可读自己的回答
CREATE POLICY "Authors read own answers" ON "Answer"
  FOR SELECT USING (auth.uid()::text = author_id::text);

-- 教师/管理员可读所有回答
CREATE POLICY "Teachers read all answers" ON "Answer"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "User" 
      WHERE id::text = auth.uid()::text 
      AND role IN ('teacher', 'admin')
    )
  );

-- 教师可创建回答
CREATE POLICY "Teachers create answers" ON "Answer"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" 
      WHERE id::text = auth.uid()::text 
      AND role = 'teacher'
    )
  );

-- ============================================
-- Comment 表策略
-- ============================================

-- 所有人可读已审核通过的评论
CREATE POLICY "Public read approved comments" ON "Comment"
  FOR SELECT USING (status = 'approved');

-- 作者可读自己的评论
CREATE POLICY "Authors read own comments" ON "Comment"
  FOR SELECT USING (auth.uid()::text = author_id::text);

-- 用户可创建评论
CREATE POLICY "Users create comments" ON "Comment"
  FOR INSERT WITH CHECK (auth.uid()::text = author_id::text);

-- ============================================
-- Like 表策略
-- ============================================

-- 用户可读自己的点赞
CREATE POLICY "Users read own likes" ON "Like"
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- 用户可创建/删除自己的点赞
CREATE POLICY "Users manage own likes" ON "Like"
  FOR ALL USING (auth.uid()::text = user_id::text);

-- ============================================
-- Favorite 表策略
-- ============================================

-- 用户可读自己的收藏
CREATE POLICY "Users read own favorites" ON "Favorite"
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- 用户可管理自己的收藏
CREATE POLICY "Users manage own favorites" ON "Favorite"
  FOR ALL USING (auth.uid()::text = user_id::text);

-- ============================================
-- Notification 表策略
-- ============================================

-- 用户可读自己的通知
CREATE POLICY "Users read own notifications" ON "Notification"
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- 用户可更新自己的通知（标记已读）
CREATE POLICY "Users update own notifications" ON "Notification"
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- ============================================
-- QuestionUnderstanding 表策略
-- ============================================

-- 用户可读自己的理解状态
CREATE POLICY "Users read own understanding" ON "QuestionUnderstanding"
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- 用户可管理自己的理解状态
CREATE POLICY "Users manage own understanding" ON "QuestionUnderstanding"
  FOR ALL USING (auth.uid()::text = user_id::text);

-- ============================================
-- ParentChild 表策略
-- ============================================

-- 家长可读自己的孩子关系
CREATE POLICY "Parents read own relations" ON "ParentChild"
  FOR SELECT USING (auth.uid()::text = parent_id::text);

-- 孩子可读自己的家长关系
CREATE POLICY "Children read own relations" ON "ParentChild"
  FOR SELECT USING (auth.uid()::text = child_id::text);
