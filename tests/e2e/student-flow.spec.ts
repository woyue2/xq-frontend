import { test, expect } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

test.describe('学生角色端到端业务链路', () => {
  test('学生: 提问 → 问题详情 → 点赞/收藏', async ({ page }) => {
    await bootstrapAuth(page, 'student');

    await page.goto('/');

    // 1. 通过浮动按钮进入提问页
    const createBtn = page.getByTestId('nav-create');
    await expect(createBtn).toBeVisible();
    await createBtn.click();
    await expect(page).toHaveURL(/\/create$/);

    // 2. 在提问页选择科目、填写标题和详情
    await page.getByRole('button', { name: '数学' }).click();

    const titleText = `E2E 测试问题 ${Date.now()}`;
    await page.getByLabel('问题标题', { exact: false }).fill(titleText);
    await page
      .getByLabel('问题详情', { exact: false })
      .fill('这是一个端到端链路测试生成的问题详情，用于验证提问到详情页的完整流程。');

    const submitButton = page.getByRole('button', { name: '提交' });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // 3. 成功后应跳转到问题详情页
    await expect(page).toHaveURL(/\/question\//, { timeout: 15_000 });
    await expect(
      page.getByRole('heading', { name: '问题详情' })
    ).toBeVisible();
    await expect(page.getByText(titleText)).toBeVisible();

    // 4. 在详情页执行点赞与收藏操作（前端会调用 /api/interactions + /api/behavior/log）
    const likeBtn = page.getByTestId('like-btn');
    await expect(likeBtn).toBeVisible();
    await likeBtn.click();
    await expect(page.getByText(/点赞成功|已取消点赞/)).toBeVisible();

    const favoriteBtn = page.getByTestId('favorite-btn');
    await expect(favoriteBtn).toBeVisible();
    await favoriteBtn.click();
    await expect(page.getByText(/收藏成功|已取消收藏/)).toBeVisible();
  });

  test('学生: 个人中心访问我的提问/点赞/收藏', async ({ page }) => {
    await bootstrapAuth(page, 'student');

    await page.goto('/');

    // 打开个人中心（复用已有导航逻辑的选择方式）
    const avatarBtn = page.getByRole('button').locator('..').locator('img, span');
    const fallback = page.getByText('我');

    if (await avatarBtn.first().isVisible()) {
      await avatarBtn.first().click();
    } else {
      await fallback.click();
    }

    await expect(page).toHaveURL(/\/profile$/);

    // 1) 我的提问
    await page.getByText('我的提问').click();
    await expect(page).toHaveURL(/\/my-questions$/);

    // 返回个人中心
    await page.goto('/profile');

    // 2) 我的点赞
    await page.getByText('我的点赞').click();
    await expect(page).toHaveURL(/\/my-likes$/);

    // 返回个人中心
    await page.goto('/profile');

    // 3) 我的收藏
    await page.getByText('我的收藏').click();
    await expect(page).toHaveURL(/\/my-favorites$/);
  });
}
);
