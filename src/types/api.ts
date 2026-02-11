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
    name: string;           // 真实姓名，必填
    nickname?: string;      // 昵称，可选
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

export interface QuestionListParams {
    page?: number;
    pageSize?: number;
    subject?: string;
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
    questionId: string;
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
