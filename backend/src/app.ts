import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { loggerMiddleware } from './middlewares/logger.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import { authRouter } from './routes/auth.routes';
import { adminWhitelistRouter } from './routes/admin-whitelist.routes';
import { adminClassHoursRouter } from './routes/admin-class-hours.routes';
import { questionRouter } from './routes/question.routes';
import { commentRouter } from './routes/comment.routes';
import { answerRouter } from './routes/answer.routes';
import { userMeRouter } from './routes/user-me.routes';
import { behaviorRouter } from './routes/behavior.routes';
import { notificationRouter } from './routes/notification.routes';
import { adminAuditRouter } from './routes/admin-audit.routes';
import { uploadRouter } from './routes/upload.routes';
import { internalRouter } from './routes/internal.routes';
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
  app.use('/api/admin/audit', adminAuditRouter);
  app.use('/api/questions', questionRouter);
  app.use('/api/comments', commentRouter);
  app.use('/api/answers', answerRouter);
  app.use('/api/users/me', userMeRouter);
  app.use('/api/behavior', behaviorRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/internal', internalRouter);
  app.use('/api', notificationRouter);

  app.use(errorMiddleware);

  return app;
};
