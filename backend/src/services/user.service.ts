import { prisma } from '../config/database';
import { aiAuditService } from './ai-audit.service';
import { AppError } from '../errors/AppError';

export class UserService {
    /**
     * 更新用户信息（含头像审核）
     */
    async updateProfile(userId: string, data: {
        nickname?: string;
        avatar?: string;
        grade?: string;
        age?: number;
        school?: string;
    }) {
        //如果更新头像，进行 AI 审核
        if (data.avatar) {
            const auditResult = await aiAuditService.auditImage(data.avatar);
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

        // 数据校验
        if (data.nickname) {
            if (data.nickname.length > 20) {
                throw new AppError(400, 'INVALID_PARAMS', '昵称不能超过 20 个字符');
            }
            // 昵称 AI 审核
            const auditResult = await aiAuditService.auditContent(data.nickname, 'nickname');
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
