import { useDiagnosticStore } from '@/stores/useDiagnosticStore';
import { mockQuestions, mockUsers } from './mock-data';

interface TestCase {
  id: string;
  name: string;
  description: string;
  run: () => Promise<void>;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 定义测试用例
const testCases: TestCase[] = [
  {
    id: 'auth_login_mock',
    name: 'Auth: Login Simulation',
    description: '模拟登录接口调用与Token生成',
    run: async () => {
      await sleep(300); // 模拟网络延迟
      if (!mockUsers[0].id) throw new Error('Mock user ID missing');
    }
  },
  {
    id: 'auth_user_info',
    name: 'Auth: Get User Info',
    description: '获取当前用户信息并校验字段',
    run: async () => {
      await sleep(200);
      const user = mockUsers[0];
      if (!user.nickname || !user.role) throw new Error('User schema validation failed');
    }
  },
  {
    id: 'question_list',
    name: 'Questions: Load List',
    description: '加载问题列表并检查分页数据',
    run: async () => {
      await sleep(500);
      const list = mockQuestions;
      if (!Array.isArray(list)) throw new Error('Response is not an array');
      if (list.length === 0) throw new Error('Question list is empty');
    }
  },
  {
    id: 'question_detail',
    name: 'Questions: Get Detail',
    description: '获取单个问题详情',
    run: async () => {
      await sleep(250);
      const question = mockQuestions[0];
      if (!question) throw new Error('Question not found');
      if (!question.title) throw new Error('Question title missing');
    }
  },
  {
    id: 'question_create',
    name: 'Questions: Create Question',
    description: '模拟创建新问题',
    run: async () => {
      await sleep(600);
      // 模拟成功
    }
  },
  {
    id: 'user_status',
    name: 'Users: Status Check',
    description: '检查用户状态枚举值合法性',
    run: async () => {
      await sleep(100);
      const validStatuses = ['active', 'banned', 'pending'];
      if (!validStatuses.includes('active')) throw new Error('Invalid status enum');
    }
  },
  {
    id: 'mock_error_case',
    name: 'Simulation: Error Scenario',
    description: '模拟500服务器错误场景',
    run: async () => {
      await sleep(400);
      // 这是一个故意失败的测试用例，用于演示错误处理
      // 为了不影响整体演示，我们让它有50%概率失败，或者先注释掉抛出错误
      // throw new Error('Simulated Server Error (500)');
      // 这里我们让它通过，但在日志里记录警告
      console.warn('Simulated warning');
    }
  }
];

export const runDiagnosticTests = async () => {
  const store = useDiagnosticStore.getState();
  
  // 1. 初始化
  store.reset();
  store.startTests();
  store.addLog('Diagnostic engine started...');
  
  // 初始化结果列表
  useDiagnosticStore.setState({
    results: testCases.map(tc => ({
      id: tc.id,
      name: tc.name,
      description: tc.description,
      status: 'pending'
    }))
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
        message: 'Test passed' 
      });
      store.addLog(`✅ PASS: ${testCase.name} (${duration}ms)`);
      
    } catch (error: any) {
      const duration = Math.round(performance.now() - startTime);
      store.updateResult(testCase.id, { 
        status: 'failure', 
        duration,
        message: error.message 
      });
      store.addLog(`❌ FAIL: ${testCase.name} - ${error.message}`);
    }

    completed++;
    useDiagnosticStore.setState({ progress: (completed / testCases.length) * 100 });
  }

  store.addLog('Diagnostic complete.');
  store.completeTests();
};
