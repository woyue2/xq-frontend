-- ============================================
-- 初始 Schema（从零开始，不迁移旧数据）
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 用户相关
-- ============================================

CREATE TABLE "User" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  nickname TEXT NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
  password_hash TEXT,
  grade TEXT,
  age INTEGER,
  school TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  is_banned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_phone ON "User"(phone);
CREATE INDEX idx_user_role ON "User"(role);

-- 白名单
CREATE TABLE "UserWhitelist" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  grade TEXT,
  valid_until TIMESTAMPTZ,
  notes TEXT,
  is_registered BOOLEAN DEFAULT false,
  user_id UUID UNIQUE REFERENCES "User"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  registered_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

CREATE INDEX idx_whitelist_role ON "UserWhitelist"(role);
CREATE INDEX idx_whitelist_is_registered ON "UserWhitelist"(is_registered);

-- 登录日志
CREATE TABLE "LoginLog" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  ip TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_log_user ON "LoginLog"(user_id, created_at);

-- ============================================
-- 问题相关
-- ============================================

CREATE TABLE "Question" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT,
  subject TEXT,
  tags TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  difficulty TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_good_question BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  score INTEGER,
  ai_result JSONB,
  likes INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  answers INTEGER DEFAULT 0,
  understood_count INTEGER DEFAULT 0,
  not_understood_count INTEGER DEFAULT 0,
  author_id UUID NOT NULL REFERENCES "User"(id),
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_question_status_created ON "Question"(status, created_at DESC);
CREATE INDEX idx_question_good ON "Question"(is_good_question) WHERE is_good_question = true;

-- 回答
CREATE TABLE "Answer" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES "Question"(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  audio_url TEXT,
  author_id UUID NOT NULL REFERENCES "User"(id),
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  likes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ai_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_answer_question ON "Answer"(question_id, status, created_at DESC);

-- 评论
CREATE TABLE "Comment" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES "Question"(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image TEXT,
  author_id UUID NOT NULL REFERENCES "User"(id),
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ai_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_comment_question ON "Comment"(question_id, status, created_at DESC);

-- 点赞
CREATE TABLE "Like" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('question', 'answer')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX idx_like_target ON "Like"(target_type, target_id);

-- 收藏
CREATE TABLE "Favorite" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES "Question"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

CREATE INDEX idx_favorite_user ON "Favorite"(user_id);
CREATE INDEX idx_favorite_question ON "Favorite"(question_id);

-- 理解状态
CREATE TABLE "QuestionUnderstanding" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES "Question"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('understood', 'not_understood')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, user_id)
);

CREATE INDEX idx_understanding_user ON "QuestionUnderstanding"(user_id);

-- ============================================
-- 通知
-- ============================================

CREATE TABLE "Notification" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('answer', 'comment', 'audit_result', 'system', 'new_answer')),
  title TEXT NOT NULL,
  content TEXT,
  target_type TEXT,
  target_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_user ON "Notification"(user_id);
CREATE INDEX idx_notification_unread ON "Notification"(user_id, is_read) WHERE is_read = false;

-- ============================================
-- 管理相关
-- ============================================

CREATE TABLE "AuditLog" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auditor_id UUID NOT NULL REFERENCES "User"(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('question', 'answer', 'comment')),
  target_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'ban')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_auditor ON "AuditLog"(auditor_id);
CREATE INDEX idx_audit_target ON "AuditLog"(target_type, target_id);

-- 维度定义
CREATE TABLE "QuestionDimension" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  multi_select BOOLEAN DEFAULT false,
  description TEXT,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE "QuestionDimensionOption" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dimension_key TEXT NOT NULL REFERENCES "QuestionDimension"(key) ON DELETE CASCADE,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dimension_key, value)
);

-- 科目
CREATE TABLE "Subject" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE "Topic" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_key TEXT NOT NULL REFERENCES "Subject"(key) ON DELETE CASCADE,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_key, value)
);

-- ============================================
-- 家长-孩子关系
-- ============================================

CREATE TABLE "ParentChild" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, child_id)
);

CREATE INDEX idx_parent_child_parent ON "ParentChild"(parent_id);
CREATE INDEX idx_parent_child_child ON "ParentChild"(child_id);

-- ============================================
-- 触发器：自动更新 updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_updated_at BEFORE UPDATE ON "Question"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_answer_updated_at BEFORE UPDATE ON "Answer"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comment_updated_at BEFORE UPDATE ON "Comment"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
