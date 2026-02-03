import type { User, Question, Comment, Answer } from './index';

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
    type?: 'login' | 'register';
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
    nickname?: string;
    role?: 'student' | 'teacher' | 'parent';
    grade?: string;
    age?: number;
    school?: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}

// 问题相关
export interface CreateQuestionPayload {
    title: string;
    content?: string;
    images?: string[];
    tags?: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    subject?: string; // Add subject as it is required in Question type but optional in payload maybe?
    topics?: string[];
}

export interface QuestionListParams {
    page?: number;
    limit?: number;
    subject?: string;
    topic?: string;
    method?: string;
    search?: string;
    authorId?: string;
}

// 互动相关
export interface LikePayload {
    targetType: 'question' | 'answer';
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

// 通知相关
export interface Notification {
    id: string;
    userId: string;
    type: 'answer' | 'comment' | 'audit_result' | 'system' | 'new_answer';
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
