/**
 * [POS] backend/src/routes/admin-whitelist.routes.ts
 *   所属：路由层 | 角色：管理员白名单路由（添加/删除/查询可注册用户）
 *
 * [INPUT]
 *   - express                        → Router / Response / NextFunction
 *   - ../middlewares/auth.middleware  → authMiddleware / requireTeacher / AuthenticatedRequest / createRequireTeacher
 *   - ../services/whitelist.service  → whitelistService
 *
 * [OUTPUT]
 *   - adminWhitelistRouter（Express Router）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/routes/CLAUDE.md 的文件清单
 */
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import {
  authMiddleware,
  requireTeacher,
  type AuthenticatedRequest,
  createRequireTeacher
} from '../middlewares/auth.middleware';
import { whitelistService } from '../services/whitelist.service';

export const adminWhitelistRouter = Router();

adminWhitelistRouter.use(
  authMiddleware,
  createRequireTeacher({
    bizCode: 3005,
    message: '无白名单管理权限'
  })
);

adminWhitelistRouter.get(
  '/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        page,
        pageSize,
        role,
        status,
        search,
        searchField
      } = req.query as Record<string, string>;

      const result = await whitelistService.list({
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
        role,
        status: status as any,
        search,
        searchField: searchField as any
      });

      return res.json({
        code: 200,
        message: 'success',
        data: result,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

adminWhitelistRouter.post(
  '/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { phone, name, role, validUntil, notes } = req.body as {
        phone: string;
        name: string;
        role: 'student' | 'parent' | 'teacher';
        validUntil?: string;
        notes?: string;
      };

      const created = await whitelistService.create({
        phone,
        name,
        role,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        notes,
        createdBy: req.user!.id
      });

      return res.status(201).json({
        code: 201,
        message: '添加成功',
        data: created,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

adminWhitelistRouter.patch(
  '/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { validUntil } = req.body as { validUntil?: string };

      const updated = await whitelistService.update(
        id,
        validUntil ? { validUntil: new Date(validUntil) } : {}
      );

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

adminWhitelistRouter.delete(
  '/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await whitelistService.remove(id, {
        deletedBy: req.user!.id
      });

      return res.json({
        code: 200,
        message: '删除成功',
        ...(result.warning ? { data: { warning: result.warning } } : {}),
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);
