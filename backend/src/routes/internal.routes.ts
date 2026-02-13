import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';
import { env } from '../config/env';
import { signAccessToken } from '../utils/jwt';
import {
  internalAuditService,
  type AiResultPayload
} from '../services/internal-audit.service';

export const internalRouter = Router();

/**
 * @swagger
 * /internal/ai-check:
 *   post:
 *     summary: AI 审核回调
 *     description: 由外部 AI 服务回调审核结果，需提供内部鉴权头
 *     tags:
 *       - Internal
 *     parameters:
 *       - in: header
 *         name: x-internal-token
 *         required: true
 *         schema:
 *           type: string
 *         description: 内部鉴权 Token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetType, targetId, result]
 *             properties:
 *               targetType:
 *                 type: string
 *                 enum: [question, answer, comment]
 *               targetId:
 *                 type: string
 *               result:
 *                 type: object
 *                 description: AI 审核结果
 *     responses:
 *       200:
 *         description: 回调处理成功
 */
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

      // 修改原因：将 ai-check 的业务判定与数据访问下沉到 Service，降低 Route 业务耦合（P0-3）。
      const updated = await internalAuditService.processAiCheckCallback({
        targetType,
        targetId,
        result
      });

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

/**
 * @swagger
 * /internal/test-token:
 *   post:
 *     summary: 生成测试用访问令牌
 *     description: 仅测试环境可用，便于 Playwright / E2E 使用
 *     tags:
 *       - Internal
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [student, parent, teacher]
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: 生成成功
 */
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

      // 首先检查白名单是否存在（UserWhitelist必须由管理员预先创建）
      const wl = await prisma.userWhitelist.findUnique({
        where: { phone: normalizedPhone }
      });

      if (!wl || wl.deletedAt) {
        throw new AppError(
          403,
          'NOT_IN_WHITELIST',
          '该手机号不在白名单中，请先联系管理员添加白名单',
          undefined,
          4001
        );
      }

      const expiresAt = wl.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

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
          grade: wl.grade || '初一',
          age: 15,
          school: '测试学校',
          expiresAt,
          isActive: true,
          isBanned: false
        }
      });

      // 如果白名单尚未标记为已注册，更新isRegistered
      if (wl && !wl.isRegistered) {
        await prisma.userWhitelist.update({
          where: { id: wl.id },
          data: {
            isRegistered: true,
            registeredAt: new Date(),
            userId: user.id
          }
        });
      }

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
