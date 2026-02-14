import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { loggerMiddleware } from './middlewares/logger.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import { swaggerOptions } from './config/swagger';
import { authRouter } from './routes/auth.routes';
import { adminWhitelistRouter } from './routes/admin-whitelist.routes';
import { adminClassHoursRouter } from './routes/admin-class-hours.routes';
// import { adminQuestionDimensionRouter } from './routes/admin-question-dimensions.routes';
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
      origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
      credentials: true
    })
  );
  app.use(express.json());
  app.use(loggerMiddleware);

  const specs = swaggerJsdoc(swaggerOptions);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: `
      .topbar-wrapper { background-color: #1890ff; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui topbar { display: block; }
    `,
    customSiteTitle: 'kpqa API 文档',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3
    }
  }));

  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  // 本地音频静态资源目录映射：/static/audio/* -> AUDIO_BASE_DIR
  const audioDir = path.isAbsolute(env.AUDIO_BASE_DIR)
    ? env.AUDIO_BASE_DIR
    : path.join(process.cwd(), env.AUDIO_BASE_DIR);
  app.use('/static/audio', express.static(audioDir));

  // 修改原因：支持图片本地兜底上传后的静态访问路径。
  const imageDir = path.join(process.cwd(), 'static', 'image');
  app.use('/static/image', express.static(imageDir));

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/admin/whitelist', adminWhitelistRouter);
  app.use('/api/admin/class-hours', adminClassHoursRouter);
  // 修改原因：按当前产品决策临时停用“题目维度管理”后台入口，避免空库阶段出现可见但不可完成初始化的管理流程。
  // ⚠️ 不确定因素：后续若恢复维度管理能力，需要同步恢复该路由挂载并补齐从 0 初始化维度的能力。
  // app.use('/api/admin/question-dimensions', adminQuestionDimensionRouter);
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
