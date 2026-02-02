import { expect, request as playwrightRequest, type Page } from '@playwright/test';

type InternalTestTokenResponse = {
  code: number;
  data: {
    token: string;
    user: {
      id: string;
      phone: string;
      nickname: string;
      role: string;
      expiresAt: string | null;
    };
  };
};

/**
 * 通过后端内部接口 /api/internal/test-token 生成测试用 token 与用户，
 * 并在前端 localStorage 中写入 auth-storage，实现“免登录进入主站”的效果。
 *
 * @param page Playwright Page 对象
 * @param role 测试用户角色，默认 student
 */
export async function bootstrapAuth(
  page: Page,
  role: 'student' | 'teacher' | 'parent' = 'student'
): Promise<void> {
  const backendBase =
    process.env.BACKEND_BASE_URL || 'http://localhost:4000';

  const apiContext = await playwrightRequest.newContext({
    baseURL: backendBase
  });

  const res = await apiContext.post('/api/internal/test-token', {
    data: {
      role
    }
  });

  expect(res.ok()).toBeTruthy();

  const body = (await res.json()) as InternalTestTokenResponse;
  expect(body.code).toBe(200);

  const { token, user } = body.data;

  await page.addInitScript(
    ([userPayload, tokenPayload]) => {
      const persisted = {
        state: {
          user: userPayload,
          token: tokenPayload,
          isAuthenticated: true,
          isLoading: false,
          // 这些派生状态在应用启动时也会重新计算，这里先给出一个乐观默认值
          isActiveMember: true,
          permissions: []
        },
        version: 0
      };
      window.localStorage.setItem(
        'auth-storage',
        JSON.stringify(persisted)
      );
    },
    [user, token]
  );
}
