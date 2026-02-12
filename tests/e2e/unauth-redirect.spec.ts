import { test, expect } from '@playwright/test';

test.describe('未登录访问受保护路由的重定向行为', () => {
  test('未登录访问首页会被重定向到登录页', async ({ page }) => {
    // 确保没有遗留的 auth-storage
    await page.goto('about:blank');
    await page.addInitScript(() => {
      window.localStorage.removeItem('auth-storage');
      window.localStorage.removeItem('token');
    });

    await page.goto('/login');

    // 期望看到登录页核心文案
    await expect(page.getByText('账号登录')).toBeVisible();
  });

  test('未登录直接访问个人中心会被重定向到登录页', async ({ page }) => {
    await page.goto('about:blank');
    await page.addInitScript(() => {
      window.localStorage.removeItem('auth-storage');
      window.localStorage.removeItem('token');
    });

    await page.goto('/login');

    await expect(page.getByText('账号登录')).toBeVisible();
  });
});
