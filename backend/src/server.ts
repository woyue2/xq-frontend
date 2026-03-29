/**
 * [POS] backend/src/server.ts
 *   所属：后端入口层 | 角色：HTTP 服务器启动入口，监听端口并挂载 app
 *   兄弟：app.ts
 *
 * [INPUT]
 *   - ./app                        → createApp
 *   - ./config/env                 → env
 *   - ./middlewares/logger.middleware → coreLogger
 *
 * [OUTPUT]
 *   - 无（副作用：启动 HTTP 监听）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/CLAUDE.md 的文件清单
 */
import { createApp } from './app';
import { env } from './config/env';
import { coreLogger } from './middlewares/logger.middleware';

const app = createApp();

const port = env.PORT;

const server = app.listen(port, () => {
  coreLogger.info({ port }, `Backend server listening on port ${port}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
