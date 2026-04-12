/**
 * [POS] src/types/dto.ts
 *   所属：types 层 | 角色：统一 DTO（数据传输对象）类型定义
 *   用途：定义前后端交互的核心数据结构
 *
 * [OUTPUT]
 *   - UserDTO         → 用户数据传输对象
 *   - QuestionDTO     → 问题数据传输对象
 *   - AnswerDTO       → 回答数据传输对象
 *   - CommentDTO      → 评论数据传输对象
 *   - SubjectDTO      → 科目数据传输对象
 *   - TopicDTO        → 考点数据传输对象
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[OUTPUT] 变化时）
 *   2. API 文件中的对应接口定义
 */

import type { UserRole } from './index';

/**
 * 用户数据传输对象
 */
export interface UserDTO {
  id: string;
  phone: string;
  nickname: string;
  name?: string;
  avatar?: string;
  role: UserRole;
}

/**
 * 问题数据传输对象
 */
export interface QuestionDTO {
  id: string;
  title: string;
  content?: string;
  subject?: string;
  tags?: string[];
  images?: string[];
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt?: string; // Optional to match Question type
  answerCount?: number;
}

/**
 * 回答数据传输对象
 */
export interface AnswerDTO {
  id: string;
  questionId: string;
  content: string;
  images?: string[];
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 评论数据传输对象
 */
export interface CommentDTO {
  id: string;
  questionId: string;
  content: string;
  image?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 科目数据传输对象
 */
export interface SubjectDTO {
  id: string;
  key: string;
  name: string;
  order: number;
  enabled: boolean;
  description?: string;
}

/**
 * 考点数据传输对象
 */
export interface TopicDTO {
  id: string;
  subjectKey: string;
  value: string;
  label: string;
  order: number;
  enabled: boolean;
}
