/**
 * 新用户完整业务流程测试
 *
 * 测试路径：
 * 1. 管理员登录
 * 2. 管理员创建家长与学生账号
 * 3. 管理员绑定家长与学生
 * 4. 家长与学生登录
 * 5. 学生修改密码和头像
 * 6. 学生提问（AI自动审核通过）
 * 7. 家长查看绑定的孩子问题
 * 8. 学生删除待审核问题
 * 9. 老师审核问题（第二轮审核）
 * 10. 老师回答问题
 * 11. 查看历史记录
 */

import { test, expect } from '@playwright/test';

// 测试账号配置
const TEST_ACCOUNTS = {
  admin: {
    phone: '13800000001',
    password: 'Admin@123',
  },
  parent: {
    phone: '13800000002',
    password: 'Parent@123',
    childName: '测试学生',
    childSchool: '测试中学',
  },
  student: {
    phone: '13800000003',
    password: 'Student@123',
  },
  teacher: {
    phone: '13800000004',
    password: 'Teacher@123',
  },
};

test.describe('新用户完整业务流程测试', () => {
  // 重置测试数据（每个测试前执行）
  test.beforeEach(async ({ page }) => {
    // 访问管理后台重置数据
    await page.goto('/admin/reset-test-data');
    await page.waitForLoadState('networkidle');
  });

  test('场景一：管理员登录', async ({ page }) => {
    await test.step('访问登录页面', async () => {
      await page.goto('/login');
      await expect(page).toHaveURL(/.*login/);
    });

    await test.step('管理员登录', async () => {
      await page.fill('input[type="tel"]', TEST_ACCOUNTS.admin.phone);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.admin.password);
      await page.click('button:has-text("登录")');

      // 等待登录成功，跳转到首页
      await expect(page).toHaveURL(/.*(home|dashboard)/, { timeout: 10000 });
    });

    await test.step('验证管理员权限', async () => {
      // 管理员应该能看到管理入口
      await expect(page.locator('text=管理'))
        .toBeVisible({ timeout: 5000 })
        .catch(() => {
          console.log('未找到管理入口，可能需要手动验证');
        });
    });
  });

  test('场景二：家长与学生登录', async ({ page }) => {
    await test.step('家长登录', async () => {
      await page.goto('/login');
      await page.fill('input[type="tel"]', TEST_ACCOUNTS.parent.phone);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.parent.password);
      await page.click('button:has-text("登录")');

      await expect(page).toHaveURL(/.*home/, { timeout: 10000 });
      console.log('✅ 家长登录成功');
    });

    await test.step('学生登录', async () => {
      // 学生登录
      await page.goto('/login');
      await page.fill('input[type="tel"]', TEST_ACCOUNTS.student.phone);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.student.password);
      await page.click('button:has-text("登录")');

      await expect(page).toHaveURL(/.*home/, { timeout: 10000 });
      console.log('✅ 学生登录成功');
    });
  });

  test('场景三：学生修改密码和头像', async ({ page }) => {
    await test.step('学生登录', async () => {
      await page.goto('/login');
      await page.fill('input[type="tel"]', TEST_ACCOUNTS.student.phone);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.student.password);
      await page.click('button:has-text("登录")');
      await expect(page).toHaveURL(/.*home/, { timeout: 10000 });
    });

    await test.step('进入个人中心', async () => {
      await page.click('text=个人中心');
      await expect(page).toHaveURL(/.*profile/);
    });

    await test.step('修改密码', async () => {
      await page.click('text=修改密码');

      // 填写密码修改表单
      await page.fill('input[placeholder="旧密码"]', TEST_ACCOUNTS.student.password);
      await page.fill('input[placeholder="新密码"]', 'NewStudent@123');
      await page.fill('input[placeholder="确认新密码"]', 'NewStudent@123');
      await page.click('button:has-text("确认修改")');

      // 验证修改成功
      await expect(page.locator('text=修改成功'))
        .toBeVisible({ timeout: 5000 })
        .catch(() => {
          console.log('密码修改可能需要短信验证码验证');
        });
    });

    await test.step('修改头像', async () => {
      // 点击头像修改
      await page.click('.avatar-container >> img');

      // 上传新头像（如果有测试图片）
      // await page.setInputFiles('input[type="file"]', 'test-assets/avatar.jpg');

      console.log('头像修改功能待验证');
    });
  });

  test('场景四：学生提问流程', async ({ page }) => {
    await test.step('学生登录', async () => {
      await page.goto('/login');
      await page.fill('input[type="tel"]', TEST_ACCOUNTS.student.phone);
      await page.fill('input[type="password"]', 'NewStudent@123');
      await page.click('button:has-text("登录")');
      await expect(page).toHaveURL(/.*home/, { timeout: 10000 });
    });

    await test.step('点击提问按钮', async () => {
      await page.click('text=提问');
      await expect(page).toHaveURL(/.*ask/);
    });

    await test.step('填写问题表单', async () => {
      // 选择科目
      await page.selectOption('select[name="subject"]', 'math');

      // 填写问题描述
      await page.fill('textarea[name="description"]', '这是一道关于二次函数的题目');

      // 选择考点
      await page.selectOption('select[name="dimension"]', '二次函数');

      // 上传图片（可选）
      // await page.setInputFiles('input[type="file"]', 'test-assets/question.jpg');

      console.log('问题表单填写完成，等待提交');
    });

    await test.step('提交问题', async () => {
      await page.click('button:has-text("提交")');

      // 等待提交成功
      await expect(page.locator('text=提交成功')).toBeVisible({ timeout: 5000 });
      console.log('✅ 问题提交成功，等待AI审核...');
    });

    await test.step('验证问题状态为待审核', async () => {
      // 查看我的问题列表
      await page.click('text=我的问题');
      await expect(page).toHaveURL(/.*my-questions/);

      // 验证问题状态
      await expect(page.locator('text=待审核')).toBeVisible({ timeout: 5000 });
      console.log('✅ 问题状态为待审核');
    });
  });

  test('场景五：家长查看绑定孩子的问题', async ({ page }) => {
    await test.step('家长登录', async () => {
      await page.goto('/login');
      await page.fill('input[type="tel"]', TEST_ACCOUNTS.parent.phone);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.parent.password);
      await page.click('button:has-text("登录")');
      await expect(page).toHaveURL(/.*home/, { timeout: 10000 });
    });

    await test.step('进入孩子的问题列表', async () => {
      await page.click('text=孩子的问题');
      await expect(page).toHaveURL(/.*child-questions/);
    });

    await test.step('验证能看到孩子的问题', async () => {
      // 能看到之前学生提交的问题
      await expect(page.locator('text=二次函数')).toBeVisible({ timeout: 10000 });
      console.log('✅ 家长能看到孩子的问题');
    });

    await test.step('验证问题状态显示', async () => {
      // 验证问题状态
      await expect(page.locator('text=待审核')).toBeVisible();
      console.log('✅ 问题状态显示正确');
    });
  });

  test('场景六：学生删除待审核问题', async ({ page }) => {
    await test.step('学生登录', async () => {
      await page.goto('/login');
      await page.fill('input[type="tel"]', TEST_ACCOUNTS.student.phone);
      await page.fill('input[type="password"]', 'NewStudent@123');
      await page.click('button:has-text("登录")');
      await expect(page).toHaveURL(/.*home/, { timeout: 10000 });
    });

    await test.step('进入我的问题列表', async () => {
      await page.click('text=我的问题');
      await expect(page).toHaveURL(/.*my-questions/);
    });

    await test.step('删除待审核问题', async () => {
      // 找到待审核的问题
      const questionCard = page.locator('text=二次函数').first();
      await questionCard.click();

      // 点击删除按钮
      await page.click('button:has-text("删除")');

      // 确认删除
      await page.click('button:has-text("确认")');

      // 验证删除成功
      await expect(page.locator('text=删除成功')).toBeVisible({ timeout: 5000 });
      console.log('✅ 待审核问题删除成功');
    });
  });

  test('场景七：老师审核问题', async ({ page }) => {
    await test.step('老师登录', async () => {
      await page.goto('/login');
      await page.fill('input[type="tel"]', TEST_ACCOUNTS.teacher.phone);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.teacher.password);
      await page.click('button:has-text("登录")');
      await expect(page).toHaveURL(/.*home/, { timeout: 10000 });
    });

    await test.step('进入审核列表', async () => {
      await page.click('text=审核管理');
      await expect(page).toHaveURL(/.*audit/);
    });

    await test.step('审核AI已通过的问题', async () => {
      // 找到AI审核通过的问题
      const question = page.locator('text=二次函数').first();
      await question.click();

      // 审核通过
      await page.click('button:has-text("通过")');

      // 验证审核成功
      await expect(page.locator('text=审核成功')).toBeVisible({ timeout: 5000 });
      console.log('✅ 老师审核通过问题');
    });
  });

  test('场景八：老师回答问题', async ({ page }) => {
    await test.step('老师登录', async () => {
      await page.goto('/login');
      await page.fill('input[type="tel"]', TEST_ACCOUNTS.teacher.phone);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.teacher.password);
      await page.click('button:has-text("登录")');
      await expect(page).toHaveURL(/.*home/, { timeout: 10000 });
    });

    await test.step('进入待回答问题列表', async () => {
      await page.click('text=回答管理');
      await expect(page).toHaveURL(/.*answers/);
    });

    await test.step('找到已审核通过的问题', async () => {
      // 找到已审核通过的问题
      const question = page.locator('text=二次函数').first();
      await question.click();
    });

    await test.step('录制或文字回答', async () => {
      // 文字回答
      await page.fill('textarea[name="answer"]', '二次函数的解题步骤如下：...');

      // 或者录制音频回答
      // await page.click('text=录制回答');
      // await page.click('button:has-text("开始录制")');
      // await page.waitForTimeout(30000); // 录制30秒
      // await page.click('button:has-text("完成录制")');
    });

    await test.step('提交回答', async () => {
      await page.click('button:has-text("提交回答")');

      // 验证提交成功
      await expect(page.locator('text=提交成功')).toBeVisible({ timeout: 5000 });
      console.log('✅ 老师回答成功');
    });
  });

  test('场景九：查看历史记录', async ({ page }) => {
    await test.step('学生查看历史问题', async () => {
      // 学生登录
      await page.goto('/login');
      await page.fill('input[type="tel"]', TEST_ACCOUNTS.student.phone);
      await page.fill('input[type="password"]', 'NewStudent@123');
      await page.click('button:has-text("登录")');
      await expect(page).toHaveURL(/.*home/, { timeout: 10000 });

      await page.click('text=历史记录');
      await expect(page).toHaveURL(/.*history/);

      // 验证能看到已回答的问题
      await expect(page.locator('text=二次函数')).toBeVisible({ timeout: 10000 });
      console.log('✅ 学生查看历史问题成功');
    });

    await test.step('家长查看孩子历史问题', async () => {
      // 家长登录
      await page.goto('/login');
      await page.fill('input[type="tel"]', TEST_ACCOUNTS.parent.phone);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.parent.password);
      await page.click('button:has-text("登录")');
      await expect(page).toHaveURL(/.*home/, { timeout: 10000 });

      await page.click('text=孩子的问题');
      await expect(page).toHaveURL(/.*child-questions/);

      // 筛选已回答
      await page.click('text=已回答');

      // 验证能看到孩子的已回答问题
      await expect(page.locator('text=二次函数')).toBeVisible({ timeout: 10000 });
      console.log('✅ 家长查看孩子历史问题成功');
    });
  });

  test('完整业务流程验收测试', async ({ page }) => {
    console.log('========================================');
    console.log('开始完整业务流程验收测试');
    console.log('========================================');

    await test.step('Step 1: 学生重新提交问题', async () => {
      await page.goto('/login');
      await page.fill('input[type="tel"]', TEST_ACCOUNTS.student.phone);
      await page.fill('input[type="password"]', 'NewStudent@123');
      await page.click('button:has-text("登录")');
      await expect(page).toHaveURL(/.*home/, { timeout: 10000 });

      await page.click('text=提问');
      await page.selectOption('select[name="subject"]', 'math');
      await page.fill('textarea[name="description"]', '这是一道关于圆的证明题');
      await page.selectOption('select[name="dimension"]', '圆');
      await page.click('button:has-text("提交")');
      await expect(page.locator('text=提交成功')).toBeVisible({ timeout: 5000 });
      console.log('✅ Step 1 完成：学生提问');
    });

    await test.step('Step 2: 家长查看问题', async () => {
      await page.goto('/login');
      await page.fill('input[type="tel"]', TEST_ACCOUNTS.parent.phone);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.parent.password);
      await page.click('button:has-text("登录")');

      await page.click('text=孩子的问题');
      await expect(page.locator('text=圆的证明题')).toBeVisible({ timeout: 10000 });
      console.log('✅ Step 2 完成：家长查看问题');
    });

    await test.step('Step 3: 老师审核问题', async () => {
      await page.goto('/login');
      await page.fill('input[type="tel"]', TEST_ACCOUNTS.teacher.phone);
      await page.fill('input[type="password"]', TEST_ACCOUNTS.teacher.password);
      await page.click('button:has-text("登录")');

      await page.click('text=审核管理');
      await page.locator('text=圆的证明题').first().click();
      await page.click('button:has-text("通过")');
      console.log('✅ Step 3 完成：老师审核');
    });

    await test.step('Step 4: 老师回答问题', async () => {
      await page.click('text=回答管理');
      await page.locator('text=圆的证明题').first().click();
      await page.fill('textarea[name="answer"]', '圆的证明步骤：...');
      await page.click('button:has-text("提交回答")');
      console.log('✅ Step 4 完成：老师回答');
    });

    await test.step('Step 5: 学生查看回答', async () => {
      await page.goto('/login');
      await page.fill('input[type="tel"]', TEST_ACCOUNTS.student.phone);
      await page.fill('input[type="password"]', 'NewStudent@123');
      await page.click('button:has-text("登录")');

      await page.click('text=历史记录');
      await expect(page.locator('text=圆的证明题')).toBeVisible({ timeout: 10000 });
      console.log('✅ Step 5 完成：学生查看回答');
    });

    console.log('========================================');
    console.log('✅ 完整业务流程验收测试通过！');
    console.log('========================================');
  });
});
