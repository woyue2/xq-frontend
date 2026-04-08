/**
 * [POS] src/types/api.ts
 *   所属：types 层 | 角色：统一 API 响应/请求的 TypeScript 类型定义
 *   简化版：仅保留核心 API 请求/响应类型
 *
 * [INPUT]
 *   - ./dto  → UserDTO / QuestionDTO / AnswerDTO / CommentDTO / SubjectDTO / TopicDTO
 *
 * [OUTPUT]
 *   - ApiResponse<T>         → 统一响应信封
 *   - PaginatedResponse<T>   → 分页响应信封
 *   - 认证相关请求/响应类型
 *   - 问题相关请求参数类型
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/types/CLAUDE.md 的文件清单
 */
import type { UserDTO } from './dto';

// 统一响应格式
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// 分页响应格式
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

// 认证相关
export interface PasswordLoginPayload {
  phone: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserDTO;
}

// 问题相关
export interface CreateQuestionPayload {
  title: string;
  content?: string;
  images?: string[];
  tags?: string[];
  subject: string;
}

export interface UpdateQuestionPayload {
  title?: string;
  content?: string;
  images?: string[];
  tags?: string[];
  subject?: string;
}

export interface QuestionListParams {
  page?: number;
  pageSize?: number;
  subject?: string;
  topic?: string;
  search?: string;
}

// 回答相关
export interface CreateAnswerPayload {
  questionId: string;
  content: string;
  images?: string[];
}

// 评论相关
export interface CreateCommentPayload {
  questionId: string;
  content: string;
  image?: string;
}

// 科目相关
export interface CreateSubjectPayload {
  key: string;
  name: string;
  description?: string;
  order: number;
  enabled?: boolean;
}

export interface UpdateSubjectPayload {
  name?: string;
  description?: string;
  order?: number;
  enabled?: boolean;
}

// 考点相关
export interface CreateTopicPayload {
  subjectKey: string;
  value: string;
  label: string;
  order: number;
  enabled?: boolean;
}

export interface UpdateTopicPayload {
  label?: string;
  order?: number;
  enabled?: boolean;
}

