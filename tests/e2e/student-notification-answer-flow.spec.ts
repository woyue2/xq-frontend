import { test, expect } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

test.describe('学生收到老师回答通知并查看详情 E2E', () => {
  test('学生: 问题审核通过后收到通知并进入问题详情', async ({ page, request }) => {
    // 1. 先用学生创建一个问题（通过后端接口，保证后续审核与通知链路）
    const studentToken = await (async () => {
      const res = await request.post(
        `${process.env.BACKEND_BASE_URL || 'http://localhost:4000'}/api/internal/test-token`,
        {
          data: { role: 'student' }
        }
      );
      const body = await res.json();
      return body.data.token as string;
    })();

    const backendBase =
      process.env.BACKEND_BASE_URL || 'http://localhost:4000';

    const createRes = await request.post(`${backendBase}/api/questions`, {
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: `E2E 通知链路测试问题 ${Date.now()}`,
        content: '这是用于验证“提问→审核→通知→查看详情”链路的测试问题。',
        tags: ['通知链路'],
        difficulty: 'easy'
      }
    });

    expect(createRes.ok()).toBeTruthy();
    const createdBody = await createRes.json();
    const questionId = createdBody.data.id as string;

    // 2. 用教师身份通过审核该问题，触发通知生成
    const teacherToken = await (async () => {
      const res = await request.post(
        `${backendBase}/api/internal/test-token`,
        {
          data: { role: 'teacher' }
        }
      );
      const body = await res.json();
      return body.data.token as string;
    })();

    const approveRes = await request.post(
      `${backendBase}/api/admin/audit/${questionId}/approve`,
      {
        headers: {
          Authorization: `Bearer ${teacherToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          type: 'question',
          isGoodQuestion: true,
          score: 5,
          tags: ['通知链路'],
          difficulty: 'easy'
        }
      }
    );

    expect(approveRes.ok()).toBeTruthy();

    // 3. 学生身份进入前端首页
    await bootstrapAuth(page, 'student');

    await page.goto('/');

    // 3.1 通过后端接口验证通知确实存在（后端契约层）
    const notifRes = await request.get(
      `${backendBase}/api/notifications?page=1&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${studentToken}`
        }
      }
    );

    expect(notifRes.ok()).toBeTruthy();
    const notifBody = await notifRes.json();
    const hasAuditNotification = notifBody.data.list.some(
      (n: any) =>
        n.type === 'audit_result' &&
        n.targetType === 'question' &&
        n.targetId === questionId
    );
    expect(hasAuditNotification).toBe(true);

    // 3.2 前端通知中心 UI：点击 Header 的铃铛进入通知中心
    const bellBtn = page.getByTestId('nav-notifications');
    await expect(bellBtn).toBeVisible();
    await bellBtn.click();
    await expect(page).toHaveURL(/\/notifications$/);

    // 通知列表中应该至少有一条“问题审核结果”通知
    await expect(page.getByText('通知中心')).toBeVisible();
    await expect(
      page.getByTestId('notification-item').nth(0)
    ).toBeVisible();

    // 4. 学生点击“问题审核结果”相关通知后进入对应问题详情页
    const auditNotificationItem = page
      .getByTestId('notification-item')
      .filter({ hasText: '你的问题已通过审核' })
      .first();
    await expect(auditNotificationItem).toBeVisible();
    await auditNotificationItem.click();
    await expect(
      page.getByRole('heading', { name: '问题详情' })
    ).toBeVisible();
    await expect(
      page.getByText('这是用于验证“提问→审核→通知→查看详情”链路的测试问题。')
    ).toBeVisible();
  });
});
