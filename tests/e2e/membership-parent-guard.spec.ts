import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

async function setStudentExpired(page: Page) {
  await page.addInitScript(() => {
    try {
      const raw = window.localStorage.getItem('auth-storage');
      if (!raw) return;
      const persisted = JSON.parse(raw);
      if (persisted?.state?.user) {
        persisted.state.user.expiresAt = '2000-01-01T00:00:00.000Z';
        window.localStorage.setItem('auth-storage', JSON.stringify(persisted));
      }
    } catch {
      // ignore
    }
  });
}

async function createApprovedQuestion(
  request: APIRequestContext,
  title: string
): Promise<string> {
  const backendBase =
    process.env.BACKEND_BASE_URL || 'http://localhost:3000';

  // 学生 token
  const studentRes = await request.post(
    `${backendBase}/api/internal/test-token`,
    {
      data: { role: 'student' }
    }
  );
  expect(studentRes.ok()).toBeTruthy();
  const studentBody = (await studentRes.json()) as {
    data: { token: string; user: { id: string } };
  };
  const studentToken = studentBody.data.token;

  // 创建问题（pending）
  const createRes = await request.post(`${backendBase}/api/questions`, {
    headers: {
      Authorization: `Bearer ${studentToken}`
    },
    data: {
      title,
      content: '家长权限测试用问题',
      tags: ['家长测试'],
      difficulty: 'easy'
    }
  });
  expect(createRes.ok()).toBeTruthy();
  const createBody = (await createRes.json()) as any;
  const questionId = createBody.data.id as string;

  // 教师 token
  const teacherRes = await request.post(
    `${backendBase}/api/internal/test-token`,
    {
      data: { role: 'teacher' }
    }
  );
  expect(teacherRes.ok()).toBeTruthy();
  const teacherBody = (await teacherRes.json()) as {
    data: { token: string };
  };
  const teacherToken = teacherBody.data.token;

  // 审核通过
  const auditRes = await request.post(
    `${backendBase}/api/admin/audit/${questionId}/approve`,
    {
      headers: {
        Authorization: `Bearer ${teacherToken}`
      },
      data: {
        type: 'question',
        isGoodQuestion: false,
        score: 4,
        tags: [],
        difficulty: 'easy'
      }
    }
  );
  expect(auditRes.ok()).toBeTruthy();

  return questionId;
}

test.describe('课时与家长权限防护 E2E', () => {
  test('课时过期学生访问提问页会被拦截并提示', async ({ page }) => {
    await bootstrapAuth(page, 'student');
    await setStudentExpired(page);

    await page.goto('/create');

    // 被 CreateQuestionPage 的 useEffect 拦截并导航回首页
    await expect(page).toHaveURL(/\/$/);
    // 确认没有进入编辑页
    await expect(
      page.getByRole('heading', { name: '编辑我的问题' })
    ).toHaveCount(0);
  });

  test('家长无法通过提问入口进入编辑页（被视为无有效会员）', async ({ page }) => {
    await bootstrapAuth(page, 'parent');

    await page.goto('/');

    // 首页对家长不展示“提问”浮动按钮
    const createBtn = page.getByTestId('nav-create');
    await expect(createBtn).toHaveCount(0);

    // 即使家长直接访问 /create，也会被 CreateQuestionPage 判定为无有效会员并拦截回首页
    await page.goto('/create');
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { name: '编辑我的问题' })
    ).toHaveCount(0);
  });

  test('家长在问题详情页无法看到评论输入框', async ({ page, request }) => {
    const title = `家长权限测试问题 ${Date.now()}`;
    const questionId = await createApprovedQuestion(request, title);

    // 以家长身份登录
    await bootstrapAuth(page, 'parent');

    await page.goto('/');

    // 等待列表中出现刚创建的问题
    const card = page.getByText(title).first();
    if (!(await card.isVisible().catch(() => false))) {
      // 如果首页未出现该题目，可能是因 AI 审核策略导致下架，此时直接访问详情页，仅验证权限边界
      await page.goto(`/question/${questionId}`);
    } else {
      await card.click();
    }

    await expect(page).toHaveURL(/\/question\//);
    await expect(
      page.getByRole('heading', { name: '问题详情' })
    ).toBeVisible();

    // 家长不应看到“说点什么...”的评论输入框
    const commentInput = page.getByPlaceholder('说点什么...');
    await expect(await commentInput.count()).toBe(0);
  });
});
