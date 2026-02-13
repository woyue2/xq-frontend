import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import {
    authMiddleware,
    type AuthenticatedRequest
} from '../middlewares/auth.middleware';
import { parentService } from '../services/parent.service';
import { AppError } from '../errors/AppError';

export const parentRouter = Router();

parentRouter.use(authMiddleware);

/**
 * @swagger
 * /parents/bind:
 *   post:
 *     summary: 绑定孩子
 *     description: 家长绑定孩子账号
 *     tags:
 *       - Parent
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, code, childName]
 *             properties:
 *               phone:
 *                 type: string
 *               code:
 *                 type: string
 *               childName:
 *                 type: string
 *               school:
 *                 type: string
 *     responses:
 *       200:
 *         description: 绑定成功
 */
parentRouter.post(
    '/bind',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user || req.user.role !== 'parent') {
                throw new AppError(403, 'FORBIDDEN', '只有家长可以绑定孩子');
            }

            const { phone, code, childName, school } = req.body;
            if (!phone || !code || !childName) {
                throw new AppError(400, 'INVALID_PARAMS', '参数不完整');
            }

            const result = await parentService.bindChild(req.user.id, {
                phone,
                code,
                childName,
                school
            });

            res.json({
                code: 200,
                message: 'success',
                data: result
            });
        } catch (err) {
            next(err);
        }
    }
);

/**
 * @swagger
 * /parents/children:
 *   get:
 *     summary: 获取已绑定孩子列表
 *     description: 家长获取已绑定孩子列表
 *     tags:
 *       - Parent
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
parentRouter.get(
    '/children',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user || req.user.role !== 'parent') {
                throw new AppError(403, 'FORBIDDEN', '只有家长可以查看孩子列表');
            }

            const result = await parentService.getChildren(req.user.id);

            res.json({
                code: 200,
                message: 'success',
                data: result
            });
        } catch (err) {
            next(err);
        }
    }
);

/**
 * @swagger
 * /parents/unbind:
 *   post:
 *     summary: 解绑孩子
 *     description: 家长解绑已绑定孩子
 *     tags:
 *       - Parent
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [childId]
 *             properties:
 *               childId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 解绑成功
 */
parentRouter.post(
    '/unbind',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user || req.user.role !== 'parent') {
                throw new AppError(403, 'FORBIDDEN', '只有家长可以解绑孩子');
            }

            const { childId } = req.body;
            await parentService.unbindChild(req.user!.id, childId);

            res.json({
                code: 200,
                message: 'success',
                data: null
            });
        } catch (err) {
            next(err);
        }
    }
);

/**
 * @swagger
 * /parents/questions/{childId}:
 *   get:
 *     summary: 获取孩子问题列表
 *     description: 家长查看孩子提问的问题列表
 *     tags:
 *       - Parent
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema:
 *           type: string
 *         description: 孩子ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 获取成功
 */
parentRouter.get(
    '/questions/:childId',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user || req.user.role !== 'parent') {
                throw new AppError(403, 'FORBIDDEN', '只有家长可以查看孩子问题');
            }

            const { childId } = req.params;
            const { page, pageSize, limit, subject, topic } = req.query as any;
            // 修改原因：前端历史上混用 pageSize/limit；为兼容现网请求，这里统一兜底到 pageSize。
            const rawPageSize = pageSize ?? limit;

            const result = await parentService.getChildQuestions(
                req.user!.id,
                childId,
                page ? Number(page) : 1,
                rawPageSize ? Number(rawPageSize) : 10,
                typeof subject === 'string' ? subject : undefined,
                typeof topic === 'string' ? topic : undefined
            );

            res.json({
                code: 200,
                message: 'success',
                data: result
            });
        } catch (err) {
            next(err);
        }
    }
);
