import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import {
  authMiddleware,
  type AuthenticatedRequest
} from '../middlewares/auth.middleware';

export const authRouter = Router();

authRouter.post(
  '/send-code',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, type } = req.body as { phone: string; type?: string };
      const result = await authService.sendCode(phone, (type as any) ?? 'login');
      return res.json({
        code: 200,
        message: '验证码已发送',
        data: result,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, code } = req.body as { phone: string; code: string };
      const result = await authService.login(phone, code);
      return res.json({
        code: 200,
        message: '登录成功',
        data: result,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/password-login',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, password } = req.body as {
        phone: string;
        password: string;
      };
      const result = await authService.passwordLogin(phone, password);
      return res.json({
        code: 200,
        message: '登录成功',
        data: result,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, code, name, nickname, grade, age, school, role, password } = req.body as {
        phone: string;
        code: string;
        name?: string;          // 真实姓名（与nickname分开）
        nickname?: string;
        grade?: string;
        age?: number;
        school?: string;
        role?: 'student' | 'teacher' | 'parent';
        password?: string;
      };
      const result = await authService.register({
        phone,
        code,
        name,
        nickname,
        grade,
        age,
        school,
        role,
        password
      });
      return res.status(201).json({
        code: 201,
        message: '注册成功',
        data: result,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/refresh-token',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization ?? '';
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length)
        : '';

      const result = await authService.refreshToken(token);
      return res.json({
        code: 200,
        message: 'Token刷新成功',
        data: result,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization ?? '';
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length)
        : '';

      await authService.logout(token);
      return res.json({
        code: 200,
        message: '退出成功',
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.get(
  '/me',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const current = await authService.me(req.user!.id);
      return res.json({
        code: 200,
        message: 'success',
        data: current,
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/set-password',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { newPassword } = req.body as { newPassword: string };
      await authService.setPassword(req.user!.id, newPassword);
      return res.json({
        code: 200,
        message: '密码已更新',
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/reset-password',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, code, newPassword } = req.body as {
        phone: string;
        code: string;
        newPassword: string;
      };
      await authService.resetPasswordWithCode({
        phone,
        code,
        newPassword
      });
      return res.json({
        code: 200,
        message: '密码已重置，请重新登录',
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

