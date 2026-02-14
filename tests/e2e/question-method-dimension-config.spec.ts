import { test, expect, type APIRequestContext } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

test.describe('题目解题方法维度配置 E2E', () => {
  test('学生在提问页选择「暂不确定」时，后端收到 unknown 标签', async ({
    page,
    request
  }) => {
    const backendBase =
      process.env.BACKEND_BASE_URL || 'http://localhost:3000';

    // 预先从后端读取配置，获取 unknown 对应的展示文案。
    // 如当前后端尚未暴露该配置接口（404），则退回到前端默认文案“暂不确定”。
    let unknownLabel = '暂不确定';
    const configRes = await (request as APIRequestContext).get(
      `${backendBase}/api/config/question-dimensions`
    );

    if (configRes.ok()) {
      const configBody = (await configRes.json()) as {
        code: number;
        data: {
          dimensions: Array<{
            key: string;
            options: Array<{ value: string; label: string }>;
          }>;
        };
      };

      if (configBody.code === 200) {
        const methodDim = configBody.data.dimensions.find(
          (d) => d.key === 'method'
        );
        const unknownOption = methodDim?.options.find(
          (o) => o.value === 'unknown'
        );
        if (unknownOption?.label) {
          unknownLabel = unknownOption.label;
        }
      }
    }

    await bootstrapAuth(page, 'student');

    await page.goto('/');

    const createBtn = page.getByTestId('nav-create');
    await expect(createBtn).toBeVisible();
    await createBtn.click();
    await expect(page).toHaveURL(/\/create$/);

    // 选择科目
    await page.getByRole('button', { name: '数学' }).click();

    // 打开解题方法下拉并选择「暂不确定」
    await page.getByText('尝试了什么方法？').click();
    await expect(page.getByText(unknownLabel)).toBeVisible();
    await page.getByText(unknownLabel).click();

    const titleText = `Method dimension unknown ${Date.now()}`;
    await page
      .getByLabel('问题标题', { exact: false })
      .fill(titleText);

    // 拦截提交请求，验证 tags 中包含 'unknown'
    const [submittedRequest] = await Promise.all([
      page.waitForRequest(
        (r) =>
          r.method() === 'POST' &&
          r.url().includes('/api/questions')
      ),
      page.getByRole('button', { name: '提交' }).click()
    ]);

    const body = submittedRequest.postDataJSON() as any;
    expect(Array.isArray(body.tags)).toBe(true);
    expect(body.tags).toContain('unknown');
  });
});
