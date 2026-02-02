import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import {
  authMiddleware,
  type AuthenticatedRequest
} from '../middlewares/auth.middleware';
import { AppError } from '../errors/AppError';

export const uploadRouter = Router();

// 获取上传签名（图片/音频）
uploadRouter.get(
  '/signature',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      const typeRaw = String(req.query.type ?? 'image').toLowerCase();

      if (typeRaw !== 'image' && typeRaw !== 'audio') {
        throw new AppError(
          400,
          'INVALID_UPLOAD_TYPE',
          '不支持的上传类型',
          undefined,
          2001
        );
      }

      if (typeRaw === 'audio' && req.user.role !== 'teacher') {
        throw new AppError(
          403,
          'PERMISSION_DENIED',
          '只有教师可以上传音频'
        );
      }

      const now = Date.now();
      const expireAt = now + 5 * 60 * 1000;

      const ext = typeRaw === 'image' ? 'jpg' : 'mp3';
      const key = `${typeRaw}/${req.user.id}/${now}.${ext}`;

      const uploadUrl = 'https://oss.example.com/upload';
      const policy = Buffer.from(
        JSON.stringify({
          expiration: new Date(expireAt).toISOString(),
          type: typeRaw
        })
      ).toString('base64');
      const signature = Buffer.from(`signature:${key}`).toString('base64');

      return res.json({
        code: 200,
        message: 'success',
        data: {
          uploadUrl,
          key,
          policy,
          signature,
          expireAt
        },
        timestamp: now
      });
    } catch (err) {
      next(err);
    }
  }
);
