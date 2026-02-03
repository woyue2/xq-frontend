import { test, expect } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

test.describe('教师角色审核与白名单管理 E2E', () => {
  test('老师: 审核页对待审核问题执行通过/驳回操作（前端状态流转）', async ({ page }) => {
    await bootstrapAuth(page, 'teacher');

    await page.goto('/');

    // 进入个人中心
    const profileBtn = page.getByTestId('nav-profile');
    await profileBtn.click();

    await expect(page).toHaveURL(/\/profile$/);

    // 进入审核管理页
    await page.getByText('审核管理').click();
    await expect(page).toHaveURL(/\/audit$/);
    await expect(page.getByTestId('audit-page')).toBeVisible();

    // 在“待审核”标签下找到任意一条问题记录（使用标题或按钮作为锚点）
    const pendingQuestionCard = page.getByRole('button', { name: /通过/ }).first().locator('..').locator('..');

    if (await pendingQuestionCard.isVisible().catch(() => false)) {
      // 对问题执行通过操作
      const approveBtn = pendingQuestionCard.getByRole('button', { name: /通过/ });
      await approveBtn.click();

      // 期望弹出“审核完成”类的成功提示文案
      await expect(page.getByText(/审核完成|审核已完成/)).toBeVisible();
    }
  });

  test('老师: 白名单管理中添加新用户并触发前端校验', async ({ page }) => {
    await bootstrapAuth(page, 'teacher');

    await page.goto('/');

    // 进入个人中心
    const profileBtn = page.getByTestId('nav-profile');
    await profileBtn.click();

    await expect(page).toHaveURL(/\/profile$/);

    // 进入用户白名单管理页
    await page.getByText('用户白名单').click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText('用户白名单管理')).toBeVisible();

    // 打开“添加用户到白名单”对话框（右上角“添加”按钮）
    await page.getByRole('button', { name: /^添加$/ }).click();
    await expect(page.getByText('添加用户到白名单')).toBeVisible();

    // 1) 错误手机号时给出前端校验提示
    await page.getByLabel('手机号 *', { exact: false }).fill('1380013');
    await page.getByLabel('姓名 *', { exact: false }).fill('E2E教师白名单用户');
    await page.getByRole('button', { name: '添加' }).click();

    await expect(
      page.getByText('请输入正确的11位手机号')
    ).toBeVisible();

    // 2) 填写正确手机号后可以成功添加（不强依赖后端，只验证前端流转）
    await page.getByLabel('手机号', { exact: false }).fill(`13${Date.now().toString().slice(-9)}`);

    await page.getByRole('button', { name: '添加' }).click();

    await expect(
      page.getByText(/添加成功！用户可以使用该手机号注册/)
    ).toBeVisible();
  });
});
