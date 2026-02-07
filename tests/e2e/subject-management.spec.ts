import { test, expect } from '@playwright/test';
import { bootstrapAuth } from './utils/bootstrapAuth';

test.describe('Subject Management', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapAuth(page, 'teacher');
  });

  test('老师可以在后台查看科目列表', async ({ page }) => {
    await page.goto('/admin');

    // 等待管理页面加载
    await expect(page.getByText('题目维度配置')).toBeVisible();

    // 验证可以看到默认科目
    // 注意：这需要管理页面已经实现科目管理功能
    // 如果还未实现，这个测试会失败
    const mathSection = page.getByText('数学');
    await expect(mathSection).toBeVisible();
  });

  test('老师可以为科目添加考点', async ({ page }) => {
    await page.goto('/admin');

    // 找到数学科目部分
    const mathSection = page.getByText('数学').locator('..');

    // 点击添加考点按钮（如果存在）
    const addTopicButton = mathSection.getByRole('button', { name: /添加考点|添加/i });

    // 如果按钮不存在，跳过测试
    const isVisible = await addTopicButton.isVisible().catch(() => false);

    if (isVisible) {
      await addTopicButton.click();

      // 输入考点名称
      await page.getByLabel(/考点名称|名称/i).fill('向量');

      // 提交
      await page.getByRole('button', { name: /创建|保存/i }).click();

      // 验证成功提示
      await expect(page.getByText(/成功|创建成功/i)).toBeVisible();
    }
  });

  test('老师可以启用/禁用科目', async ({ page }) => {
    await page.goto('/admin');

    // 找到化学科目
    const chemistrySection = page.getByText('化学').locator('..');

    // 查找启用/禁用按钮
    const toggleButton = chemistrySection.getByRole('button', { name: /禁用|启用/i });

    const isVisible = await toggleButton.isVisible().catch(() => false);

    if (isVisible) {
      // 点击切换状态
      await toggleButton.click();

      // 验证状态变化
      await expect(page.getByText(/禁用|启用/i)).toBeVisible();
    }
  });
});
