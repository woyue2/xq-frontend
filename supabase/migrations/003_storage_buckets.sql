-- ============================================
-- Storage Buckets 配置
-- ============================================

-- 创建 buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('question-images', 'question-images', true),
  ('answer-audio', 'answer-audio', true),
  ('avatars', 'avatars', true);

-- 公开访问策略（所有人可读）
CREATE POLICY "Public read question-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'question-images');

CREATE POLICY "Public read answer-audio" ON storage.objects
  FOR SELECT USING (bucket_id = 'answer-audio');

CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- 认证用户可上传
CREATE POLICY "Authenticated users can upload question-images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'question-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can upload answer-audio" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'answer-audio' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
  );

-- 用户可删除自己的文件（通过路径中的 user_id 判断）
CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE USING (
    auth.uid()::text = (storage.foldername(name))[1]
  );
