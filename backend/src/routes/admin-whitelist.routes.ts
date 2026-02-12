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

/**
 * @swagger
 * /admin/whitelist:
 *   get:
 *     summary: 获取白名单列表
 *     description: 获取白名单用户列表，支持分页和筛选
 *     tags:
 *       - Admin - Whitelist
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: 每页数量
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: 角色筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: 状态筛选
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - in: query
 *         name: searchField
 *         schema:
 *           type: string
 *         description: 搜索字段
 *     responses:
 *       200:
 *         description: 获取成功
 */

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

/**
 * @swagger
 * /admin/whitelist:
 *   post:
 *     summary: 添加白名单用户
 *     description: 将新用户添加到白名单
 *     tags:
 *       - Admin - Whitelist
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, name, role]
 *             properties:
 *               phone:
 *                 type: string
 *                 description: 手机号
 *               name:
 *                 type: string
 *                 description: 姓名
 *               role:
 *                 type: string
 *                 enum: [student, parent, teacher]
 *                 description: 角色
 *               validUntil:
 *                 type: string
 *                 format: date-time
 *                 description: 有效期
 *               notes:
 *                 type: string
 *                 description: 备注
 *     responses:
 *       201:
 *         description: 添加成功
 */

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

/**
 * @swagger
 * /admin/whitelist/{id}:
 *   patch:
 *     summary: 更新白名单用户
 *     description: 更新白名单用户信息
 *     tags:
 *       - Admin - Whitelist
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 白名单ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               validUntil:
 *                 type: string
 *                 format: date-time
 *                 description: 有效期
 *     responses:
 *       200:
 *         description: 更新成功
 */
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

/**
 * @swagger
 * /admin/whitelist/{id}:
 *   delete:
 *     summary: 删除白名单用户
 *     description: 删除指定白名单用户
 *     tags:
 *       - Admin - Whitelist
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 白名单ID
 *     responses:
 *       200:
 *         description: 删除成功
 */
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
