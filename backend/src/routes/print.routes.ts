import { Router } from 'express';
import type { NextFunction, Response } from 'express';
import {
  authMiddleware,
  type AuthenticatedRequest
} from '../middlewares/auth.middleware';
import { AppError } from '../errors/AppError';
import { parentService } from '../services/parent.service';

export const printRouter = Router();

printRouter.use(authMiddleware);

printRouter.post(
  '/questions/pdf',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user || req.user.role !== 'parent') {
        throw new AppError(403, 'FORBIDDEN', '仅家长可导出打印 PDF');
      }

      const payload = req.body as {
        questionIds?: string[];
        fileName?: string;
      };
      const questionIds = Array.isArray(payload.questionIds)
        ? payload.questionIds
        : [];
      const fileName = typeof payload.fileName === 'string'
        ? payload.fileName
        : undefined;

      const forwardedProtoRaw = req.headers['x-forwarded-proto'];
      const forwardedHostRaw = req.headers['x-forwarded-host'];
      const forwardedProto = typeof forwardedProtoRaw === 'string'
        ? forwardedProtoRaw.split(',')[0]?.trim()
        : undefined;
      const forwardedHost = typeof forwardedHostRaw === 'string'
        ? forwardedHostRaw.split(',')[0]?.trim()
        : undefined;

      // 修改原因：支持反向代理场景，保证服务端渲染 HTML 时静态图片 URL 可访问。
      // ⚠️ 不确定因素：若代理层未透传 x-forwarded-*，将回退到 req.protocol + host。
      const requestOrigin =
        forwardedProto && forwardedHost
          ? `${forwardedProto}://${forwardedHost}`
          : `${req.protocol}://${req.get('host')}`;

      const result = await parentService.generateQuestionsPdf({
        parentId: req.user.id,
        questionIds,
        fileName,
        requestOrigin
      });

      const encodedFileName = encodeURIComponent(`${result.fileName}.pdf`);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
      if (result.missingIds.length > 0) {
        res.setHeader('X-Print-Missing-Ids', result.missingIds.join(','));
      }
      return res.status(200).send(result.pdfBuffer);
    } catch (err) {
      return next(err);
    }
  }
);
