import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { questionDimensionService } from '../services/question-dimension.service';

export const configRouter = Router();

/**
 * @swagger
 * /config/question-dimensions:
 *   get:
 *     summary: 获取题目维度配置
 *     description: 获取题目维度配置信息，主要用于解题方法/办法维度
 *     tags:
 *       - Config
 *     responses:
 *       200:
 *         description: 获取成功
 */
configRouter.get(
  '/question-dimensions',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dimensions = await questionDimensionService.getPublicDimensions();

      return res.json({
        code: 200,
        message: 'success',
        data: {
          dimensions: dimensions.map((dim) => ({
            key: dim.key,
            name: dim.name,
            enabled: dim.enabled,
            multiSelect: dim.multiSelect,
            options: dim.options.map((opt) => ({
              id: opt.id,
              value: opt.value,
              label: opt.label,
              order: opt.order
            }))
          }))
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

