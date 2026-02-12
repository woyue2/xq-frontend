import type { NextFunction, Response } from 'express';
import { requireActiveMembership } from '../../middlewares/membership.middleware';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AppError } from '../../errors/AppError';
import { classHoursService } from '../../services/class-hours.service';

const createMock = () => {
  const req = {
    headers: {}
  } as unknown as AuthenticatedRequest;
  const res = {} as Response;
  const next = jest.fn() as unknown as NextFunction & {
    mock: jest.Mock;
  };
  return { req, res, next: next as unknown as jest.Mock & NextFunction };
};

describe('requireActiveMembership', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('应当在未登录时返回 UNAUTHORIZED', async () => {
    const { req, res, next } = createMock();

    await requireActiveMembership(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as AppError;
    expect(err.status).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('应当在课时已过期时返回 MEMBER_EXPIRED', async () => {
    const { req, res, next } = createMock();
    req.user = {
      id: 'user-expired',
      role: 'student'
    };

    jest
      .spyOn(classHoursService, 'getUserClassHours')
      .mockResolvedValue({
        userId: 'user-expired',
        phone: '13800138000',
        name: '过期学生',
        role: 'student',
        validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isExpired: true,
        remainingDays: -1,
        status: 'expired'
      });

    await requireActiveMembership(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as AppError;
    expect(err.status).toBe(403);
    expect(err.code).toBe('MEMBER_EXPIRED');
  });

  it('应当在课时有效时放行', async () => {
    const { req, res, next } = createMock();
    req.user = {
      id: 'user-active',
      role: 'student'
    };

    jest
      .spyOn(classHoursService, 'getUserClassHours')
      .mockResolvedValue({
        userId: 'user-active',
        phone: '13800138001',
        name: '有效学生',
        role: 'student',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isExpired: false,
        remainingDays: 30,
        status: 'active'
      });

    await requireActiveMembership(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
