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
 * 核心日志实例，供中间件与业务代码共享。
 *
 * 注意:
 * - 所有通过该 logger 输出的日志均为结构化 JSON。
 */
export const coreLogger = defaultLogger;

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
    logger: coreLogger,
    genReqId: generateRequestId,
    // 为所有访问日志增加 mode 字段:
    // - 来自前端的 X-Client-Mode=mock 时为 'mock'
    // - 其他情况统一视为 'normal'
    customProps: (req) => {
      const headers = (req as any).headers ?? {};
      const rawMode = (headers['x-client-mode'] ??
        headers['X-Client-Mode'] ??
        headers['x-client-mode'.toLowerCase()]) as string | undefined;

      const mode: 'mock' | 'normal' =
        rawMode === 'mock'
          ? 'mock'
          : 'normal';

      return { mode };
    },
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
