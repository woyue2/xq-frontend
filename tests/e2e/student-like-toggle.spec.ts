import { test, expect } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

// STU-010: 学生在问题详情页点赞/取消点赞（真实后端 + 数据库）
test.describe('STU-010 学生点赞/取消点赞真实链路', () => {
  test('学生: 问题详情页点赞后再次点击变为取消点赞', async ({ page }) => {
    await bootstrapAuth(page, 'student');

    await page.goto('/');

    // 1. 通过浮动按钮进入提问页并创建一条唯一问题
    const createBtn = page.getByTestId('nav-create');
    await expect(createBtn).toBeVisible();
    await createBtn.click();
    await expect(page).toHaveURL(/\/create$/);

    await page.getByRole('button', { name: '数学' }).click();
    const titleText = `STU-010 点赞切换测试问题 ${Date.now()}`;
    await page.getByLabel('问题标题', { exact: false }).fill(titleText);
    await page
      .getByLabel('问题详情', { exact: false })
      .fill('用于验证问题详情页点赞/取消点赞真实链路（走后端 + 数据库）。');

    await page.getByRole('button', { name: '提交' }).click();

    // 2. 跳转到问题详情页，确保标题可见
    await expect(page).toHaveURL(/\/question\//, { timeout: 15_000 });
    await expect(page.getByText(titleText)).toBeVisible();

    const likeBtn = page.getByTestId('like-btn');
    await expect(likeBtn).toBeVisible();

    // 3. 首次点击：应出现“点赞成功”提示（或包含“点赞成功”的文案）
    await likeBtn.click();
    await expect(
      page.getByText(/点赞成功/)
    ).toBeVisible();

    // 4. 第二次点击：应出现“已取消点赞”提示
    await likeBtn.click();
    await expect(
      page.getByText(/已取消点赞/)
    ).toBeVisible();
  });
});

