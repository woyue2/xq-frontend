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

    // 打开个人中心
    const profileBtn = page.getByTestId('nav-profile');
    await profileBtn.click();

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

  test('学生: 点赞/收藏后出现在“我的点赞”和“我的收藏”列表中', async ({ page }) => {
    await bootstrapAuth(page, 'student');

    await page.goto('/');

    // 1. 通过浮动按钮进入提问页
    const createBtn = page.getByTestId('nav-create');
    await expect(createBtn).toBeVisible();
    await createBtn.click();
    await expect(page).toHaveURL(/\/create$/);

    // 2. 创建一个带唯一标题的问题
    await page.getByRole('button', { name: '数学' }).click();
    const titleText = `E2E 列表联动测试问题 ${Date.now()}`;
    await page.getByLabel('问题标题', { exact: false }).fill(titleText);
    await page
      .getByLabel('问题详情', { exact: false })
      .fill('用于验证“点赞/收藏 → 我的列表”链路的数据。');

    await page.getByRole('button', { name: '提交' }).click();

    // 3. 跳转到问题详情页并执行点赞+收藏
    await expect(page).toHaveURL(/\/question\//, { timeout: 15_000 });
    await expect(page.getByText(titleText)).toBeVisible();

    const likeBtn = page.getByTestId('like-btn');
    const favoriteBtn = page.getByTestId('favorite-btn');

    await likeBtn.click();
    await expect(page.getByText(/点赞成功|已取消点赞/)).toBeVisible();

    await favoriteBtn.click();
    await expect(page.getByText(/收藏成功|已取消收藏/)).toBeVisible();

    // 4. 进入个人中心
    const profileBtn = page.getByTestId('nav-profile');
    await profileBtn.click();

    await expect(page).toHaveURL(/\/profile$/);

    // 5. 在“我的点赞”列表中能看到该问题标题
    await page.getByText('我的点赞').click();
    await expect(page).toHaveURL(/\/my-likes$/);
    await expect(page.getByText(titleText)).toBeVisible();

    // 6. 返回个人中心，再在“我的收藏”列表中看到同一问题
    await page.goto('/profile');
    await page.getByText('我的收藏').click();
    await expect(page).toHaveURL(/\/my-favorites$/);
    await expect(page.getByText(titleText)).toBeVisible();
  });

  test('老师: 在问题详情页发表评论并在刷新后仍可见', async ({ page }) => {
    await bootstrapAuth(page, 'teacher');

    await page.goto('/');

    // 1. 创建一个问题，保证自己是提问者（具备评论权限）
    const createBtn = page.getByTestId('nav-create');
    await expect(createBtn).toBeVisible();
    await createBtn.click();
    await expect(page).toHaveURL(/\/create$/);

    const titleText = `E2E 评论持久化测试问题 ${Date.now()}`;
    await page.getByRole('button', { name: '数学' }).click();
    await page
      .getByLabel('问题标题', { exact: false })
      .fill(titleText);
    await page
      .getByLabel('问题详情', { exact: false })
      .fill('用于验证评论提交后经后端落库，刷新仍可见。');

    await page.getByRole('button', { name: '提交' }).click();

    await expect(page).toHaveURL(/\/question\//, { timeout: 15_000 });
    await expect(page.getByText(titleText)).toBeVisible();

    // 2. 在问题详情页输入一条唯一评论并提交
    const commentText = `E2E 评论持久化 ${Date.now()}`;
    const commentInput = page.getByPlaceholder('说点什么...');
    await commentInput.fill(commentText);
    await commentInput.press('Enter');

    // 根据审核策略，可能是“已发布”或“等待审核”，这里只要求提交成功
    await expect(
      page.getByText(/评论已发布|评论已提交，等待审核/)
    ).toBeVisible();

    // 3. 刷新页面后，评论列表中仍应包含该条评论文案
    await page.reload();

    await expect(page.getByText(titleText)).toBeVisible();
    await expect(page.getByText(commentText)).toBeVisible();
  });
}
);
