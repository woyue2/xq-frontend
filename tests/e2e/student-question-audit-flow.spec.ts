import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

async function gotoProfile(page: Page) {
  await page.goto('/');

  const profileBtn = page.getByTestId('nav-profile');
  await profileBtn.click();

  await expect(page).toHaveURL(/\/profile$/);
}

async function approveQuestionAsTeacher(
  request: APIRequestContext,
  questionId: string
) {
  const backendBase =
    process.env.BACKEND_BASE_URL || 'http://localhost:4000';

  // 1) 获取教师测试 token
  const tokenRes = await request.post(
    `${backendBase}/api/internal/test-token`,
    {
      data: { role: 'teacher' }
    }
  );

  expect(tokenRes.ok()).toBeTruthy();

  const tokenBody = (await tokenRes.json()) as {
    data: { token: string };
  };

  const teacherToken = tokenBody.data.token;

  // 2) 审核通过该问题
  const auditRes = await request.post(
    `${backendBase}/api/admin/audit/${questionId}/approve`,
    {
      headers: {
        Authorization: `Bearer ${teacherToken}`
      },
      data: {
        type: 'question',
        isGoodQuestion: false,
        score: 5,
        tags: [],
        difficulty: 'easy'
      }
    }
  );

  expect(auditRes.ok()).toBeTruthy();
}

test.describe('学生端完整链路: 提问 → 老师审核 → 我的问题 → 问题详情', () => {
  test('学生提问后经老师审核，可在我的问题列表中看到并打开详情', async ({
    page,
    request
  }) => {
    await bootstrapAuth(page, 'student');

    await page.goto('/');

    // 1. 通过浮动按钮进入提问页
    const createBtn = page.getByTestId('nav-create');
    await expect(createBtn).toBeVisible();
    await createBtn.click();
    await expect(page).toHaveURL(/\/create$/);

    // 2. 填写提问信息并提交
    await page.getByRole('button', { name: '数学' }).click();

    const titleText = `链路 E2E 问题 ${Date.now()}`;
    await page.getByLabel('问题标题', { exact: false }).fill(titleText);
    await page
      .getByLabel('问题详情', { exact: false })
      .fill('这是 E2E 链路：学生提问 → 老师审核 → 我的问题列表。');

    await page.getByRole('button', { name: '提交' }).click();

    // 3. 成功后应跳转到问题详情页
    await expect(page).toHaveURL(/\/question\//, { timeout: 15_000 });
    await expect(
      page.getByRole('heading', { name: '问题详情' })
    ).toBeVisible();
    await expect(page.getByText(titleText)).toBeVisible();

    // 从 URL 中解析出 questionId，供后台审核使用
    const url = page.url();
    const questionId = url.split('/').pop()!;

    // 4. 使用后台接口让老师审核通过该问题
    await approveQuestionAsTeacher(request, questionId);

    // 5. 学生进入“我的提问”页面，列表中应出现该问题标题
    await gotoProfile(page);
    await page.getByText('我的提问').click();
    await expect(page).toHaveURL(/\/my-questions$/);

    await expect(page.getByText(titleText)).toBeVisible();

    // 6. 从“我的提问”列表点击进入问题详情
    await page.getByText(titleText).click();
    await expect(page).toHaveURL(/\/question\//);
    await expect(
      page.getByRole('heading', { name: '问题详情' })
    ).toBeVisible();
    await expect(page.getByText(titleText)).toBeVisible();
  });
});
