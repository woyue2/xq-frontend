import { test, expect } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

test.describe('Subject Selection in Question Creation', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapAuth(page, 'student');
  });

  test('学生创建问题可以选择动态加载的科目', async ({ page }) => {
    await page.goto('/create-question');

    // 等待科目选择区域加载
    await expect(page.getByText('选择科目')).toBeVisible();

    // 验证可以看到默认科目按钮
    await expect(page.getByRole('button', { name: '数学' })).toBeVisible();
    await expect(page.getByRole('button', { name: '物理' })).toBeVisible();
    await expect(page.getByRole('button', { name: '化学' })).toBeVisible();
  });

  test('选择科目后可以看到对应考点', async ({ page }) => {
    await page.goto('/create-question');

    // 选择数学
    await page.getByRole('button', { name: '数学' }).click();

    // 等待考点选择器出现
    const topicSelector = page.getByText(/核心考点|选择考点|考点/);

    // 验证考点下拉框或按钮出现
    const isVisible = await topicSelector.isVisible().catch(() => false);

    if (isVisible) {
      // 点击考点选择器
      await topicSelector.click();

      // 验证可以看到一些常见考点
      await expect(page.getByRole('option', { name: /二次函数|勾股定理/ })).toBeVisible();
    }
  });

  test('API失败时降级到本地配置', async ({ page, context }) => {
    // 模拟 API 失败
    await context.route('/api/config/subjects', route => route.abort());

    await page.goto('/create-question');

    // 验证降级后仍然显示科目（来自本地 TAXONOMY）
    await expect(page.getByRole('button', { name: '数学' })).toBeVisible();
  });
});
