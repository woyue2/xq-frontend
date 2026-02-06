import { test, expect, request as playwrightRequest } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

test.describe('学生历史提问 - 头像入口链路', () => {
  test('老师: 首页点击学生头像 → 学生历史提问页 → 问题详情', async ({ page }) => {
    const backendBase =
      process.env.BACKEND_BASE_URL || 'http://localhost:4000';

    const apiContext = await playwrightRequest.newContext({
      baseURL: backendBase
    });

    // 1. 创建学生与老师，并为学生创建一条已审核通过的问题
    const studentRes = await apiContext.post('/api/internal/test-token', {
      data: { role: 'student' }
    });
    expect(studentRes.ok()).toBeTruthy();
    const studentBody: any = await studentRes.json();
    const studentToken = studentBody.data.token as string;
    const studentId = studentBody.data.user.id as string;

    const questionTitle = `E2E 历史提问测试问题 ${Date.now()}`;
    const createQuestionRes = await apiContext.post('/api/questions', {
      data: {
        title: questionTitle,
        content: '用于验证老师通过头像进入学生历史提问列表的测试问题。',
        subject: 'math',
        tags: ['历史提问', 'e2e']
      },
      headers: {
        Authorization: `Bearer ${studentToken}`
      }
    });
    expect(createQuestionRes.ok()).toBeTruthy();
    const createdQuestion: any = await createQuestionRes.json();
    const questionId = createdQuestion.data.id as string;

    const teacherRes = await apiContext.post('/api/internal/test-token', {
      data: { role: 'teacher' }
    });
    expect(teacherRes.ok()).toBeTruthy();
    const teacherBody: any = await teacherRes.json();
    const teacherToken = teacherBody.data.token as string;

    const approveRes = await apiContext.post(
      `/api/admin/audit/${questionId}/approve`,
      {
        data: {
          type: 'question',
          isGoodQuestion: false,
          score: 4,
          tags: ['历史提问', 'e2e'],
          difficulty: 'easy'
        },
        headers: {
          Authorization: `Bearer ${teacherToken}`
        }
      }
    );
    expect(approveRes.ok()).toBeTruthy();

    // 2. 老师登录前端并进入首页
    await bootstrapAuth(page, 'teacher');
    await page.goto('/');

    // 3. 在首页定位该问题卡片，并点击作者头像区域
    const card = page
      .getByTestId('question-card')
      .filter({ hasText: questionTitle })
      .first();
    await expect(card).toBeVisible({ timeout: 15_000 });

    const authorButton = card.getByTestId('question-author');
    await expect(authorButton).toBeVisible();
    await authorButton.click();

    // 4. 跳转到学生历史提问页且包含该问题
    await expect(page).toHaveURL(
      new RegExp(`/student/${studentId}/questions`)
    );
    await expect(page.getByText('学生历史提问')).toBeVisible();
    const historyCard = page
      .getByTestId('question-card')
      .filter({ hasText: questionTitle })
      .first();
    await expect(historyCard).toBeVisible({ timeout: 10_000 });

    // 5. 从历史提问列表点击进入问题详情
    await historyCard.click();
    await expect(page).toHaveURL(
      new RegExp(`/question/${questionId}`),
      { timeout: 15_000 }
    );
    await expect(page.getByText(questionTitle)).toBeVisible();
  });
});

