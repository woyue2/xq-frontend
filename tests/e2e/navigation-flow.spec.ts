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

    // 使用带 data-testid 的导航头像按钮，避免误点通知按钮
    const profileBtn = page.getByTestId('nav-profile');
    await profileBtn.click();

    await expect(page).toHaveURL(/\/profile$/);
  });
});
