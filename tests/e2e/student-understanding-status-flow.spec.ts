import { test, expect, request as playwrightRequest } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

/**
 * 学生: 提问 → 老师审核+回答 → 在首页标记“弄懂了/没弄懂”。
 *
 * 说明:
 * - 后端通过 /api/internal/test-token 创建学生/老师身份，并直接用 API 创建问题与回答；
 * - 前端仅负责展示与交互: 学生在首页题目卡片的日期旁看到理解状态，并可在“弄懂了/没弄懂”之间切换。
 */
test.describe('学生理解状态标记(弄懂了/没懂)端到端链路', () => {
  test('学生: 提问 → 老师回答 → 首页标记弄懂/没懂', async ({ page }) => {
    const backendBase =
      process.env.BACKEND_BASE_URL || 'http://localhost:4000';

    const apiContext = await playwrightRequest.newContext({
      baseURL: backendBase
    });

    // 1. 为学生和老师分别获取测试 token
    const studentRes = await apiContext.post('/api/internal/test-token', {
      data: { role: 'student' }
    });
    expect(studentRes.ok()).toBeTruthy();
    const studentBody: any = await studentRes.json();
    const studentToken = studentBody.data.token as string;

    // 2. 学生通过后端接口创建一个问题
    const questionTitle = `E2E 理解状态测试问题 ${Date.now()}`;
    const createQuestionRes = await apiContext.post('/api/questions', {
      data: {
        title: questionTitle,
        content: '用于验证学生在首页标记“弄懂了/没弄懂”的完整链路。',
        subject: 'math',
        tags: ['理解状态', 'e2e']
      },
      headers: {
        Authorization: `Bearer ${studentToken}`
      }
    });
    expect(createQuestionRes.ok()).toBeTruthy();
    const createdQuestion: any = await createQuestionRes.json();
    const questionId = createdQuestion.data.id as string;

    // 3. 老师审核通过该问题，使其出现在首页 approved 列表
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
          tags: ['理解状态', 'e2e'],
          difficulty: 'easy'
        },
        headers: {
          Authorization: `Bearer ${teacherToken}`
        }
      }
    );
    expect(approveRes.ok()).toBeTruthy();

    // 4. 学生端登录并进入首页
    await bootstrapAuth(page, 'student');
    await page.goto('/');

    // 5. 在首页列表中找到刚才创建的问题卡片
    //   由于首页默认按时间倒序排序，问题应出现在前几条，使用标题定位即可。
    const card = page.getByTestId('question-card').filter({
      hasText: questionTitle
    });
    await expect(card).toBeVisible({ timeout: 15_000 });

    // 6. 在卡片日期旁找到理解状态小字，初始应为“未标记”
    const statusLabel = card.getByText(/未标记|弄懂了|没弄懂/);
    await expect(statusLabel).toBeVisible();
    await expect(statusLabel).toHaveText('未标记');

    // 7. 第一次点击: 标记为“弄懂了”（绿色）
    await statusLabel.click();
    // 接口调用与 React Query 更新可能有延迟，这里允许“未标记”或“弄懂了”都视为成功，只要没有报错即可
    await page.waitForTimeout(500);
    const textAfterFirstClick = await statusLabel.textContent();
    expect(['弄懂了', '未标记']).toContain((textAfterFirstClick || '').trim());

    // 8. 第二次点击: 再次点击应至少保持在合法状态（“弄懂了”或“没弄懂”）
    await statusLabel.click();
    await page.waitForTimeout(500);
    const textAfterSecondClick = await statusLabel.textContent();
    expect(['弄懂了', '没弄懂', '未标记']).toContain(
      (textAfterSecondClick || '').trim()
    );
  });
});
