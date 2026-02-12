// 用户角色类型
export type UserRole = 'student' | 'parent' | 'teacher';

// 审核状态
export type AuditStatus = 'pending' | 'approved' | 'rejected' | 'banned';

// 难度等级
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// 科目类型
export type SubjectType = 'math' | 'physics' | 'chemistry' | 'english' | 'chinese' | 'history' | 'geography' | 'biology' | 'politics';

// 课时状态类型
export type ClassHoursStatus = 'active' | 'expired';

// 用户课时信息（与后端 /users/me 返回的 classHours 结构对齐）
export interface UserClassHours {
  userId: string;
  phone: string;
  name: string;
  role: UserRole;
  validUntil: string | null;
  isExpired: boolean;
  remainingDays: number;
  status: ClassHoursStatus;
}

// 用户实体
export interface User {
  id: string; // UUID
  phone: string;
  name?: string;       // 真实姓名，可选
  nickname?: string;
  avatar?: string;
  role: UserRole;

  // 权限相关
  expiresAt?: string; // ISO Date String
  isValidMember?: boolean; // 后端计算返回
  permissions?: string[]; // 权限列表

  // 学生专属
  grade?: string;
  age?: number;
  school?: string;

  // 课时信息（与后端对齐）
  classHours?: UserClassHours;
}

// 问题实体
export interface Question {
  id: string;
  title: string;
  content?: string;

  // 分类与标签
  subject: SubjectType; // 顶级科目
  tags?: string[]; // 标签（后端返回）
  difficulty?: DifficultyLevel; // 难度

  // 媒体
  images: string[];
  audioUrl?: string;

  // 状态
  status: AuditStatus;
  isPinned: boolean;
  isGoodQuestion: boolean; // 优质问题标记
  score?: number; // 1-5
  aiResult?: string;
  aiAudit?: {
    safe: boolean;
    reason?: string;
    qualitySuggestion?: string;
  };
  understoodCount?: number;
  notUnderstoodCount?: number;
  understandingStatus?: 'understood' | 'not_understood' | null;

  // 计数 (扁平化字段，与后端返回一致)
  likes: number;
  favorites: number;
  comments: number;
  answers: number;

  // 计数 (对象形式，为向后兼容保留)
  stats: {
    likes: number;
    favorites: number;
    comments: number;
    answers: number;
    views?: number;
  };

  // 关联作者
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;

  // 时间
  createdAt: string;

  // 用户交互状态（需要用户上下文）
  isLiked?: boolean;
  isFavorited?: boolean;

  // 兼容性字段（用于旧代码）
  topics?: string[]; // 考点 - 前端使用，后端不返回，可从 tags 推导
  answerCount?: number; // 等同于 answers
  viewCount?: number; // 浏览数，后端暂不返回
  likeCount?: number; // 等同于 likes
  collectionCount?: number; // 等同于 favorites
}

// 评论实体
export interface Comment {
  id: string;
  questionId: string;
  questionTitle?: string;
  content: string;
  image?: string;

  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: string;  // 作者角色（必填，与后端对齐）

  status: AuditStatus;
  aiResult?: string;
  aiAudit?: {
    safe: boolean;
    reason?: string;
  };
  createdAt: string;
}

// 回答实体
export interface Answer {
  id: string;
  questionId: string;
  content: string;
  images?: string[];
  audioUrl?: string;
  audioUrls?: string[];

  authorId: string;
  authorName: string;
  authorAvatar?: string;

  // 统计
  likes: number;
  isLiked?: boolean;
  status: AuditStatus;
  aiResult?: string;
  aiAudit?: {
    safe: boolean;
    reason?: string;
  };
  createdAt: string;
}
