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

  test('切换到注册并选择学生身份后显示学校/年级字段（无邀请码）', async ({ page }) => {
    await page.goto('/login');

    // 点击“快速注册”按钮
    await page.getByRole('button', { name: '快速注册' }).click();
    await page.getByRole('button', { name: '学生' }).click();

    // 注册模式下不再出现邀请码输入框
    await expect(page.getByLabel('邀请码 *')).toHaveCount(0);

    // 学生身份默认展示年级/年龄/学校字段
    await expect(page.getByLabel('年级 *')).toBeVisible();
    await expect(page.getByLabel('年龄 *')).toBeVisible();
    await expect(page.getByLabel('学校 *')).toBeVisible();
  });
});

