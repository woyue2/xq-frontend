import { test, expect } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

/**
 * 场景：已经有 auth-storage 的情况下，前端再次请求 /api/questions
 * 应该自动携带 Authorization: Bearer <token> 头部。
 *
 * 这个用例会：
 * 1. 通过 backend /api/internal/test-token 生成测试用户与 token，写入 localStorage；
 * 2. 打开首页，等待首页触发 /api/questions 请求；
 * 3. 捕获该请求，检查 Authorization 头是否存在且与 auth-storage 中的 token 一致；
 * 4. 将请求头打印到测试输出中，方便本地调试。
 */
test('已登录时 /api/questions 请求包含正确的 Authorization 头', async ({ page }) => {
  await bootstrapAuth(page, 'student');

  let capturedAuthHeader: string | undefined;

  page.on('request', (req) => {
    const url = req.url();
    if (req.method() === 'GET' && url.includes('/api/questions')) {
      const headers = req.headers();
      capturedAuthHeader = headers['authorization'];
      // 打印一份请求头到控制台，便于在 CI / 本地查看
      // eslint-disable-next-line no-console
      console.log('Captured /api/questions headers:', headers);
    }
  });

  await page.goto('/');

  // 等待首页完成一次 questions 请求（最多 5 秒）
  await page.waitForTimeout(2000);

  expect(capturedAuthHeader, '期望捕获到 /api/questions 请求').toBeDefined();
  expect(capturedAuthHeader?.toLowerCase()).toContain('bearer');

  // 从前端 localStorage 中读取 auth-storage，校验 token 一致性
  const persisted = await page.evaluate(() => {
    const raw = window.localStorage.getItem('auth-storage');
    return raw ? JSON.parse(raw) : null;
  });

  expect(persisted, 'auth-storage 应该存在').not.toBeNull();
  const token: string | undefined = persisted?.state?.token;
  expect(token, 'auth-storage.state.token 应该存在').toBeDefined();

  if (token) {
    expect(capturedAuthHeader).toContain(token);
  }
});

