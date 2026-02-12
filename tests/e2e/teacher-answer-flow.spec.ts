import { test, expect } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

test.describe('教师回答与我的回答列表 E2E', () => {
  test('老师: 从问题详情进入回答页并提交回答', async ({ page }) => {
    // 使用教师身份创建一个测试问题，随后由同一教师回答
    await bootstrapAuth(page, 'teacher');

    await page.goto('/');

    // 浮动按钮进入提问页
    const createBtn = page.getByTestId('nav-create');
    await expect(createBtn).toBeVisible();
    await createBtn.click();
    await expect(page).toHaveURL(/\/create$/);

    const questionTitle = `E2E 教师回答用问题 ${Date.now()}`;

    await page.getByRole('button', { name: '数学' }).click();
    await page.getByLabel('问题标题', { exact: false }).fill(questionTitle);
    await page
      .getByLabel('问题详情', { exact: false })
      .fill('这是为教师回答链路准备的测试问题。');

    await page.getByRole('button', { name: '提交' }).click();

    // 学生提交后应跳转到问题详情页
    await expect(page).toHaveURL(/\/question\//, { timeout: 15_000 });
    await expect(page.getByText(questionTitle)).toBeVisible();

    const questionUrl = page.url();

    // 再次进入该问题详情（确保处于“教师视角”）
    await page.goto(questionUrl);
    await expect(
      page.getByRole('heading', { name: '问题详情' })
    ).toBeVisible();

    // 教师看到“去回答”按钮，点击进入回答页
    const answerButton = page.getByRole('button', { name: '去回答' });
    await expect(answerButton).toBeVisible();
    await answerButton.click();
    await expect(page).toHaveURL(/\/answer\//, { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: '回答问题' })
    ).toBeVisible();

    // 在回答页填写文字回答并提交
    const answerContent =
      '这是来自 Playwright 的教师测试回答内容，用于验证回答链路。';
    await page.getByLabel('文字回答').fill(answerContent);

    await page.getByRole('button', { name: '提交' }).click();

    // 成功后通常会有 toast 提示，并返回问题详情
    await expect(page).toHaveURL(/\/question\//, { timeout: 10_000 });
    await expect(
      page.getByText(/回答已提交/)
    ).toBeVisible();
  });

  test('老师: 个人中心进入“我的回答”列表并跳转回问题详情', async ({ page }) => {
    await bootstrapAuth(page, 'teacher');

    await page.goto('/');

    // 进入个人中心
    const profileBtn = page.getByTestId('nav-profile');
    await profileBtn.click();

    await expect(page).toHaveURL(/\/profile$/);

    // 点击“我的回答”入口
    await page.getByRole('button', { name: '我的回答' }).click();
    await expect(page).toHaveURL(/\/my-answers$/);
    await expect(page.getByText('我的回答')).toBeVisible();

    // 无论是否已有回答，都至少保证页面渲染正常；
    // 若存在回答卡片，点击第一条应跳转到对应问题详情页
    const anyAnswerCard = page.getByText('回答问题：').first();

    if (await anyAnswerCard.isVisible().catch(() => false)) {
      await anyAnswerCard.click();
      await expect(page).toHaveURL(/\/question\//);
    }
  });
});
