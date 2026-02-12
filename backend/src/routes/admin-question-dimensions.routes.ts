import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import {
  authMiddleware,
  createRequireTeacher,
  type AuthenticatedRequest
} from '../middlewares/auth.middleware';
import { questionDimensionService } from '../services/question-dimension.service';
import { AppError } from '../errors/AppError';

export const adminQuestionDimensionRouter = Router();

// 暂时沿用 teacher 角色作为配置管理权限
adminQuestionDimensionRouter.use(
  authMiddleware,
  createRequireTeacher({
    bizCode: 3006,
    message: '无题目维度管理权限'
  })
);

// 获取所有题目维度及其选项
adminQuestionDimensionRouter.get(
  '/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const dimensions = await questionDimensionService.listAllDimensions();

      return res.json({
        code: 200,
        message: 'success',
        data: {
          dimensions: dimensions.map((dim) => ({
            key: dim.key,
            name: dim.name,
            enabled: dim.enabled,
            multiSelect: dim.multiSelect,
            description: dim.description,
            order: dim.order,
            options: dim.options.map((opt) => ({
              id: opt.id,
              value: opt.value,
              label: opt.label,
              order: opt.order,
              enabled: opt.enabled
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

// 更新指定维度的基础配置（名称、开关、多选）
adminQuestionDimensionRouter.put(
  '/:key',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { key } = req.params;
      const { name, enabled, multiSelect } = req.body as {
        name?: string;
        enabled?: boolean;
        multiSelect?: boolean;
      };

      if (
        (name !== undefined && typeof name !== 'string') ||
        (enabled !== undefined && typeof enabled !== 'boolean') ||
        (multiSelect !== undefined && typeof multiSelect !== 'boolean')
      ) {
        throw new AppError(400, 'VALIDATION_ERROR', '参数验证失败', {
          errors: [
            { field: 'name', message: 'name 必须为字符串' },
            { field: 'enabled', message: 'enabled 必须为布尔值' },
            { field: 'multiSelect', message: 'multiSelect 必须为布尔值' }
          ]
        });
      }

      const updated = await questionDimensionService.updateDimension({
        key,
        name,
        enabled,
        multiSelect
      });

      return res.json({
        code: 200,
        message: '更新成功',
        data: updated,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

// 为指定维度新增选项
adminQuestionDimensionRouter.post(
  '/:key/options',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { key } = req.params;
      const { value, label, order, enabled } = req.body as {
        value: string;
        label: string;
        order?: number;
        enabled?: boolean;
      };

      if (!value || !label) {
        throw new AppError(400, 'VALIDATION_ERROR', '参数验证失败', {
          errors: [
            { field: 'value', message: 'value 不能为空' },
            { field: 'label', message: 'label 不能为空' }
          ]
        });
      }

      if (order !== undefined && typeof order !== 'number') {
        throw new AppError(400, 'VALIDATION_ERROR', '参数验证失败', {
          errors: [{ field: 'order', message: 'order 必须为数字' }]
        });
      }

      if (enabled !== undefined && typeof enabled !== 'boolean') {
        throw new AppError(400, 'VALIDATION_ERROR', '参数验证失败', {
          errors: [{ field: 'enabled', message: 'enabled 必须为布尔值' }]
        });
      }

      const created = await questionDimensionService.createOption({
        dimensionKey: key,
        value,
        label,
        order,
        enabled
      });

      return res.status(201).json({
        code: 201,
        message: '创建成功',
        data: created,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

// 更新指定选项
adminQuestionDimensionRouter.put(
  '/:key/options/:optionId',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { optionId } = req.params;
      const { label, order, enabled } = req.body as {
        label?: string;
        order?: number;
        enabled?: boolean;
      };

      if (
        (label !== undefined && typeof label !== 'string') ||
        (order !== undefined && typeof order !== 'number') ||
        (enabled !== undefined && typeof enabled !== 'boolean')
      ) {
        throw new AppError(400, 'VALIDATION_ERROR', '参数验证失败', {
          errors: [
            { field: 'label', message: 'label 必须为字符串' },
            { field: 'order', message: 'order 必须为数字' },
            { field: 'enabled', message: 'enabled 必须为布尔值' }
          ]
        });
      }

      const updated = await questionDimensionService.updateOption({
        id: optionId,
        dimensionKey: req.params.key,
        label,
        order,
        enabled
      });

      return res.json({
        code: 200,
        message: '更新成功',
        data: updated,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

