/**
 * [POS] backend/src/routes/interaction.routes.ts
 *   所属：路由层 | 角色：互动路由（点赞、收藏题目/答案）
 *
 * [INPUT]
 *   - express                        → Router / Response / NextFunction
 *   - ../middlewares/auth.middleware  → authMiddleware / AuthenticatedRequest
 *   - ../services/interaction.service → interactionService
 *   - ../errors/AppError             → AppError
 *
 * [OUTPUT]
 *   - interactionRouter（Express Router）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/routes/CLAUDE.md 的文件清单
 */
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import {
  authMiddleware,
  type AuthenticatedRequest
} from '../middlewares/auth.middleware';
import { interactionService } from '../services/interaction.service';
import { AppError } from '../errors/AppError';

/**
 * 互动相关路由（点赞 / 收藏）
 *
 * 设计原则：
 * - 路由层只负责解析 HTTP 请求与组装统一响应；
 * - 具体业务逻辑委托给 interactionService；
 * - 严格使用顺序 / 选择 / 循环三种结构化控制流；
 * - 所有错误通过 AppError + errorMiddleware 统一处理。
 */
export const interactionRouter = Router();

interactionRouter.use(authMiddleware);

// 点赞 / 取消点赞
interactionRouter.post(
  '/like',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      const { targetType, targetId, action } = req.body as {
        targetType?: 'question' | 'answer';
        targetId?: string;
        action?: 'like' | 'unlike';
      };

      if (!targetType || !targetId || !action) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          '缺少必填参数',
          {
            errors: [
              { field: 'targetType', message: 'targetType 为必填' },
              { field: 'targetId', message: 'targetId 为必填' },
              { field: 'action', message: 'action 为必填' }
            ]
          }
        );
      }

      if (targetType !== 'question') {
        throw new AppError(
          400,
          'UNSUPPORTED_TARGET_TYPE',
          '当前仅支持问题点赞'
        );
      }

      if (action !== 'like' && action !== 'unlike') {
        throw new AppError(
          400,
          'INVALID_ACTION',
          'action 只能为 like 或 unlike'
        );
      }

      const result = await interactionService.toggleQuestionLike({
        questionId: targetId,
        userId: req.user.id
      });

      return res.json({
        code: 200,
        message: result.isLiked ? '点赞成功' : '取消点赞',
        data: {
          liked: result.isLiked,
          likesCount: result.likes
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

// 收藏 / 取消收藏
interactionRouter.post(
  '/favorite',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      const { questionId, action } = req.body as {
        questionId?: string;
        action?: 'favorite' | 'unfavorite';
      };

      if (!questionId || !action) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          '缺少必填参数',
          {
            errors: [
              { field: 'questionId', message: 'questionId 为必填' },
              { field: 'action', message: 'action 为必填' }
            ]
          }
        );
      }

      if (action !== 'favorite' && action !== 'unfavorite') {
        throw new AppError(
          400,
          'INVALID_ACTION',
          'action 只能为 favorite 或 unfavorite'
        );
      }

      const result = await interactionService.toggleQuestionFavorite({
        questionId,
        userId: req.user.id
      });

      return res.json({
        code: 200,
        message: result.isFavorited ? '收藏成功' : '取消收藏',
        data: {
          favorited: result.isFavorited,
          favoritesCount: result.favorites
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

