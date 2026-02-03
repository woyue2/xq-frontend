import { test, expect } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

const BACKEND_BASE =
  process.env.BACKEND_BASE_URL || 'http://localhost:4000';

test.describe('TEA: 教师前端回答 + 学生新回答通知联动 E2E', () => {
  test('老师通过前端回答后，学生可从“有新回答”通知进入问题详情', async ({
    page,
    request
  }) => {
    // 1. 学生通过后端接口创建一个问题（真实数据库）
    const studentTokenRes = await request.post(
      `${BACKEND_BASE}/api/internal/test-token`,
      {
        data: { role: 'student' }
      }
    );
    expect(studentTokenRes.ok()).toBeTruthy();
    const studentBody = (await studentTokenRes.json()) as {
      data: { token: string };
    };
    const studentToken = studentBody.data.token;

    const questionTitle = `TEA UI E2E 问题 ${Date.now()}`;
    const createQuestionRes = await request.post(
      `${BACKEND_BASE}/api/questions`,
      {
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          title: questionTitle,
          content: '用于 TEA UI 流程测试的问题。',
          tags: ['TEA', 'UI-E2E'],
          difficulty: 'easy'
        }
      }
    );
    expect(createQuestionRes.ok()).toBeTruthy();
    const createdBody = (await createQuestionRes.json()) as any;
    const questionId = createdBody.data.id as string;

    // 2. 教师端：通过前端 UI 进入问题详情并提交回答
    await bootstrapAuth(page, 'teacher');
    await page.goto(`/question/${questionId}`);

    await expect(
      page.getByRole('heading', { name: '问题详情' })
    ).toBeVisible();
    await expect(page.getByText(questionTitle)).toBeVisible();

    const answerButton = page.getByRole('button', { name: '去回答' });
    await expect(answerButton).toBeVisible();
    await answerButton.click();

    await expect(page).toHaveURL(/\/answer\//, { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: '回答问题' })
    ).toBeVisible();

    const answerContent = `TEA UI E2E 回答 ${Date.now()}`;
    await page.getByLabel('文字回答').fill(answerContent);
    await page.getByRole('button', { name: '提交' }).click();

    await expect(page).toHaveURL(
      new RegExp(`/question/${questionId}`),
      { timeout: 15_000 }
    );

    // 3. 学生端：从“有新回答”通知进入问题详情
    await bootstrapAuth(page, 'student');
    await page.goto('/');

    const bellBtn = page.getByTestId('nav-notifications');
    await expect(bellBtn).toBeVisible();
    await bellBtn.click();
    await expect(page).toHaveURL(/\/notifications$/);

    const newAnswerItem = page
      .getByTestId('notification-item')
      .filter({ hasText: '你的问题有新的回答' })
      .first();
    await expect(
      newAnswerItem,
      '通知列表中应出现“你的问题有新的回答”'
    ).toBeVisible({ timeout: 10_000 });

    await newAnswerItem.click();

    await expect(
      page.getByRole('heading', { name: '问题详情' })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(questionTitle)).toBeVisible();
    await expect(
      page.getByText(answerContent)
    ).toBeVisible({ timeout: 10_000 });
  });
});
