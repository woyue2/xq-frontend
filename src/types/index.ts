// 用户角色类型
export type UserRole = 'student' | 'parent' | 'teacher';

// 审核状态
export type AuditStatus = 'pending' | 'approved' | 'rejected' | 'banned';

// 难度等级
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// 科目类型
export type SubjectType = 'math' | 'physics' | 'chemistry' | 'english' | 'chinese' | 'history' | 'geography' | 'biology' | 'politics';

// 用户实体
export interface User {
  id: string; // UUID
  phone: string;
  nickname: string;
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
}

// 问题实体
export interface Question {
  id: string;
  title: string;
  content?: string;

  // 分类与标签 (结构化)
  subject: SubjectType; // 顶级科目
  topics: string[]; // 考点 e.g. ["二次函数", "抛物线"]
  methods?: string[]; // 方法 e.g. ["配方法"]

  // 媒体
  images: string[];
  audioUrl?: string;

  // 状态
  status: AuditStatus;
  isPinned: boolean;
  isGoodQuestion: boolean; // 优质问题标记
  difficulty?: DifficultyLevel; // 难度
  tags?: string[]; // 标签
  score?: number; // 1-5
  aiResult?: string;
  rejectReason?: string;
  understoodCount?: number;
  notUnderstoodCount?: number;
  understandingStatus?: 'understood' | 'not_understood' | null;

  // 计数 (统计信息)
  stats: {
    likes: number;
    favorites: number;
    comments: number;
    answers: number;
    views?: number;
  };

  // 扁平化计数 (兼容性)
  answerCount?: number;
  viewCount?: number;
  likeCount?: number;
  collectionCount?: number;

  // 关联作者
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;

  createdAt: string;
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

  status: AuditStatus;
  aiResult?: string;
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
  status: AuditStatus;
  createdAt: string;
}
