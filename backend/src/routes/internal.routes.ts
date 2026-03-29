/**
 * [POS] backend/src/routes/internal.routes.ts
 *   所属：路由层 | 角色：内部服务路由（AI 回调、测试令牌，不对外暴露）
 *
 * [INPUT]
 *   - express                                  → Router / Request / Response / NextFunction
 *   - ../services/audit-callback.service       → auditCallbackService
 *   - ../services/test-token.service           → testTokenService
 *   - ../errors/AppError                       → AppError
 *   - ../config/env                            → env
 *
 * [OUTPUT]
 *   - internalRouter（Express Router）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/routes/CLAUDE.md 的文件清单
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { env } from '../config/env';
import { auditCallbackService } from '../services/audit-callback.service';
import { testTokenService } from '../services/test-token.service';

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
          throw new AppError(403, 'IP_NOT_ALLOWED', '请求来源 IP 不在白名单中');
        }
      }

      // 内部鉴权：强制校验，防止未授权访问
      const expectedToken = env.AI_INTERNAL_TOKEN;
      const received = (req.headers['x-internal-token'] as string | undefined) ?? '';

      if (!expectedToken || received !== expectedToken) {
        throw new AppError(403, 'INTERNAL_ACCESS_DENIED', '未通过内部验证，禁止访问回调接口');
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
        throw new AppError(400, 'VALIDATION_ERROR', '参数验证失败');
      }

      let aiResult: string;
      try {
        aiResult = JSON.stringify(result);
      } catch {
        throw new AppError(400, 'INVALID_RESULT_PAYLOAD', 'AI 回调结果字段不可序列化');
      }

      const updated = await auditCallbackService.applyResult({
        targetType,
        targetId,
        result,
        aiResult
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

      const { role, phone } = req.body as { role?: string; phone?: string };

      const data = await testTokenService.generate({ role, phone });

      return res.json({
        code: 200,
        message: 'success',
        data,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);
