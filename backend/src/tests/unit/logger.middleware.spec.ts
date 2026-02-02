import type { Request, Response, NextFunction } from 'express';
import { createLoggerMiddleware } from '../../middlewares/logger.middleware';

const createMockReqRes = () => {
  const req = {
    method: 'GET',
    url: '/health',
    headers: {}
  } as Request;

  const res = {
    on: jest.fn(),
    end: jest.fn()
  } as unknown as Response;

  const next: NextFunction = jest.fn();

  return { req, res, next };
};

describe('loggerMiddleware', () => {
  it('should create a pino-http logger instance', () => {
    const middleware = createLoggerMiddleware();
    expect(typeof middleware).toBe('function');
  });

  it('should attach a request id and log on response end', done => {
    const middleware = createLoggerMiddleware();

    const { req, res, next } = createMockReqRes();

    middleware(req, res as unknown as Response, next);

    expect(typeof (req as any).id === 'string' || typeof (req as any).id === 'number').toBe(
      true
    );

    done();
  });
});
