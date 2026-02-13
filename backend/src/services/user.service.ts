import { prisma } from '../config/database';
import { aiAuditService } from './ai-audit.service';
import { AppError } from '../errors/AppError';

const PREDEFINED_AVATAR_WHITELIST = new Set<string>([
    // 修改原因：方案A要求“系统默认头像不走审核”，通过白名单精确放行，避免影响上传头像审核。
    '/avators/notionists-1771014027111.png',
    '/avators/notionists-1771014089130.png',
    '/avators/notionists-1771014089350.png',
    '/avators/notionists-1771014137113.png',
    '/avators/notionists-1771014137573.png',
    '/avators/notionists-1771014137633.png',
    '/avators/notionists-1771014141476.png',
    '/avators/notionists-1771014149388.png',
    '/avators/notionists-1771014149586.png',
    '/avators/notionists-1771014149624.png',
    '/avators/notionists-1771014151440.png',
    '/avators/notionists-1771014154427.png',
    '/avators/notionists-1771014156462.png',
    '/avators/notionists-1771014160192.png',
    '/avators/notionists-1771014162379.png',
    '/avators/notionists-1771014166621.png',
    '/avators/notionists-1771014171488.png',
    '/avators/notionists-1771014181034.png',
    '/avators/notionists-1771014181107.png',
    '/avators/notionists-1771014181485.png'
]);

const isPredefinedAvatar = (avatarUrl: string): boolean => {
    if (PREDEFINED_AVATAR_WHITELIST.has(avatarUrl)) {
        return true;
    }

    // 修改原因：兼容客户端可能上传绝对 URL（例如 https://host/avators/xxx.png）的情况，仍按白名单匹配路径。
    try {
        const parsed = new URL(avatarUrl);
        return PREDEFINED_AVATAR_WHITELIST.has(parsed.pathname);
    } catch {
        // ⚠️ 不确定因素：非标准 URL（如带查询参数但不是完整绝对 URL）会走这里，当前按“非白名单”处理更安全。
        return false;
    }
};

export class UserService {
    /**
     * 更新用户信息（含头像审核）
     */
    async updateProfile(userId: string, data: {
        name?: string;          // 真实姓名
        nickname?: string;
        avatar?: string;
        grade?: string;
        age?: number;
        school?: string;
    }) {
        //如果更新头像，进行 AI 审核（系统默认头像白名单除外）
        if (data.avatar) {
            if (!isPredefinedAvatar(data.avatar)) {
                const auditResult = await aiAuditService.auditImage(data.avatar);
                if (auditResult.requiresManualReview) {
                    // AI 审核服务异常，转人工审核
                    throw new AppError(
                        503,
                        'AVATAR_AUDIT_UNAVAILABLE',
                        `头像审核服务暂时不可用，已转人工审核，请稍后重试`,
                        undefined,
                        2002
                    );
                }
                if (!auditResult.safe) {
                    throw new AppError(
                        400,
                        'AVATAR_REJECTED',
                        `头像审核失败：${auditResult.reason || '包含违规内容'}`,
                        undefined,
                        2002
                    );
                }
            }
        }

        // 数据校验
        if (data.name) {
            if (data.name.length > 20) {
                throw new AppError(400, 'INVALID_PARAMS', '姓名不能超过 20 个字符');
            }
            // 姓名 AI 审核（复用 nickname 审核类型）
            const auditResult = await aiAuditService.auditContent(data.name, 'nickname');
            if (auditResult.requiresManualReview) {
                // AI 审核服务异常，转人工审核
                throw new AppError(
                    503,
                    'NAME_AUDIT_UNAVAILABLE',
                    `姓名审核服务暂时不可用，已转人工审核，请稍后重试`,
                    undefined,
                    2002
                );
            }
            if (!auditResult.safe) {
                throw new AppError(
                    400,
                    'NAME_REJECTED',
                    `姓名包含违规内容：${auditResult.reason || '未通过审核'}`,
                    undefined,
                    2002
                );
            }
        }

        if (data.nickname) {
            if (data.nickname.length > 20) {
                throw new AppError(400, 'INVALID_PARAMS', '昵称不能超过 20 个字符');
            }
            // 昵称 AI 审核
            const auditResult = await aiAuditService.auditContent(data.nickname, 'nickname');
            if (auditResult.requiresManualReview) {
                // AI 审核服务异常，转人工审核
                throw new AppError(
                    503,
                    'NICKNAME_AUDIT_UNAVAILABLE',
                    `昵称审核服务暂时不可用，已转人工审核，请稍后重试`,
                    undefined,
                    2002
                );
            }
            if (!auditResult.safe) {
                throw new AppError(
                    400,
                    'NICKNAME_REJECTED',
                    `昵称包含违规内容：${auditResult.reason || '未通过审核'}`,
                    undefined,
                    2002
                );
            }
        }
        if (data.school && data.school.length > 50) {
            throw new AppError(400, 'INVALID_PARAMS', '学校名称不能超过 50 个字符');
        }


        // 更新数据库
        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                nickname: data.nickname,
                avatar: data.avatar,
                grade: data.grade,
                age: data.age,
                school: data.school
            }
        });

        return updated;
    }
}

export const userService = new UserService();
