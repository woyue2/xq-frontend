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
      // 可选的 IP 白名单检查（通过环境变量配置，逗号分隔）
      const ipAllowlist = process.env.AI_CALLBACK_IP_ALLOWLIST;
      if (ipAllowlist) {
        const normalizeIp = (ip: string) =>
          ip.startsWith('::ffff:') ? ip.slice(7) : ip;

        const forwardedFor =
          (req.headers['x-forwarded-for'] as string | undefined) ?? '';
        const rawIpCandidate = forwardedFor.split(',')[0]?.trim() ?? '';

        const rawIp =
          rawIpCandidate || req.ip || req.socket.remoteAddress || '';
        const clientIp = normalizeIp(rawIp);

        const allowedIps = ipAllowlist
          .split(',')
          .map(ip => normalizeIp(ip.trim()))
          .filter(ip => ip.length > 0);

        if (!allowedIps.includes(clientIp) && !allowedIps.includes('*')) {
          throw new AppError(
            403,
            'IP_NOT_ALLOWED',
            '请求来源 IP 不在白名单中'
          );
        }
      }

      // 内部鉴权：强制校验，防止未授权访问
      const expectedToken = env.AI_INTERNAL_TOKEN;
      const received = (req.headers['x-internal-token'] as string | undefined) ?? '';

      if (!expectedToken || received !== expectedToken) {
        throw new AppError(
          403,
          'INTERNAL_ACCESS_DENIED',
          '未通过内部验证，禁止访问回调接口'
        );
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

      if (
        !targetType ||
        !targetId ||
        !result ||
        typeof result !== 'object' ||
        Array.isArray(result)
      ) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          '参数验证失败'
        );
      }

      let aiResult: string;
      try {
        aiResult = JSON.stringify(result);
      } catch {
        throw new AppError(
          400,
          'INVALID_RESULT_PAYLOAD',
          'AI 回调结果字段不可序列化'
        );
      }

      const safe = result.safe === true;

      let updated: any = null;

      if (targetType === 'question') {
        // 获取作者角色，判断逻辑：仅当作者是老师且 AI 判定安全时，才设为 approved
        const question = await prisma.question.findUnique({
          where: { id: targetId },
          select: { authorId: true }
        });

        if (!question) throw new AppError(404, 'CONTENT_NOT_FOUND', '问题不存在');

        const author = await prisma.user.findUnique({
          where: { id: question.authorId },
          select: { role: true }
        });

        // 核心逻辑修复：如果 safe 且作者是 teacher，则 approved；
        // 如果 safe 但作者是 student/parent，则保持 pending (除非人工干预，回调不应自动通过学生内容)
        // 注意：此处回调逻辑应保证：违规必 rejected；合规则根据角色决定是 approved 还是继续 pending。
        let nextStatus = 'rejected';
        if (safe) {
          nextStatus = (author?.role === 'teacher') ? 'approved' : 'pending';
        }

        updated = await prisma.question.update({
          where: { id: targetId },
          data: {
            aiResult,
            status: nextStatus as any,
            score: typeof result.score === 'number' ? result.score : undefined
          },
          select: { id: true, status: true, aiResult: true }
        });
      } else if (targetType === 'answer') {
        // 处理回答（通常只有老师能回答，但逻辑应一致）
        const nextStatus = safe ? 'approved' : 'rejected';
        updated = await prisma.answer.update({
          where: { id: targetId },
          data: { aiResult, status: nextStatus as any },
          select: { id: true, status: true, aiResult: true }
        });
      } else if (targetType === 'comment') {
        // 处理评论：目前评论默认为人工审核流，AI 判定安全后仍应由老师审核？ 
        // 参照 Question 逻辑，设为 pending 如果是学生。
        const comment = await prisma.comment.findUnique({
          where: { id: targetId },
          select: { authorId: true }
        });
        if (!comment) throw new AppError(404, 'CONTENT_NOT_FOUND', '评论不存在');

        const author = await prisma.user.findUnique({
          where: { id: comment.authorId },
          select: { role: true }
        });

        const nextStatus = (safe && author?.role === 'teacher') ? 'approved' : (safe ? 'pending' : 'rejected');

        updated = await prisma.comment.update({
          where: { id: targetId },
          data: { aiResult, status: nextStatus as any },
          select: { id: true, status: true, aiResult: true }
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
      // 多重检查：生产环境绝对禁止使用该接口
      const isProduction =
        env.NODE_ENV === 'production' ||
        process.env.NODE_ENV === 'production' ||
        process.env.DISABLE_TEST_ENDPOINTS === 'true';

      if (isProduction) {
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
        throw new AppError(
          400,
          'INVALID_PHONE_FORMAT',
          '手机号格式错误',
          undefined,
          1001
        );
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
