/**
 * [POS] backend/src/app.ts
 *   所属：后端入口层 | 角色：Express 应用工厂，注册所有中间件和路由
 *   兄弟：server.ts
 *
 * [INPUT]
 *   - express / cors / helmet / path → 框架与安全中间件
 *   - ./middlewares/*               → logger, error 中间件
 *   - ./routes/*                    → 所有业务路由
 *
 * [OUTPUT]
 *   - createApp()（工厂函数，返回 Express 实例）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/CLAUDE.md 的文件清单
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { loggerMiddleware } from './middlewares/logger.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import { authRouter } from './routes/auth.routes';
import { adminWhitelistRouter } from './routes/admin-whitelist.routes';
import { adminClassHoursRouter } from './routes/admin-class-hours.routes';
import { adminQuestionDimensionRouter } from './routes/admin-question-dimensions.routes';
import { adminSubjectsRouter } from './routes/admin-subjects.routes';
import { questionRouter } from './routes/question.routes';
import { commentRouter } from './routes/comment.routes';
import { answerRouter } from './routes/answer.routes';
import { userMeRouter } from './routes/user-me.routes';
import { behaviorRouter } from './routes/behavior.routes';
import { interactionRouter } from './routes/interaction.routes';
import { notificationRouter } from './routes/notification.routes';
import { adminAuditRouter } from './routes/admin-audit.routes';
import { uploadRouter } from './routes/upload.routes';
import { internalRouter } from './routes/internal.routes';
import { configRouter } from './routes/config.routes';
import { profileRouter } from './routes/profile.routes';
import { parentRouter } from './routes/parent.routes';
import { env } from './config/env';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: '*'
    })
  );
  app.use(express.json());
  app.use(loggerMiddleware);

  // 本地音频静态资源目录映射：/static/audio/* -> AUDIO_BASE_DIR
  const audioDir = path.isAbsolute(env.AUDIO_BASE_DIR)
    ? env.AUDIO_BASE_DIR
    : path.join(process.cwd(), env.AUDIO_BASE_DIR);
  app.use('/static/audio', express.static(audioDir));

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/admin/whitelist', adminWhitelistRouter);
  app.use('/api/admin/class-hours', adminClassHoursRouter);
  app.use('/api/admin/question-dimensions', adminQuestionDimensionRouter);
  app.use('/api/admin/subjects', adminSubjectsRouter);
  app.use('/api/admin/audit', adminAuditRouter);
  app.use('/api/questions', questionRouter);
  app.use('/api/comments', commentRouter);
  app.use('/api/answers', answerRouter);
  app.use('/api/users/me', userMeRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/behavior', behaviorRouter);
  app.use('/api/interactions', interactionRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/internal', internalRouter);
  app.use('/api/config', configRouter);
  app.use('/api/parent', parentRouter);
  app.use('/api', notificationRouter);

  app.use(errorMiddleware);

  return app;
};
