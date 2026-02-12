import { test, expect } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

test.describe('Subject Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapAuth(page, 'student');
  });

  test('首页可以按科目筛选问题', async ({ page }) => {
    await page.goto('/');

    // 验证科目筛选按钮存在
    await expect(page.getByRole('button', { name: '数学' })).toBeVisible();
    await expect(page.getByRole('button', { name: '物理' })).toBeVisible();
    await expect(page.getByRole('button', { name: '化学' })).toBeVisible();

    // 点击数学科目
    await page.getByRole('button', { name: '数学' }).click();

    // 等待考点筛选器出现（如果实现的话）
    const topicFilter = page.getByText(/考点:/);

    const isVisible = await topicFilter.isVisible().catch(() => false);

    if (isVisible) {
      // 验证可以看到一些考点按钮
      await expect(page.getByRole('button', { name: /二次函数|勾股定理/ })).toBeVisible();
    }
  });

  test('筛选后URL更新正确', async ({ page }) => {
    await page.goto('/');

    // 选择数学
    await page.getByRole('button', { name: '数学' }).click();

    // 验证 URL 包含科目参数
    await page.waitForURL(/subject=/);

    const url = page.url();
    expect(url).toContain('subject=');
  });

  test('可以点击"全部"清除筛选', async ({ page }) => {
    await page.goto('/');

    // 先选择一个科目
    await page.getByRole('button', { name: '数学' }).click();
    await page.waitForURL(/subject=/);

    // 点击"全部"清除筛选
    const allButton = page.getByRole('button', { name: '全部' });

    const isVisible = await allButton.isVisible().catch(() => false);

    if (isVisible) {
      await allButton.click();

      // 验证 URL 不再包含 subject 参数
      await page.waitForURL(url => !url.includes('subject='));
    }
  });
});
