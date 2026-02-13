import { describe, it, expect } from 'vitest';
import { useAuthStore } from '@/stores/useAuthStore';

describe('auth store derived-state recompute', () => {
  it('should recompute isActiveMember from latest user.classHours', () => {
    const activeUser = {
      id: 's1',
      phone: '13800000000',
      nickname: '学生',
      role: 'student' as const,
      classHours: {
        userId: 's1',
        phone: '13800000000',
        name: '学生',
        role: 'student' as const,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isExpired: false,
        remainingDays: 1,
        status: 'active' as const
      }
    };

    // 先登录，得到 active=true
    useAuthStore.getState().login(activeUser as any, 'token-1');
    expect(useAuthStore.getState().isActiveMember).toBe(true);

    // 模拟“刷新后残留旧快照”：先把派生状态手动篡改为 false，再触发重算
    useAuthStore.setState({ isActiveMember: false });
    expect(useAuthStore.getState().isActiveMember).toBe(false);

    useAuthStore.getState().recomputeDerivedState();
    expect(useAuthStore.getState().isActiveMember).toBe(true);
  });
});

