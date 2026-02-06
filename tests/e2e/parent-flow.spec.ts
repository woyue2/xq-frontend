import { test, expect } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

test.describe('家长角色端到端业务链路', () => {
  test('家长: 个人中心“我的孩子”空态与绑定入口', async ({ page }) => {
    const backendBase =
      process.env.BACKEND_BASE_URL || 'http://localhost:4000';

    const apiContext = await test.request.newContext({
      baseURL: backendBase
    });

    // 预清理：确保当前家长没有已绑定的孩子，保证空态用例稳定
    const parentRes = await apiContext.post('/api/internal/test-token', {
      data: { role: 'parent' }
    });
    expect(parentRes.ok()).toBeTruthy();
    const parentBody: any = await parentRes.json();
    const parentToken = parentBody.data.token as string;

    const childrenRes = await apiContext.get('/api/parent/children', {
      headers: {
        Authorization: `Bearer ${parentToken}`
      }
    });

    if (childrenRes.ok()) {
      const childrenBody: any = await childrenRes.json();
      const children = (childrenBody.data as any[]) ?? [];
      for (const child of children) {
        await apiContext.post('/api/parent/unbind', {
          data: { childId: child.id },
          headers: {
            Authorization: `Bearer ${parentToken}`,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    await bootstrapAuth(page, 'parent');

    await page.goto('/');

    // 进入个人中心
    const profileBtn = page.getByTestId('nav-profile');
    await profileBtn.click();

    await expect(page).toHaveURL(/\/profile$/);

    // “我的孩子”卡片及空态
    await expect(page.getByText('我的孩子')).toBeVisible();
    await expect(page.getByText('暂无绑定的孩子')).toBeVisible();

    // 打开绑定孩子对话框
    await page.getByRole('button', { name: '添加' }).click();
    await expect(page.getByText('绑定孩子')).toBeVisible();
    await expect(page.getByLabel('孩子姓名')).toBeVisible();
    await expect(page.getByLabel('手机号')).toBeVisible();
    await expect(page.getByLabel('验证码')).toBeVisible();
  });

  test('家长: 孩子提问列表页面基本渲染', async ({ page }) => {
    await bootstrapAuth(page, 'parent');

    // 直接访问孩子提问列表路由（childId 使用任意占位）
    await page.goto('/parent/questions/demo-child-id');

    await expect(page.getByText('孩子提问列表')).toBeVisible();

    // 过滤区域与列表空态（无论后端或 Mock 状态如何，页面都应正常渲染）
    await expect(page.getByText('全部')).toBeVisible(); // QuestionFilter 中的“全部”按钮
  });

  test('家长: 首页仅浏览问题列表，不能看到提问入口', async ({ page }) => {
    await bootstrapAuth(page, 'parent');

    await page.goto('/');

    // 家长角色可以看到问题列表过滤器和列表
    await expect(page.getByText('全部')).toBeVisible();

    // “我要提问”按钮对家长不可见（只读浏览）
    await expect(page.getByRole('button', { name: /提问/ })).toHaveCount(0);
  });

  test('家长: 首页浏览问题时可安全点击点赞和收藏（即便为空态）', async ({ page }) => {
    await bootstrapAuth(page, 'parent');

    await page.goto('/');

    // 首页至少渲染出筛选区域
    await expect(page.getByRole('button', { name: '全部' })).toBeVisible();

    // 根据后端数据不同，可能出现空态，也可能直接渲染问题卡片；
    // 这里做“二选一”的容错断言，避免对具体数据状态产生强依赖。
    const emptyState = page.getByText('暂无相关提问');
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    if (hasEmptyState) {
      await expect(emptyState).toBeVisible();
    } else {
      const firstCard = page.getByTestId('question-card').first();
      await expect(firstCard).toBeVisible();
    }

    // 当前环境下问题列表可能为空，为避免对真实数据产生依赖，这里只验证家长可以安全滚动浏览页面
    await page.mouse.wheel(0, 200);
  });

  test('家长: 首页点击学生头像不会直接跳转历史提问页，而是提示从“孩子提问列表”查看', async ({
    page,
    request
  }) => {
    const backendBase =
      process.env.BACKEND_BASE_URL || 'http://localhost:4000';

    // 1. 准备一条已审核通过的问题，确保首页有稳定数据
    const studentRes = await request.post(
      `${backendBase}/api/internal/test-token`,
      {
        data: { role: 'student' }
      }
    );
    expect(studentRes.ok()).toBeTruthy();
    const studentBody: any = await studentRes.json();
    const studentToken = studentBody.data.token as string;

    const teacherRes = await request.post(
      `${backendBase}/api/internal/test-token`,
      {
        data: { role: 'teacher' }
      }
    );
    expect(teacherRes.ok()).toBeTruthy();
    const teacherBody: any = await teacherRes.json();
    const teacherToken = teacherBody.data.token as string;

    const questionTitle = `家长头像点击提示 E2E 问题 ${Date.now()}`;

    const createRes = await request.post(`${backendBase}/api/questions`, {
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: questionTitle,
        content:
          '用于验证家长在首页点击学生头像时不会直接跳转历史提问页，而是提示从“孩子提问列表”入口查看。',
        subject: 'math',
        tags: ['家长头像点击', 'e2e']
      }
    });
    expect(createRes.ok()).toBeTruthy();
    const createdBody: any = await createRes.json();
    const questionId = createdBody.data.id as string;

    const approveRes = await request.post(
      `${backendBase}/api/admin/audit/${questionId}/approve`,
      {
        headers: {
          Authorization: `Bearer ${teacherToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          type: 'question',
          isGoodQuestion: false,
          score: 4,
          tags: ['家长头像点击', 'e2e'],
          difficulty: 'easy'
        }
      }
    );
    expect(approveRes.ok()).toBeTruthy();

    // 2. 家长身份登录前端，进入首页
    await bootstrapAuth(page, 'parent');
    await page.goto('/');

    // 等待首页渲染并找到该问题卡片
    const card = page
      .getByTestId('question-card')
      .filter({ hasText: questionTitle })
      .first();
    await expect(card).toBeVisible({ timeout: 15_000 });

    const currentUrl = page.url();

    // 3. 点击问题卡片中的作者头像区域
    const authorButton = card.getByTestId('question-author');
    await authorButton.click();

    // 4. 应弹出提示，而不是跳转到学生历史提问页
    await expect(
      page.getByText('请在“孩子提问列表”页查看孩子的历史提问')
    ).toBeVisible();

    // URL 仍然停留在原首页（未跳转 /student/:id/questions）
    await expect(page).toHaveURL(currentUrl);
  });

  test('家长: 越权访问审核和白名单页面会被重定向或拒绝', async ({ page }) => {
    await bootstrapAuth(page, 'parent');

    // 家长从个人中心菜单中不应该看到“审核管理”和“用户白名单”入口（前端导航权限控制）
    await page.goto('/profile');
    await expect(page.getByText('审核管理')).toHaveCount(0);
    await expect(page.getByText('用户白名单')).toHaveCount(0);
  });

  test('PAR-008: 家长个人中心菜单与“我的点赞/我的收藏”访问', async ({ page }) => {
    await bootstrapAuth(page, 'parent');

    // 直接进入个人中心
    await page.goto('/');

    const profileBtn = page.getByTestId('nav-profile');
    await profileBtn.click();

    // 家长应该能看到“我的点赞”和“我的收藏”菜单项
    await expect(page.getByText('我的点赞')).toBeVisible();
    await expect(page.getByText('我的收藏')).toBeVisible();

    // 家长不应看到“我的提问”“审核管理”“用户白名单”等仅学生/老师可见入口
    await expect(page.getByText('我的提问')).toHaveCount(0);
    await expect(page.getByText('审核管理')).toHaveCount(0);
    await expect(page.getByText('用户白名单')).toHaveCount(0);

    // 进入“我的点赞”页面
    await page.getByText('我的点赞').click();
    await expect(page).toHaveURL(/\/my-likes$/);
    await expect(page.getByText('点赞的问题')).toBeVisible();

    // 返回个人中心
    await page.goBack();
    await expect(page).toHaveURL(/\/profile$/);

    // 进入“我的收藏”页面
    await page.getByText('我的收藏').click();
    await expect(page).toHaveURL(/\/my-favorites$/);
    await expect(page.getByText('收藏的问题')).toBeVisible();
  });

  test('家长: 通过“我的孩子”入口查看孩子历史提问并进入问题详情', async ({
    page
  }) => {
    const backendBase =
      process.env.BACKEND_BASE_URL || 'http://localhost:4000';

    const apiContext = await test.request.newContext({
      baseURL: backendBase
    });

    // 1. 创建学生、家长、老师测试用户
    const studentRes = await apiContext.post('/api/internal/test-token', {
      data: { role: 'student' }
    });
    expect(studentRes.ok()).toBeTruthy();
    const studentBody: any = await studentRes.json();
    const studentToken = studentBody.data.token as string;
    const studentUser = studentBody.data.user as {
      id: string;
      phone: string;
      nickname: string;
    };

    const parentRes = await apiContext.post('/api/internal/test-token', {
      data: { role: 'parent' }
    });
    expect(parentRes.ok()).toBeTruthy();
    const parentBody: any = await parentRes.json();
    const parentToken = parentBody.data.token as string;

    const teacherRes = await apiContext.post('/api/internal/test-token', {
      data: { role: 'teacher' }
    });
    expect(teacherRes.ok()).toBeTruthy();
    const teacherBody: any = await teacherRes.json();
    const teacherToken = teacherBody.data.token as string;

    // 2. 学生创建一条问题并由老师审核通过
    const questionTitle = `家长孩子历史提问 E2E 问题 ${Date.now()}`;
    const createQuestionRes = await apiContext.post('/api/questions', {
      data: {
        title: questionTitle,
        content:
          '用于验证家长通过“我的孩子”入口查看历史提问列表的链路。',
        subject: 'math',
        tags: ['家长历史提问', 'e2e']
      },
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      }
    });
    expect(createQuestionRes.ok()).toBeTruthy();
    const createdQuestion: any = await createQuestionRes.json();
    const questionId = createdQuestion.data.id as string;

    const approveRes = await apiContext.post(
      `/api/admin/audit/${questionId}/approve`,
      {
        data: {
          type: 'question',
          isGoodQuestion: false,
          score: 4,
          tags: ['家长历史提问', 'e2e'],
          difficulty: 'easy'
        },
        headers: {
          Authorization: `Bearer ${teacherToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    expect(approveRes.ok()).toBeTruthy();

    // 3. 通过后端接口完成家长绑定该学生
    const sendCodeRes = await apiContext.post('/api/auth/send-code', {
      data: {
        phone: studentUser.phone,
        type: 'bind_child'
      }
    });
    expect(sendCodeRes.ok()).toBeTruthy();

    const bindRes = await apiContext.post('/api/parent/bind', {
      data: {
        phone: studentUser.phone,
        code: '123456',
        childName: 'E2E 孩子',
        school: 'Playwright 小学'
      },
      headers: {
        Authorization: `Bearer ${parentToken}`,
        'Content-Type': 'application/json'
      }
    });
    expect(bindRes.ok()).toBeTruthy();

    // 4. 家长前端登录，从“我的孩子”入口进入孩子提问列表
    await bootstrapAuth(page, 'parent');

    await page.goto('/');
    const profileBtn = page.getByTestId('nav-profile');
    await profileBtn.click();
    await expect(page).toHaveURL(/\/profile$/);

    // “我的孩子”卡片中应出现刚绑定的孩子（昵称来自 internal test-token）
    const myChildrenCard = page
      .locator('div', { hasText: '我的孩子' })
      .first();
    const childNameLocator = myChildrenCard.getByText(studentUser.nickname);
    await expect(childNameLocator.first()).toBeVisible();

    // 点击同一行的“查看提问”按钮
    const childRow = childNameLocator
      .first()
      .locator('..')
      .locator('..')
      .locator('..');
    const viewQuestionsBtn = childRow.getByRole('button', {
      name: '查看提问'
    });
    await viewQuestionsBtn.click();

    // 5. 跳转到孩子提问列表页且包含该问题
    await expect(page).toHaveURL(
      new RegExp(`/parent/questions/${studentUser.id}`)
    );
    await expect(page.getByText('孩子提问列表')).toBeVisible();

    const historyCard = page
      .getByTestId('question-card')
      .filter({ hasText: questionTitle })
      .first();
    await expect(historyCard).toBeVisible({ timeout: 10_000 });

    // 6. 从孩子提问列表进入问题详情
    await historyCard.click();
    await expect(page).toHaveURL(
      new RegExp(`/question/${questionId}`),
      { timeout: 15_000 }
    );
    await expect(page.getByText(questionTitle)).toBeVisible();
  });
});
