// 用户角色类型
export type UserRole = 'student' | 'parent' | 'teacher';

// 审核状态
export type AuditStatus = 'pending' | 'approved' | 'rejected' | 'banned';

// 难度等级
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// 用户类型
export interface User {
  id: string;
  phone: string;
  nickname: string;
  avatar?: string;
  role: UserRole;
  grade?: string; // 年级（仅学生）
  age?: number; // 年龄（仅学生）
  expiresAt?: string; // 课时过期时间（学生和家长共享）
}

// 问题类型
export interface Question {
  id: string;
  title: string;
  content?: string;
  images?: string[];
  audioUrl?: string; // 问题录音
  authorId: string;
  authorName: string;
  isGoodQuestion: boolean;
  tags?: string[]; // 考点标签
  difficulty?: DifficultyLevel; // 难度等级
  likes: number;
  favorites: number;
  comments: number;
  answers: number;
  status: AuditStatus;
  aiResult?: string; // AI初筛结果
  score?: number; // 评分 1-5
  isPinned?: boolean; // 是否置顶
  rejectReason?: string; // 驳回原因
  createdAt: string;
}

// 评论类型
export interface Comment {
  id: string;
  questionId: string;
  questionTitle?: string; // 所属问题标题
  content: string;
  image?: string; // 评论图片
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  status: AuditStatus;
  aiResult?: string; // AI初筛结果
  createdAt: string;
}

// 回答类型
export interface Answer {
  id: string;
  questionId: string;
  content: string;
  images?: string[]; // 回答图片
  audioUrl?: string; // 回答录音
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  likes: number;
  status: AuditStatus;
  createdAt: string;
}