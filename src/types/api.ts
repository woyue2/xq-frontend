/**
 * [POS] src/types/api.ts
 *   所属：types 层 | 角色：统一 API 响应/请求的 TypeScript 类型定义
 *   兄弟：index.ts / parent.ts
 *
 * [INPUT]
 *   - ./index  → User / Question / Comment / Answer / AuditStatus
 *
 * [OUTPUT]
 *   - ApiResponse<T>         → 统一响应信封
 *   - PaginatedResponse<T>   → 分页响应信封
 *   - （其余接口类型）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/types/CLAUDE.md 的文件清单
 */
import type { User, Question, Comment, Answer, AuditStatus } from './index';

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
export interface SendCodePayload {
  phone: string;
  type?: 'login' | 'register' | 'bind_child' | 'reset_password';
}

export interface SendCodeResponse {
  phone: string;
  expireIn: number;
  cooldown: number;
}

export interface LoginPayload {
  phone: string;
  code: string;
}

export interface PasswordLoginPayload {
  phone: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string; // 真实姓名，必填
  nickname?: string; // 昵称，可选
  role?: 'student' | 'teacher' | 'parent';
  grade?: string;
  age?: number;
  school?: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

// 问题相关
export interface CreateQuestionPayload {
  title: string;
  content?: string;
  images?: string[];
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  subject?: string;
}

export interface UpdateQuestionPayload {
  title?: string;
  content?: string;
  images?: string[];
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  subject?: string;
}

export interface QuestionListParams {
  page?: number;
  pageSize?: number;
  subject?: string;
  topic?: string;
  status?: string;
  isGoodQuestion?: boolean;
  tags?: string[];
  search?: string;
  authorId?: string;
}

// 互动相关
export interface LikePayload {
  targetType: 'question';
  targetId: string;
  action: 'like' | 'unlike';
}

export interface LikeResponse {
  liked: boolean;
  likesCount: number;
}

export interface FavoritePayload {
  questionId?: string;
  targetType: 'question';
  targetId: string;
  action: 'favorite' | 'unfavorite';
}

export interface FavoriteResponse {
  favorited: boolean;
  favoritesCount: number;
}

// 个人中心 - 我的点赞/收藏/回答
export interface MyLikedQuestion {
  id: string;
  title: string;
  content?: string | null;
  authorName: string;
  authorAvatar?: string;
  likes: number;
  favorites: number;
  answers: number;
  createdAt: string;
  likedAt: string;
}

export interface MyFavoritedQuestion {
  id: string;
  title: string;
  content?: string | null;
  authorName: string;
  authorAvatar?: string;
  likes: number;
  favorites: number;
  answers: number;
  createdAt: string;
  favoritedAt: string;
}

export interface MyAnswerSummary {
  id: string;
  questionId: string;
  questionTitle: string;
  content: string;
  likes: number;
  status: AuditStatus;
  createdAt: string;
}

// 更新用户信息参数
export interface UpdateProfilePayload {
  name?: string;
  nickname?: string;
  avatar?: string;
  grade?: string;
  age?: number;
  school?: string;
}

// 通知相关
export interface Notification {
  id: string;
  type: string;
  title: string;
  content?: string;
  targetType?: string;
  targetId?: string;
  isRead: boolean;
  createdAt: string;
}

// 白名单相关
export interface WhitelistUser {
  id: string;
  // 关联的真实用户 ID（如果已注册）
  userId?: string;
  phone: string;
  name: string;
  role: 'student' | 'teacher' | 'parent';
  grade?: string;
  validUntil?: string;
  notes?: string;
  isRegistered: boolean;
  registeredAt?: string;
  createdAt: string;
}

export interface WhitelistParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

export interface AddWhitelistPayload {
  phone: string;
  name: string;
  role: 'student' | 'teacher' | 'parent';
  grade?: string;
  validUntil?: string; // ISO String
  notes?: string;
}

// 题目维度配置（例如解题方法/办法）
export interface QuestionDimensionOptionDto {
  id: string;
  value: string;
  label: string;
  order: number;
  enabled?: boolean;
}

export interface QuestionDimensionDto {
  key: string;
  name: string;
  enabled: boolean;
  multiSelect: boolean;
  options: QuestionDimensionOptionDto[];
}

// 课时管理相关
export interface UserClassHours {
  userId: string;
  phone: string;
  name: string;
  role: 'student' | 'parent' | 'teacher';
  validUntil: string | null;
  isExpired: boolean;
  remainingDays: number;
  status: 'active' | 'expired';
}

export interface BatchUpdateClassHoursResult {
  userId: string;
  oldValidUntil: string | null;
  newValidUntil: string | null;
  status: 'success' | 'failed';
  reason?: string;
}

export interface BatchUpdateClassHoursResponse {
  successCount: number;
  failedCount: number;
  results: BatchUpdateClassHoursResult[];
}

// ============================================
// 审核管理模块（Admin Audit）类型定义
// ============================================

// 待审核问题
export interface PendingQuestion {
  id: string;
  type: 'question';
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  status: string;
  aiResult: string | null;
  createdAt: string;
}

// 待审核评论
export interface PendingComment {
  id: string;
  type: 'comment';
  questionId: string;
  questionTitle: string;
  content: string;
  image: string | null;
  authorId: string;
  authorName: string;
  status: string;
  aiResult: string | null;
  createdAt: string;
}

// 审核统计
export interface AuditStatistics {
  pending: number;
  approved: number;
  rejected: number;
  banned: number;
}

// 审核问题通过响应
export interface ApproveQuestionResponse {
  id: string;
  status: string;
  isGoodQuestion?: boolean;
  score?: number;
  tags?: string[];
  difficulty?: string;
  approvedBy: string;
  approvedAt: string;
}

// 审核问题驳回响应（使用 reason 字段）
export interface RejectQuestionResponse {
  id: string;
  status: string;
  reason: string | null; // AI审核结果/驳回原因
  rejectedBy: string;
  rejectedAt: string;
}

// 审核评论通过响应
export interface ApproveCommentResponse {
  id: string;
  status: string;
  approvedBy: string;
  approvedAt: string;
}

// 封禁评论响应
export interface BanCommentResponse {
  id: string;
  status: string;
  reason: string;
  bannedBy: string;
  bannedAt: string;
}

// 置顶问题响应
export interface TogglePinQuestionResponse {
  id: string;
  isPinned: boolean;
}

// 学科配置 DTO
export interface TopicDto {
  value: string;
  label: string;
  order: number;
}

export interface SubjectDto {
  key: string;
  name: string;
  order: number;
  topics: TopicDto[];
}

// 管理端学科/考点 DTO
export interface TopicAdminDto {
  id: string;
  subjectKey: string;
  value: string;
  label: string;
  order: number;
  enabled: boolean;
}

export interface SubjectAdminDto {
  id: string;
  key: string;
  name: string;
  order: number;
  enabled: boolean;
  description?: string;
  topics: TopicAdminDto[];
}
