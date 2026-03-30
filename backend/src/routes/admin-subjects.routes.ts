/**
 * [POS] backend/src/routes/admin-subjects.routes.ts
 *   所属：路由层 | 角色：科目/考点管理员路由
 *
 * [INPUT]
 *   - express                        → Router / Response / NextFunction
 *   - ../middlewares/auth.middleware  → authMiddleware / createRequireTeacher / AuthenticatedRequest
 *   - ../services/subject.service    → subjectService
 *   - ../errors/AppError             → AppError
 *
 * [OUTPUT]
 *   - adminSubjectsRouter（Express Router）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/routes/CLAUDE.md 的文件清单
 */
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import {
  authMiddleware,
  createRequireTeacher,
  type AuthenticatedRequest
} from '../middlewares/auth.middleware';
import { subjectService } from '../services/subject.service';
import { AppError } from '../errors/AppError';

export const adminSubjectsRouter = Router();

adminSubjectsRouter.use(
  authMiddleware,
  createRequireTeacher({
    bizCode: 3007,
    message: '无科目管理权限'
  })
);

// 获取所有科目及其考点
adminSubjectsRouter.get(
  '/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const subjects = await subjectService.listAllSubjects();
      return res.json({
        code: 200,
        message: 'success',
        data: {
          subjects: subjects.map((s) => ({
            key: s.key,
            name: s.name,
            enabled: s.enabled,
            order: s.order,
            description: s.description,
            topics: s.topics.map((t) => ({
              id: t.id,
              subjectKey: t.subjectKey,
              value: t.value,
              label: t.label,
              order: t.order,
              enabled: t.enabled
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

// 新增科目
adminSubjectsRouter.post(
  '/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { key, name, order, description } = req.body as {
        key: string;
        name: string;
        order?: number;
        description?: string;
      };

      if (typeof key !== 'string' || !key.trim()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'key 为必填字符串');
      }
      if (typeof name !== 'string' || !name.trim()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'name 为必填字符串');
      }

      const created = await subjectService.createSubject({ key, name, order, description });
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

// 更新科目
adminSubjectsRouter.put(
  '/:key',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { key } = req.params;
      const { name, enabled, order, description } = req.body as {
        name?: string;
        enabled?: boolean;
        order?: number;
        description?: string;
      };

      if (enabled !== undefined && typeof enabled !== 'boolean') {
        throw new AppError(400, 'VALIDATION_ERROR', 'enabled 必须为布尔值');
      }

      const updated = await subjectService.updateSubject({ key, name, enabled, order, description });
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

// 新增考点
adminSubjectsRouter.post(
  '/:key/topics',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { key: subjectKey } = req.params;
      const { value, label, order } = req.body as {
        value: string;
        label: string;
        order?: number;
      };

      if (typeof value !== 'string' || !value.trim()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'value 为必填字符串');
      }
      if (typeof label !== 'string' || !label.trim()) {
        throw new AppError(400, 'VALIDATION_ERROR', 'label 为必填字符串');
      }

      const created = await subjectService.createTopic({ subjectKey, value, label, order });
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

// 更新考点
adminSubjectsRouter.put(
  '/:key/topics/:topicId',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { key: subjectKey, topicId: id } = req.params;
      const { label, order, enabled } = req.body as {
        label?: string;
        order?: number;
        enabled?: boolean;
      };

      if (enabled !== undefined && typeof enabled !== 'boolean') {
        throw new AppError(400, 'VALIDATION_ERROR', 'enabled 必须为布尔值');
      }

      const updated = await subjectService.updateTopic({ id, subjectKey, label, order, enabled });
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
