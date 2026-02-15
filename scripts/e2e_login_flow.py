"""
知识星球问答小程序 - 登录 / 注册流程 E2E（前后端联调）

覆盖 backend/playwright/todolist.md 第 11 部分中的：
- 登录 / 注册流程
  - 从输入手机号 → 获取验证码 → 注册/登录，全链路走真实后端

前提条件:
- 前端 dev server 已在本机 5173 端口启动 (Vite，对应你那边的 3000)
- 后端 API 已在本机 4000 端口启动
- 后端使用当前仓库实现，验证码固定为 123456（见 backend/src/services/auth.service.ts 中 FIXED_CODE）
- Python 环境已安装 Playwright:
    pip install playwright
    playwright install

运行方式示例:
    cd /mnt/c/Users/Administrator/Downloads/知识星球问答小程序 4
    python scripts/e2e_login_flow.py
"""

from playwright.sync_api import sync_playwright


FRONTEND_URL = "http://localhost:5173"
LOGIN_URL = f"{FRONTEND_URL}/login"

# 建议使用一个测试手机号，避免和正式数据混在一起
TEST_PHONE = "13900002001"
TEST_CODE = "123456"  # 后端固定验证码，见 AuthService.FIXED_CODE


def run_login_flow() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=200)
        page = browser.new_page()

        # 1. 直接打开登录页（src/App.tsx: <Route path="/login" element={<LoginPage />} />）
        page.goto(LOGIN_URL)

        # # 2. 确认页面标题是 “账号登录”（见 LoginPage.tsx 中的文案）
        # page.get_by_text("账号登录").wait_for(timeout=5000)

        # 3. 输入手机号（Label “手机号” + <Input id="phone" />）
        phone_input = page.get_by_label("手机号")
        phone_input.fill(TEST_PHONE)

        # 4. 点击“获取验证码”按钮（LoginPage.tsx Button 文案）
        get_code_button = page.get_by_role("button", name="获取验证码")
        assert get_code_button.is_enabled(), "获取验证码按钮不可用，请检查前端校验逻辑"
        get_code_button.click()

        # 后端会发送固定验证码 123456，这里直接使用
        page.wait_for_timeout(1000)

        # 5. 输入验证码（Label “验证码” + <Input id="code" />）
        code_input = page.get_by_label("验证码")
        code_input.fill(TEST_CODE)

        # 6. 点击“登录”按钮（LoginPage.tsx: {isLogin ? '登录' : '注册'}，初始 isLogin = true）
        login_button = page.get_by_role("button", name="登录")
        assert login_button.is_enabled(), "登录按钮不可用，请检查 canSubmit 条件"
        login_button.click()

        # 7. 等待跳转到首页（App.tsx: path="/" element={<HomePage />}）
        page.wait_for_url(FRONTEND_URL + "/", timeout=10000)

        current_url = page.url
        assert "/login" not in current_url, f"仍停留在登录页: {current_url}"

        print("✅ 登录流程通过：手机号 + 验证码 登录成功，已跳转到首页。")

        # 暂停 2 秒方便肉眼查看
        page.wait_for_timeout(2000)
        browser.close()


if __name__ == "__main__":
    run_login_flow()

