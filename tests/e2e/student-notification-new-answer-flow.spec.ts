import { test, expect, request as playwrightRequest } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

/**
 * 学生从“有新回答”通知进入问题详情，并定位到对应回答（包含语音回答场景）。
 *
 * 说明：
 * - 利用后端 /api/internal/test-token + 直接 HTTP 调用创建问题与回答；
 * - 重点验证：new_answer 通知存在，点击后 URL 携带 answerId，且页面滚动到对应回答卡片。
 */
test.describe('学生新回答通知联动', () => {
  test('学生：从通知中心点击“有新回答”进入问题详情并聚焦到对应回答', async ({ page }) => {
    const backendBase =
      process.env.BACKEND_BASE_URL || 'http://localhost:4000';

    const apiContext = await playwrightRequest.newContext({
      baseURL: backendBase
    });

    // 1. 为学生和老师分别获取测试 token 与用户
    const studentRes = await apiContext.post('/api/internal/test-token', {
      data: { role: 'student' }
    });
    expect(studentRes.ok()).toBeTruthy();
    const studentBody: any = await studentRes.json();
    const studentToken = studentBody.data.token as string;

    const teacherRes = await apiContext.post('/api/internal/test-token', {
      data: { role: 'teacher' }
    });
    expect(teacherRes.ok()).toBeTruthy();
    const teacherBody: any = await teacherRes.json();
    const teacherToken = teacherBody.data.token as string;

    // 2. 清理当前学生下已有未读通知，避免历史审核通知干扰本次断言
    const clearRes = await apiContext.post('/api/notifications/read', {
      data: { ids: [] },
      headers: {
        Authorization: `Bearer ${studentToken}`
      }
    });
    expect(clearRes.ok()).toBeTruthy();

    // 3. 学生通过后端接口创建一个问题
    const questionTitle = `E2E 通知联动问题 ${Date.now()}`;
    const createQuestionRes = await apiContext.post('/api/questions', {
      data: {
        title: questionTitle,
        content: '这是用于 new_answer 通知联动测试的问题。',
        subject: 'math',
        tags: ['通知', '语音']
      },
      headers: {
        Authorization: `Bearer ${studentToken}`
      }
    });
    expect(createQuestionRes.ok()).toBeTruthy();
    const createdQuestion: any = await createQuestionRes.json();
    const questionId = createdQuestion.data.id as string;

    // 4. 老师通过后端接口创建一个带语音 URL 的回答，触发 new_answer 通知
    const createAnswerRes = await apiContext.post(
      `/api/questions/${questionId}/answers`,
      {
        data: {
          content: '这是老师的测试回答，包含语音 URL。',
          audioUrl: 'https://cdn.example.com/audio/e2e-notification-answer.mp3'
        },
        headers: {
          Authorization: `Bearer ${teacherToken}`
        }
      }
    );
    expect(createAnswerRes.ok()).toBeTruthy();
    const createdAnswerBody: any = await createAnswerRes.json();
    const answerId = createdAnswerBody.data.id as string;

    // 5. 学生端打开前端，进入通知中心
    await bootstrapAuth(page, 'student');
    await page.goto('/');

    const bellButton = page.getByTestId('nav-notifications');
    await bellButton.click();

    // 等待通知列表加载，并找到包含“你的问题有新的回答”的通知项
    const notificationItem = page
      .getByTestId('notification-item')
      .filter({ hasText: '你的问题有新的回答' })
      .first();
    await expect(notificationItem).toBeVisible({ timeout: 10_000 });

    // 6. 点击通知，预期跳转到带 answerId 查询参数的问题详情页
    await notificationItem.click();
    await expect(page).toHaveURL(
      new RegExp(`/question/${questionId}.*answerId=`),
      { timeout: 10_000 }
    );

    // 7. 回答列表加载后，定位到对应回答卡片（data-answer-id）
    const answerCard = page.locator(
      `[data-answer-id="${answerId}"]`
    );
    await expect(answerCard).toBeVisible({ timeout: 10_000 });
  });
});
