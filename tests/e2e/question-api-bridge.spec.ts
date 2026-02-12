import { test, expect, type APIRequestContext } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

async function fetchQuestionDetail(
  request: APIRequestContext,
  questionId: string,
  token: string
) {
  const backendBase =
    process.env.BACKEND_BASE_URL || 'http://localhost:4000';

  const res = await request.get(`${backendBase}/api/questions/${questionId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  expect(res.ok(), '后端 /api/questions/:id 请求应成功').toBeTruthy();

  const body = (await res.json()) as {
    code: number;
    data: {
      id: string;
      title: string;
      status: string;
    };
  };

  expect(body.code).toBe(200);
  expect(body.data.id).toBe(questionId);

  return body.data;
}

/**
 * 场景：对齐后端 Question API 中 Q-API-001 的行为，
 * 使用“学生测试账号”通过前端创建问题，然后通过后端 Question 详情接口
 * 校验该问题在数据库中的状态为 pending。
 *
 * 参考后端用例：
 * backend/src/tests/integration/question.api.spec.ts 中
 * `should create question successfully (Q-API-001)`。
 */
test.describe('Question API 与前端链路对齐 E2E', () => {
  test('学生通过前端创建问题后，后端 Question 详情状态为 pending（对应 Q-API-001）', async ({
    page,
    request
  }) => {
    // 1. 使用内部 test-token 接口生成学生测试账号并写入 auth-storage
    await bootstrapAuth(page, 'student');

    // 2. 通过前端提问页面创建问题
    await page.goto('/');

    const createBtn = page.getByTestId('nav-create');
    await expect(createBtn).toBeVisible();
    await createBtn.click();
    await expect(page).toHaveURL(/\/create$/);

    // 选择科目
    await page.getByRole('button', { name: '数学' }).click();

    // 构造唯一标题，便于排查
    const titleText = `Question API E2E ${Date.now()}`;
    await page
      .getByLabel('问题标题', { exact: false })
      .fill(titleText);
    await page
      .getByLabel('问题详情', { exact: false })
      .fill('用于对齐 Question API Q-API-001 的 E2E 验证。');

    await page.getByRole('button', { name: '提交' }).click();

    // 3. 前端应跳转到问题详情页并展示该标题
    await expect(page).toHaveURL(/\/question\//, { timeout: 15_000 });
    await expect(
      page.getByRole('heading', { name: '问题详情' })
    ).toBeVisible();
    await expect(page.getByText(titleText)).toBeVisible();

    const url = page.url();
    const questionId = url.split('/').pop()!;

    // 从前端 auth-storage 中读取 token，用于后端接口鉴权
    const token = await page.evaluate(() => {
      const raw = window.localStorage.getItem('auth-storage');
      if (!raw) return null;
      try {
        const persisted = JSON.parse(raw);
        return persisted?.state?.token ?? null;
      } catch {
        return null;
      }
    });

    expect(token, 'auth-storage.state.token 应该存在').not.toBeNull();

    // 4. 通过后端 Question 详情接口确认状态为 pending
    const detail = await fetchQuestionDetail(
      request,
      questionId,
      token as string
    );

    expect(detail.title).toBe(titleText);
    expect(detail.status).toBe(
      'pending'
    ); // 与 QuestionService.create 中学生提问的初始状态保持一致
  });
});
