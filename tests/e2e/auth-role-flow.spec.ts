import { test, expect } from '@playwright/test';

// 帮助函数：从首页进入个人中心
async function gotoProfile(page: import('@playwright/test').Page) {
  await page.goto('/');

  const profileBtn = page.getByTestId('nav-profile');
  await profileBtn.click();

  await expect(page).toHaveURL(/\/profile$/);
}

test.describe('角色注册与身份展示 E2E', () => {
  test('学生邀请码注册后在个人中心显示学生身份', async ({ page }) => {
    await page.goto('/login');

    // 切换到注册模式
    await page.getByRole('button', { name: '快速注册' }).click();

    const phone = `13${Date.now().toString().slice(-9)}`;

    await page.getByLabel('手机号').fill(phone);
    await page.getByLabel('验证码').fill('123456'); // 后端 FIXED_CODE
    await page.getByLabel('密码 *').fill('password123');
    await page.getByLabel('邀请码', { exact: false }).fill('STUDENT2024');

    // 学生必填字段
    await page.getByLabel('年级 *').click();
    await page.getByRole('option', { name: /初一|七年级/ }).first().click();

    await page.getByLabel('年龄 *').fill('13');
    await page.getByLabel('学校 *').fill('测试中学');

    await page.getByRole('button', { name: '注册' }).click();

    // 注册成功后跳转首页
    await page.waitForURL('**/');

    // 进入个人中心
    await gotoProfile(page);

    // 角色 Badge 显示“学生”
    await expect(page.getByText('学生')).toBeVisible();
  });

  test('老师邀请码注册后在个人中心显示老师身份并具备审核权限入口', async ({ page }) => {
    await page.goto('/login');

    // 切换到注册模式
    await page.getByRole('button', { name: '快速注册' }).click();

    const phone = `13${(Date.now() + 1).toString().slice(-9)}`;

    await page.getByLabel('手机号').fill(phone);
    await page.getByLabel('验证码').fill('123456');
    await page.getByLabel('密码 *').fill('password123');
    await page.getByLabel('邀请码', { exact: false }).fill('TEACHER2024');

    await page.getByRole('button', { name: '注册' }).click();

    await page.waitForURL('**/');

    // 进入个人中心
    await gotoProfile(page);

    // 角色 Badge 显示“老师（有权限）”
    await expect(page.getByText('老师（有权限）')).toBeVisible();

    // 教师专属菜单：审核管理 / 用户白名单 / 我的回答
    await expect(page.getByText('审核管理')).toBeVisible();
    await expect(page.getByText('用户白名单')).toBeVisible();
    await expect(page.getByText('我的回答')).toBeVisible();
  });

  test('家长邀请码注册后在个人中心显示家长身份并展示“我的孩子”模块', async ({ page }) => {
    await page.goto('/login');

    // 切换到注册模式
    await page.getByRole('button', { name: '快速注册' }).click();

    const phone = `13${(Date.now() + 2).toString().slice(-9)}`;

    await page.getByLabel('手机号').fill(phone);
    await page.getByLabel('验证码').fill('123456');
    await page.getByLabel('邀请码', { exact: false }).fill('PARENT2024');

    // 家长专属字段（绑定孩子信息）
    await page.getByLabel('孩子姓名 *').fill('测试孩子');
    await page.getByLabel('手机号', { exact: false }).nth(1).fill('13900000001'); // 孩子手机号
    await page.getByLabel('验证码 *').fill('123456');
    await page.getByLabel('密码 *').fill('password123');

    await page.getByRole('button', { name: '注册' }).click();

    await page.waitForURL('**/');

    // 进入个人中心
    await gotoProfile(page);

    // 角色 Badge 显示“家长”（限定在 Badge 上，避免匹配到题目标题中的“家长”关键字）
    const roleBadge = page.locator('span').filter({ hasText: '家长' });
    await expect(roleBadge.first()).toBeVisible();

    // “我的孩子”卡片以及空态
    await expect(page.getByText('我的孩子')).toBeVisible();
    await expect(page.getByText('暂无绑定的孩子')).toBeVisible();
  });
});
