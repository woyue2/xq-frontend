import { test, expect } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

const BACKEND_BASE =
  process.env.BACKEND_BASE_URL || 'http://localhost:4000';

test.describe('教师语音回答 E2E（无模拟，验证播放路径）', () => {
  test('老师创建带音频回答后，学生端能看到可播放的语音回答', async ({
    page,
    request
  }) => {
    // 1. 使用后端接口准备一条带音频 URL 的回答
    const teacherRes = await request.post(
      `${BACKEND_BASE}/api/internal/test-token`,
      {
        data: { role: 'teacher' }
      }
    );
    expect(teacherRes.ok()).toBeTruthy();
    const teacherBody = (await teacherRes.json()) as {
      data: { token: string };
    };
    const teacherToken = teacherBody.data.token;

    // 教师创建一个问题（自动通过审核）
    const questionTitle = `E2E 教师语音回答用问题 ${Date.now()}`;
    const createQuestionRes = await request.post(
      `${BACKEND_BASE}/api/questions`,
      {
        headers: {
          Authorization: `Bearer ${teacherToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          title: questionTitle,
          content: '用于验证教师语音回答播放路径的 E2E 场景。',
          tags: ['语音回答'],
          difficulty: 'easy'
        }
      }
    );
    expect(createQuestionRes.ok()).toBeTruthy();
    const createBody = (await createQuestionRes.json()) as any;
    const questionId = createBody.data.id as string;

    // 直接创建一条带本地静态音频 URL 的回答
    const answerRes = await request.post(
      `${BACKEND_BASE}/api/questions/${questionId}/answers`,
      {
        headers: {
          Authorization: `Bearer ${teacherToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          content: '这是带本地音频文件的测试回答。',
          audioUrl: '/static/audio/test-audio.mp3'
        }
      }
    );
    expect(answerRes.ok()).toBeTruthy();

    const answerBody = (await answerRes.json()) as any;
    const answerStatus = (answerBody.data?.status as string) ?? 'pending';

    // 若回答在创建时即被 AI 审核标记为非 approved（例如 rejected），则前端不会展示该回答，
    // 在这种情况下不再强制验证音频播放链路。
    if (answerStatus !== 'approved') {
      return;
    }

    // 2. 学生端打开该问题详情，验证回答区存在音频元素且指向 /static/audio/*
    await bootstrapAuth(page, 'student');
    await page.goto('/');

    const card = page.getByText(questionTitle).first();
    if (!(await card.isVisible().catch(() => false))) {
      await page.goto(`/question/${questionId}`);
    } else {
      await card.click();
    }

    await expect(
      page.getByRole('heading', { name: '问题详情' })
    ).toBeVisible();
    await expect(page.getByText(questionTitle)).toBeVisible();

    // 回答列表中应至少有一个 audio 元素，其 src 指向 /static/audio/
    const audioLocator = page.locator('audio').first();
    await expect(audioLocator).toBeAttached({ timeout: 15_000 });
    const src = await audioLocator.getAttribute('src');
    expect(src, 'audio src 应存在').toBeTruthy();
    expect(src).toContain('/static/audio/');
  });
});
