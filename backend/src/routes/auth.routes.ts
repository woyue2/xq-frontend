import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import {
  authMiddleware,
  type AuthenticatedRequest
} from '../middlewares/auth.middleware';

export const authRouter = Router();

/**
 * @swagger
 * /auth/send-code:
 *   post:
 *     summary: 发送验证码
 *     description: 向指定手机号发送登录验证码，支持登录、注册、绑定三种类型
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 description: 手机号
 *                 example: "13800138000"
 *               type:
 *                 type: string
 *                 enum: [login, register, bind]
 *                 description: 验证码类型
 *                 default: login
 *                 example: "login"
 *     responses:
 *       200:
 *         description: 验证码发送成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "验证码已发送"
 *                 data:
 *                   type: object
 *                   properties:
 *                     expireIn:
 *                       type: number
 *                       description: 验证码有效期（秒）
 *                     cooldown:
 *                       type: number
 *                       description: 发送间隔（秒）
 *                 timestamp:
 *                   type: number
 */
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

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 验证码登录
 *     description: 使用手机号和验证码登录，获取 JWT Token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - code
 *             properties:
 *               phone:
 *                 type: string
 *                 description: 手机号
 *                 example: "13800138000"
 *               code:
 *                 type: string
 *                 description: 验证码
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "登录成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT Token
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                 timestamp:
 *                   type: number
 */
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

/**
 * @swagger
 * /auth/password-login:
 *   post:
 *     summary: 密码登录
 *     description: 使用手机号和密码登录（需要先设置密码）
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - password
 *             properties:
 *               phone:
 *                 type: string
 *                 description: 手机号
 *               password:
 *                 type: string
 *                 description: 密码
 *     responses:
 *       200:
 *         description: 登录成功
 */
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

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: 用户注册
 *     description: 使用手机号和验证码注册新用户
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - code
 *             properties:
 *               phone:
 *                 type: string
 *                 description: 手机号
 *               code:
 *                 type: string
 *                 description: 验证码
 *               name:
 *                 type: string
 *                 description: 真实姓名
 *               nickname:
 *                 type: string
 *                 description: 昵称
 *               grade:
 *                 type: string
 *                 description: 年级
 *               age:
 *                 type: number
 *                 description: 年龄
 *               school:
 *                 type: string
 *                 description: 学校
 *               role:
 *                 type: string
 *                 enum: [student, teacher, parent]
 *                 description: 角色
 *               password:
 *                 type: string
 *                 description: 密码（可选）
 *     responses:
 *       201:
 *         description: 注册成功
 */
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

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: 刷新 Token
 *     description: 使用当前 Token 刷新获取新的 JWT Token
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token 刷新成功
 */
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

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: 退出登录
 *     description: 使当前 Token 失效
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 退出成功
 */
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

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: 获取当前用户信息
 *     description: 根据 Token 获取当前登录用户的详细信息
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/User'
 */
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

/**
 * @swagger
 * /auth/set-password:
 *   post:
 *     summary: 设置密码
 *     description: 为已登录用户设置或修改密码
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 description: 新密码
 *     responses:
 *       200:
 *         description: 密码设置成功
 */
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

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: 重置密码
 *     description: 通过手机验证码重置密码
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - code
 *               - newPassword
 *             properties:
 *               phone:
 *                 type: string
 *                 description: 手机号
 *               code:
 *                 type: string
 *                 description: 验证码
 *               newPassword:
 *                 type: string
 *                 description: 新密码
 *     responses:
 *       200:
 *         description: 密码重置成功
 */
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

