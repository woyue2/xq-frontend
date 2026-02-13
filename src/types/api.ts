import type { User, Question, Comment, Answer, AuditStatus } from './index';

// 用户行为日志相关类型
export interface BehaviorLogParams {
    type: string;
    timestamp?: number;
    metadata?: Record<string, unknown>;
    sessionId?: string;
}

export interface BehaviorLogResult {
    logId: string;
}

export interface BehaviorBatchResult {
    successCount: number;
    failedCount: number;
    results: Array<{
        index: number;
        logId?: string;
        error?: string;
    }>;
}

// 统一响应格式
export interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

// 分页响应格式（与后端 { list, pagination } 结构对齐）
export interface PaginatedResponse<T> {
    list: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
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
    status?: string;
    isGoodQuestion?: boolean;
    tags?: string[];
    search?: string;
    authorId?: string;
}

export interface MyQuestionStatusStats {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    banned: number;
    other: number;
}

// 评论相关
export interface CreateCommentPayload {
    content?: string;
    image?: string;
}

export interface CommentListResponse {
    list: Comment[];
    total: number;
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
    userId: string;  // 添加 userId 字段（问题116）
    type: string;
    title: string;
    content?: string;
    targetType?: string;
    targetId?: string;
    isRead: boolean;
    readAt?: string; // 新增：标记已读时间（ISO 8601 格式）
    createdAt: string;
}

// 通知类型枚举（问题118）
export type NotificationType =
    | 'system'
    | 'question_answered'
    | 'answer_liked'
    | 'comment_received'
    | 'answer_accepted'
    | string;  // 保留兼容性

// 标记已读请求参数（问题117）
export interface MarkAsReadPayload {
    ids: string[];
}

// 标记已读响应（问题117）
export interface MarkAsReadResponse {
    success: boolean;
    updatedCount: number;
}

// 白名单相关
export interface WhitelistUser {
    id: string;
    // 关联的真实用户 ID（如果已注册）
    userId?: string;
    phone: string;
    name: string;
    role: 'student' | 'teacher' | 'parent';
    validUntil?: string;
    notes?: string;
    isRegistered: boolean;
    registeredAt?: string;
    createdAt: string;
    createdBy?: string;
    deletedAt?: string | null;
    deletedBy?: string | null;
}

export interface WhitelistParams {
    page?: number;
    pageSize?: number;
    search?: string;
    searchField?: 'name' | 'phone';
    role?: string;
    status?: string;
}

export interface AddWhitelistPayload {
    phone: string;
    name: string;
    role: 'student' | 'teacher' | 'parent';
    validUntil?: string; // ISO String
    notes?: string;
}

export interface WhitelistStatistics {
    total: number;
    registered: number;
    pending: number;
    students: number;
    parents: number;
    teachers: number;
}

export interface WhitelistResponse {
    list: WhitelistUser[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
    statistics: WhitelistStatistics;
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
    images?: string[];  // 问题图片列表（可选，当前不存储图片）
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

// 待审核回答
export interface PendingAnswer {
    id: string;
    type: 'answer';
    questionId: string;
    questionTitle: string;
    content: string;
    images: string[];
    audioUrl: string | null;
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

// 审核回答通过响应
export interface ApproveAnswerResponse {
    id: string;
    status: string;
    approvedBy: string;
    approvedAt: string;
}

// 审核回答驳回响应
export interface RejectAnswerResponse {
    id: string;
    status: string;
    reason: string | null;
    rejectedBy: string;
    rejectedAt: string;
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
