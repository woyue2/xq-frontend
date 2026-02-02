import pinoHttp, { type Options as PinoHttpOptions, type HttpLogger } from 'pino-http';
import pino from 'pino';
import { randomUUID } from 'crypto';

/**
 * 默认的 Pino 日志实例。
 *
 * 前置条件:
 * - 仅在 Node.js 环境中使用。
 *
 * 后置条件:
 * - 返回的 logger 可安全用于 pino-http。
 */
const defaultLogger = pino();

/**
 * 生成请求 ID。
 *
 * 前置条件:
 * - req 为 Express 请求对象。
 *
 * 后置条件:
 * - 返回非空字符串，用于标识单次请求。
 */
const generateRequestId = (req: { headers?: Record<string, unknown> }): string => {
  const explicitId = req.headers?.['x-request-id'];
  if (typeof explicitId === 'string' && explicitId.trim().length > 0) {
    return explicitId;
  }
  return randomUUID();
};

/**
 * 创建带有统一配置的日志中间件。
 *
 * 说明:
 * - 使用结构化日志记录 method、url、statusCode 等核心字段。
 * - 为每个请求生成 requestId，便于后续在日志系统中追踪。
 *
 * 前置条件:
 * - 可选的 options 不得破坏基本字段记录（method、url、statusCode）。
 *
 * 后置条件:
 * - 返回符合 Express 使用约定的中间件函数。
 */
export const createLoggerMiddleware = (
  options?: PinoHttpOptions
): HttpLogger => {
  return pinoHttp({
    logger: defaultLogger,
    genReqId: generateRequestId,
    ...options
  });
};

/**
 * 默认导出的日志中间件。
 *
 * 用途:
 * - 在应用初始化时通过 app.use(loggerMiddleware) 挂载。
 */
export const loggerMiddleware = createLoggerMiddleware();

