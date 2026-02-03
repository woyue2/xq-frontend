import { test, expect, type Page } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

async function navigateToProfile(page: Page) {
  const profileBtn = page.getByTestId('nav-profile');
  await profileBtn.click();

  await expect(page).toHaveURL(/\/profile$/);
}

test.describe('前端主流程冒烟测试', () => {
  test('学生免登录进入首页并看到题目列表框架', async ({ page }) => {
    await bootstrapAuth(page);

    await page.goto('/');

    // 1. 顶部筛选区域应该出现“全部”按钮（学科过滤）
    await expect(page.getByRole('button', { name: '全部' })).toBeVisible();

    // 2. QuestionList 至少渲染出空状态或题目卡片
    const emptyState = page.getByText('暂无相关提问');
    const anyCard = page.locator('[data-testid="question-card"]').first();

    await expect(
      emptyState.or(anyCard)
    ).toBeVisible();
  });

  test('老师免登录访问诊断工具页面并启动一次诊断', async ({ page }) => {
    await bootstrapAuth(page, 'teacher');

    await page.goto('/diagnostic');

    // 页面标题
    await expect(
      page.getByText('系统接口诊断工具')
    ).toBeVisible();

    // 点击“开始诊断”按钮
    const startButton = page.getByRole('button', { name: /开始诊断|诊断中/ });
    await startButton.click();

    // 观察诊断日志区域是否开始输出内容（关键日志片段）
    const logArea = page.getByText(/Diagnostic engine started|Diagnostic complete/);
    await expect(logArea).toBeVisible();
  });

  test('学生完整链路：提问 → 我的问题 → 点赞/收藏 → 问题详情', async ({ page }) => {
    await bootstrapAuth(page, 'student');

    // 1. 从首页进入提问页
    await page.goto('/');
    const createBtn = page.getByTestId('nav-create');
    await expect(createBtn).toBeVisible();
    await createBtn.click();
    await expect(page).toHaveURL(/\/create$/);

    // 2. 在提问页选择科目并填写标题
    const uniqueTitle = `E2E 自动化测试问题 ${Date.now()}`;
    await page.getByRole('button', { name: '数学' }).click();
    await page.getByLabel('问题标题').fill(uniqueTitle);

    // 3. 提交问题，预期跳转到问题详情页
    await page.getByRole('button', { name: '提交' }).click();
    await expect(page).toHaveURL(/\/question\/.+/);

    // 4. 通过个人中心进入「我的提问」列表
    await navigateToProfile(page);
    const myQuestionsMenu = page.getByTestId('menu-item-我的提问');
    await expect(myQuestionsMenu).toBeVisible();
    await myQuestionsMenu.click();
    await expect(page).toHaveURL(/\/my-questions$/);

    // 5. 在「我的提问」列表中找到刚刚创建的问题并进入详情
    const myQuestionItem = page.getByText(uniqueTitle);
    await expect(myQuestionItem).toBeVisible();
    await myQuestionItem.click();
    await expect(page).toHaveURL(/\/question\/.+/);

    // 6. 在问题详情页执行点赞与收藏，并验证 UI 状态变化
    const likeBtn = page.getByTestId('like-btn');
    const favoriteBtn = page.getByTestId('favorite-btn');

    await expect(likeBtn).toBeVisible();
    await expect(favoriteBtn).toBeVisible();

    await likeBtn.click();
    await expect(likeBtn).toHaveClass(/text-pink-500/);
    await expect(page.getByText('点赞成功')).toBeVisible();

    await favoriteBtn.click();
    await expect(favoriteBtn).toHaveClass(/text-amber-400/);
    await expect(page.getByText('收藏成功')).toBeVisible();
  });
});
