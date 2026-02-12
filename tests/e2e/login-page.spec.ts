import { test, expect } from '@playwright/test';

test.describe('登录与注册页面基础交互', () => {
  test('手机号格式不正确时不给发送验证码', async ({ page }) => {
    await page.goto('/login');

    // 输入错误手机号
    await page.getByLabel('手机号').fill('1380013');

    // 点击“获取验证码”
    await page.getByRole('button', { name: '获取验证码' }).click();

    // 前端表单校验，应提示错误，而不是直接发请求
    await expect(
      page.getByText('请输入正确的手机号')
    ).toBeVisible();
  });

  test('切换到注册时显示邀请码输入区域', async ({ page }) => {
    await page.goto('/login');

    // 点击“快速注册”按钮
    await page.getByRole('button', { name: '快速注册' }).click();

    // 注册模式下应出现邀请码输入框提示
    await expect(
      page.getByText('需输入有效邀请码方可注册')
    ).toBeVisible();

    // 学生邀请码时应展示年级/年龄/学校字段（只验证基本存在）
    await page.getByLabel('邀请码 *').fill('STUDENT2024');

    await expect(page.getByLabel('年级 *')).toBeVisible();
    await expect(page.getByLabel('年龄 *')).toBeVisible();
    await expect(page.getByLabel('学校 *')).toBeVisible();
  });
});

