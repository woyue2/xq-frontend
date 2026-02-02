import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';
import { env } from '../config/env';
import { signAccessToken } from '../utils/jwt';

export const internalRouter = Router();

// AI 审核回调：由外部 AI 服务调用
internalRouter.post(
  '/ai-check',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 简单的内部鉴权：仅当配置了 AI_INTERNAL_TOKEN 时才启用
      const expectedToken = env.AI_INTERNAL_TOKEN;
      if (expectedToken) {
        const received =
          (req.headers['x-internal-token'] as string | undefined) ?? '';
        if (!received || received !== expectedToken) {
          throw new AppError(
            403,
            'INTERNAL_ACCESS_DENIED',
            '未授权访问内部审核回调接口'
          );
        }
      }

      type AiResultPayload = {
        safe?: boolean;
        score?: number;
        [key: string]: unknown;
      };

      const body = req.body as any;
      const targetType = String(body.targetType ?? '');
      const targetId = String(body.targetId ?? '');
      const result = body.result as AiResultPayload | undefined;

      if (!targetType || !targetId || typeof result !== 'object') {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          '参数验证失败'
        );
      }

      const safe = result.safe === true;
      const aiResult = JSON.stringify(result);
      const nextStatus = safe ? 'approved' : 'rejected';

      let updated:
        | { id: string; status: string; aiResult?: string | null }
        | null = null;

      if (targetType === 'question') {
        updated = await prisma.question.update({
          where: { id: targetId },
          data: {
            aiResult,
            status: nextStatus,
            score:
              typeof result.score === 'number' ? result.score : undefined
          },
          select: {
            id: true,
            status: true,
            aiResult: true
          }
        });
      } else if (targetType === 'answer') {
        updated = await prisma.answer.update({
          where: { id: targetId },
          data: {
            aiResult,
            status: nextStatus
          },
          select: {
            id: true,
            status: true,
            aiResult: true
          }
        });
      } else if (targetType === 'comment') {
        updated = await prisma.comment.update({
          where: { id: targetId },
          data: {
            aiResult,
            status: nextStatus
          },
          select: {
            id: true,
            status: true,
            aiResult: true
          }
        });
      } else {
        throw new AppError(
          400,
          'INVALID_CONTENT_TYPE',
          '不支持的审核内容类型'
        );
      }

      if (!updated) {
        throw new AppError(
          404,
          'CONTENT_NOT_FOUND',
          '内容不存在'
        );
      }

      return res.json({
        code: 200,
        message: 'success',
        data: {
          targetType,
          targetId: updated.id,
          status: updated.status,
          aiResult: updated.aiResult ?? null
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

// 测试环境专用：生成测试用访问令牌，便于 Playwright / E2E 使用
internalRouter.post(
  '/test-token',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 生产环境禁止使用该接口
      if (env.NODE_ENV === 'production') {
        throw new AppError(404, 'NOT_FOUND', '接口不存在');
      }

      const { role: rawRole, phone: rawPhone } = req.body as {
        role?: string;
        phone?: string;
      };

      const role =
        rawRole === 'teacher' || rawRole === 'parent' || rawRole === 'student'
          ? rawRole
          : 'student';

      const defaultPhones: Record<string, string> = {
        student: '13900000001',
        parent: '13900000002',
        teacher: '13900000003'
      };

      const phoneSource = rawPhone ?? defaultPhones[role] ?? defaultPhones.student;
      const normalizedPhone = phoneSource.replace(/\D/g, '');

      if (!/^\d{11}$/.test(normalizedPhone)) {
        throw new AppError(400, 'INVALID_PHONE_FORMAT', '手机号格式错误');
      }

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const user = await prisma.user.upsert({
        where: { phone: normalizedPhone },
        update: {
          role,
          expiresAt,
          isActive: true,
          isBanned: false
        },
        create: {
          phone: normalizedPhone,
          nickname: `Playwright_${role}`,
          role,
          grade: '初一',
          age: 15,
          school: '测试学校',
          expiresAt,
          isActive: true,
          isBanned: false
        }
      });

      const token = signAccessToken({ sub: user.id, role: user.role });

      return res.json({
        code: 200,
        message: 'success',
        data: {
          token,
          user: {
            id: user.id,
            phone: user.phone,
            nickname: user.nickname,
            role: user.role,
            expiresAt: user.expiresAt
          }
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);
