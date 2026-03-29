/**
 * [POS] backend/src/middlewares/error.middleware.ts
 *   所属：中间件层 | 角色：统一错误响应格式，处理 AppError / ZodError / 未知错误
 *
 * [INPUT]
 *   - express            → NextFunction / Request / Response
 *   - zod                → ZodError
 *   - ../errors/AppError → AppError
 *
 * [OUTPUT]
 *   - errorMiddleware（Express 错误处理中间件，4 参数）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/middlewares/CLAUDE.md 的文件清单
 */
import type { NextFunction, Request, Response } from 'express';

type RequestWithLog = Request & {
  // pino-http 注入的日志实例
  log?: {
    error: (obj: unknown, msg?: string) => void;
  };
};

interface ErrorLogMeta {
  type: 'app_error' | 'validation_error' | 'unknown_error';
  status: number;
  code: number;
  error: string;
  path: string;
  method: string;
}

/**
 * 将错误信息记录到日志。
 *
 * 前置条件:
 * - req 为 Express 请求对象，可选包含 pino 注入的 log。
 * - meta 中的字段已经根据当前错误类型正确填充。
 *
 * 后置条件:
 * - 若存在 req.log.error，则以结构化方式记录错误日志。
 * - 否则退回使用 console.error，不抛出新的异常。
 */
const logError = (req: RequestWithLog, meta: ErrorLogMeta, err: unknown) => {
  const logger = req.log;
  const headers = (req.headers ?? {}) as Record<string, string | string[]>;
  const rawMode = typeof headers['x-client-mode'] === 'string'
    ? headers['x-client-mode']
    : undefined;
  const mode: 'mock' | 'normal' =
    rawMode === 'mock'
      ? 'mock'
      : 'normal';

  const payload = {
    ...meta,
    mode,
    // 仅在错误为 Error 实例时附带 stack，避免日志过大
    stack: err instanceof Error ? err.stack : undefined
  };

  if (logger && typeof logger.error === 'function') {
    logger.error(payload, 'Http request error');
  } else {
    // 退回到标准输出，保证在缺少 pino 的情况下仍有最小可观测性
    // eslint-disable-next-line no-console
    console.error('[HttpError]', payload);
  }
};

/**
 * 统一错误处理中间件。
 *
 * 职责:
 * - 将不同类型的异常转换为统一的 HTTP 响应结构。
 * - 为每一次错误请求记录结构化日志，便于本地调试与线上排查。
 *
 * 前置条件:
 * - 挂载在所有路由之后 (app.use(errorMiddleware))。
 *
 * 后置条件:
 * - 对于已识别的业务错误与校验错误，返回相应状态码与错误码。
 * - 对于未知错误，返回 500 与通用错误码，不泄露内部细节。
 */
export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const request = req as RequestWithLog;
  const path = request.path;
  const method = request.method;

   const anyErr = err as any;

  // 处理 Multer 等上传相关错误，返回更友好的 4xx 提示
  if (anyErr && typeof anyErr === 'object' && anyErr.code === 'LIMIT_FILE_SIZE') {
    const status = 400;

    logError(
      request,
      {
        type: 'validation_error',
        status,
        code: status,
        error: 'FILE_TOO_LARGE',
        path,
        method
      },
      err
    );

    return res.status(status).json({
      code: status,
      message: '上传文件过大',
      error: 'FILE_TOO_LARGE',
      timestamp: Date.now()
    });
  }

  if (err instanceof AppError) {
    const status = err.status;
    const outCode = typeof err.bizCode === 'number' ? err.bizCode : status;

    logError(
      request,
      {
        type: 'app_error',
        status,
        code: outCode,
        error: err.code,
        path,
        method
      },
      err
    );

    return res.status(status).json({
      code: outCode,
      message: err.message,
      error: err.code,
      ...(err.data ? { data: err.data } : {}),
      timestamp: Date.now()
    });
  }

  if (err instanceof ZodError) {
    const status = 400;

    logError(
      request,
      {
        type: 'validation_error',
        status,
        code: status,
        error: 'VALIDATION_ERROR',
        path,
        method
      },
      err
    );

    return res.status(status).json({
      code: status,
      message: '参数校验失败',
      error: 'VALIDATION_ERROR',
      details: err.errors,
      timestamp: Date.now()
    });
  }

  const status = 500;

  logError(
    request,
    {
      type: 'unknown_error',
      status,
      code: status,
      error: 'INTERNAL_SERVER_ERROR',
      path,
      method
    },
    err
  );

  return res.status(status).json({
    code: status,
    message: '服务器内部错误',
    error: 'INTERNAL_SERVER_ERROR',
    timestamp: Date.now()
  });
};
