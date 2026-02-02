import { test, expect } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

test.describe('主界面导航与页面跳转', () => {
  test('浮动按钮可以跳转到提问页面', async ({ page }) => {
    await bootstrapAuth(page, 'student');

    await page.goto('/');

    // 浮动的创建问题按钮
    const createBtn = page.getByTestId('nav-create');
    await expect(createBtn).toBeVisible();

    await createBtn.click();

    // 期望跳转到 /create 路由
    await expect(page).toHaveURL(/\/create$/);
  });

  test('个人头像可以跳转到个人中心页面', async ({ page }) => {
    await bootstrapAuth(page, 'student');

    await page.goto('/');

    // Header 中的头像按钮
    const avatarBtn = page.getByRole('button').locator('..').locator('img, span');
    // 为避免选择过宽，这里用文本“我”作为兜底
    const fallback = page.getByText('我');

    if (await avatarBtn.first().isVisible()) {
      await avatarBtn.first().click();
    } else {
      await fallback.click();
    }

    await expect(page).toHaveURL(/\/profile$/);
  });
});

