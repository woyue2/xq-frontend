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

// 绑定孩子
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

// 获取已绑定孩子列表
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

// 解绑孩子
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

// 获取孩子问题列表
parentRouter.get(
    '/questions/:childId',
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user || req.user.role !== 'parent') {
                throw new AppError(403, 'FORBIDDEN', '只有家长可以查看孩子问题');
            }

            const { childId } = req.params;
            const { page, pageSize } = req.query as any;

            const result = await parentService.getChildQuestions(
                req.user!.id,
                childId,
                page ? Number(page) : 1,
                pageSize ? Number(pageSize) : 10
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
