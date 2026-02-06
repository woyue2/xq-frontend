import { test, expect } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

// STU-010: 学生在问题详情页点赞/取消点赞（真实后端 + 数据库）
test.describe('STU-010 学生点赞/取消点赞真实链路', () => {
  test('学生: 在已审核通过的问题详情页点赞后再次点击变为取消点赞', async ({
    page,
    request
  }) => {
    const backendBase =
      process.env.BACKEND_BASE_URL || 'http://localhost:4000';

    // 1. 通过后端接口使用教师身份创建一条已审核通过的问题（跳过 AI 审核的不确定性）
    const teacherRes = await request.post(
      `${backendBase}/api/internal/test-token`,
      {
        data: { role: 'teacher' }
      }
    );
    expect(teacherRes.ok()).toBeTruthy();
    const teacherBody: any = await teacherRes.json();
    const teacherToken = teacherBody.data.token as string;

    const titleText = `STU-010 点赞切换测试问题 ${Date.now()}`;
    const createQuestionRes = await request.post(
      `${backendBase}/api/questions`,
      {
        headers: {
          Authorization: `Bearer ${teacherToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          title: titleText,
          content:
            '用于验证问题详情页点赞/取消点赞真实链路（走后端 + 数据库）。',
          tags: ['STU-010', '三角色联动'],
          difficulty: 'easy'
        }
      }
    );
    expect(createQuestionRes.ok()).toBeTruthy();
    const created: any = await createQuestionRes.json();
    const questionId = created.data.id as string;

    // 2. 学生身份登录并直接进入该问题详情页
    await bootstrapAuth(page, 'student');
    await page.goto(`/question/${questionId}`);

    await expect(
      page.getByRole('heading', { name: '问题详情' })
    ).toBeVisible();
    await expect(page.getByText(titleText)).toBeVisible();

    const likeBtn = page.getByTestId('like-btn');
    await expect(likeBtn).toBeVisible();

    // 3. 首次点击：应出现“点赞成功”提示（或包含“点赞成功”的文案）
    await likeBtn.click();
    await expect(
      page.getByText(/点赞成功/)
    ).toBeVisible();

    // 4. 第二次点击：应出现“已取消点赞”提示
    await likeBtn.click();
    await expect(
      page.getByText(/已取消点赞/)
    ).toBeVisible();
  });
});
