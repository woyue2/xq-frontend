import { describe, it, expect } from 'vitest';
import { isMemberActive } from '@/lib/permissions';
import type { User } from '@/types';

const createStudent = (overrides: Partial<User> = {}): User => ({
  id: 'student_1',
  phone: '13800000000',
  nickname: '学生A',
  role: 'student',
  ...overrides
});

describe('Membership source priority (classHours first)', () => {
  it('should treat student as inactive when classHours says expired even if expiresAt is future', () => {
    const user = createStudent({
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      classHours: {
        userId: 'student_1',
        phone: '13800000000',
        name: '学生A',
        role: 'student',
        validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        isExpired: true,
        remainingDays: -1,
        status: 'expired'
      }
    });

    expect(isMemberActive(user)).toBe(false);
  });

  it('should fallback to expiresAt when classHours is missing', () => {
    const user = createStudent({
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

    expect(isMemberActive(user)).toBe(true);
  });
});

