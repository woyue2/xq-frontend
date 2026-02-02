import { test, expect } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

test.describe('教师角色端到端业务链路', () => {
  test('老师: 个人中心入口 → 审核管理 / 用户白名单', async ({ page }) => {
    await bootstrapAuth(page, 'teacher');

    await page.goto('/');

    // 进入个人中心
    const avatarBtn = page.getByRole('button').locator('..').locator('img, span');
    const fallback = page.getByText('我');

    if (await avatarBtn.first().isVisible()) {
      await avatarBtn.first().click();
    } else {
      await fallback.click();
    }

    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByText('老师（有权限）')).toBeVisible();

    // 教师专属入口应可见
    await expect(page.getByText('审核管理')).toBeVisible();
    await expect(page.getByText('用户白名单')).toBeVisible();
    await expect(page.getByText('我的回答')).toBeVisible();
    await expect(page.getByText('我的提问')).toBeVisible();

    // 1) 跳转到审核管理页
    await page.getByText('审核管理').click();
    await expect(page).toHaveURL(/\/audit$/);
    await expect(page.getByTestId('audit-page')).toBeVisible();

    // 2) 跳转到用户白名单管理页
    await page.goto('/profile');
    await page.getByText('用户白名单').click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText('用户白名单管理')).toBeVisible();
  });
});

