/**
 * [POS] src/lib/test-runner.ts
 *   所属：lib 层 | 角色：诊断用 API 测试执行器（仅 dev 模式）
 *   兄弟：utils.ts / permissions.ts
 *
 * [INPUT]
 *   - @/stores/useDiagnosticStore  → useDiagnosticStore
 *   - @/services/api               → api
 *
 * [OUTPUT]
 *   - runDiagnosticTests()（诊断测试执行函数）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/lib/CLAUDE.md 的文件清单
 */
import { useDiagnosticStore } from '@/stores/useDiagnosticStore';
import { api } from '@/services/api';

interface TestCase {
  id: string;
  name: string;
  description: string;
  run: () => Promise<void>;
}

// 线上健康检查用例（全部走真实后端 API）
const testCases: TestCase[] = [
  {
    id: 'auth_user_info',
    name: 'Auth: 当前用户信息',
    description: '调用 GET /api/users/me，验证登录态与角色信息是否正常返回',
    run: async () => {
      const res = await api.get('/users/me');
      const data: any = res.data?.data;
      if (!data || !data.id || !data.role) {
        throw new Error('用户信息不完整');
      }
    },
  },
  {
    id: 'questions_list',
    name: 'Questions: 问题列表',
    description: '调用 GET /api/questions?page=1&pageSize=5，验证题目列表与分页结构',
    run: async () => {
      const res = await api.get('/questions', {
        params: { page: 1, pageSize: 5 },
      });
      const data: any = res.data?.data;
      if (!data || !Array.isArray(data.list)) {
        throw new Error('问题列表结构不正确');
      }
    },
  },
  {
    id: 'notifications_unread',
    name: 'Notification: 未读数量',
    description: '调用 GET /api/notifications/unread-count，验证通知未读计数接口',
    run: async () => {
      const res = await api.get('/notifications/unread-count');
      const data: any = res.data?.data;
      if (!data || typeof data.unreadCount !== 'number') {
        throw new Error('未读通知计数结构不正确');
      }
    },
  },
  {
    id: 'config_question_dimensions',
    name: 'Config: 题目维度配置',
    description: '调用 GET /api/config/question-dimensions，验证配置中心可用',
    run: async () => {
      const res = await api.get('/config/question-dimensions');
      const data: any = res.data?.data;
      if (!data || !Array.isArray(data.dimensions)) {
        throw new Error('题目维度配置结构不正确');
      }
    },
  },
  {
    id: 'admin_whitelist',
    name: 'Admin: 白名单列表',
    description: '调用 GET /api/admin/whitelist?page=1&pageSize=5，验证老师后台白名单接口',
    run: async () => {
      const res = await api.get('/admin/whitelist', {
        params: { page: 1, pageSize: 5 },
      });
      const data: any = res.data?.data;
      if (!data || !Array.isArray(data.items)) {
        throw new Error('白名单列表结构不正确');
      }
    },
  },
];

export const runDiagnosticTests = async () => {
  const store = useDiagnosticStore.getState();

  // 1. 初始化
  store.reset();
  store.startTests();
  store.addLog('Diagnostic engine started...');

  // 初始化结果列表
  useDiagnosticStore.setState({
    results: testCases.map((tc) => ({
      id: tc.id,
      name: tc.name,
      description: tc.description,
      status: 'pending',
    })),
  });

  let completed = 0;

  // 2. 串行执行测试
  for (const testCase of testCases) {
    store.addLog(`Running: ${testCase.name}...`);
    store.updateResult(testCase.id, { status: 'running' });

    const startTime = performance.now();

    try {
      await testCase.run();
      const duration = Math.round(performance.now() - startTime);

      store.updateResult(testCase.id, {
        status: 'success',
        duration,
        message: 'Test passed',
      });
      store.addLog(`✅ PASS: ${testCase.name} (${duration}ms)`);
    } catch (error: any) {
      const duration = Math.round(performance.now() - startTime);
      store.updateResult(testCase.id, {
        status: 'failure',
        duration,
        message: error?.message ?? 'Unknown error',
      });
      store.addLog(`❌ FAIL: ${testCase.name} - ${error?.message ?? 'Unknown error'}`);
    }

    completed++;
    useDiagnosticStore.setState({
      progress: (completed / testCases.length) * 100,
    });
  }

  store.addLog('Diagnostic complete.');
  store.completeTests();
};
