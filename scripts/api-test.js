#!/usr/bin/env node

/**
 * API 接口测试工具
 * 用于快速测试所有 API 接口的功能
 */

const BASE_URL = 'http://localhost:5173'
const TEST_USER = {
  phone: '11111111111',
  password: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5cWxtb3Z0Zmtmd21rbGZwdm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk2MzcyMCwiZXhwIjoyMDkwNTM5NzIwfQ.k19b4NZr3Xuk2VD7411hCnBmP354YnPKYIbIvkLg17U'
}

// 测试用例定义
const TESTS = {
  // 认证相关
  auth: {
    login: {
      method: 'POST',
      url: '/api/auth/password-login',
      data: { phone: TEST_USER.phone, password: TEST_USER.password },
      description: '管理员登录'
    },
    sendCode: {
      method: 'POST',
      url: '/api/auth/send-code',
      data: { phone: TEST_USER.phone, type: 'login' },
      description: '发送验证码'
    }
  },
  
  // 用户相关
  users: {
    me: {
      method: 'GET',
      url: '/api/users/me',
      auth: true,
      description: '获取当前用户信息'
    },
    profile: {
      method: 'GET',
      url: '/api/users/profile',
      auth: true,
      description: '获取用户详细资料'
    }
  },
  
  // 问题相关
  questions: {
    list: {
      method: 'GET',
      url: '/api/questions',
      description: '获取问题列表'
    },
    create: {
      method: 'POST',
      url: '/api/questions',
      auth: true,
      data: {
        title: '测试问题',
        content: '这是一个测试问题内容',
        subject: '数学',
        difficulty: 'easy'
      },
      description: '创建测试问题'
    }
  },
  
  // 健康检查
  health: {
    check: {
      method: 'GET',
      url: '/api/health',
      description: '健康检查'
    }
  }
}

// 全局变量存储 token
let authToken = null

// 发送 HTTP 请求
async function makeRequest(test) {
  const url = `${BASE_URL}${test.url}`
  const options = {
    method: test.method,
    headers: {
      'Content-Type': 'application/json',
      'x-request-id': Math.random().toString(36).substring(7)
    }
  }
  
  // 添加认证头
  if (test.auth && authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`
  }
  
  // 添加请求体
  if (test.data) {
    options.body = JSON.stringify(test.data)
  }
  
  console.log(`\n🧪 ${test.description}`)
  console.log(`   ${test.method} ${url}`)
  if (test.data) {
    console.log(`   Data: ${JSON.stringify(test.data)}`)
  }
  
  const startTime = Date.now()
  
  try {
    const response = await fetch(url, options)
    const duration = Date.now() - startTime
    const data = await response.json()
    
    console.log(`   ✅ Status: ${response.status} (${duration}ms)`)
    console.log(`   Response: ${JSON.stringify(data, null, 2)}`)
    
    // 如果是登录请求，保存 token
    if (test.url === '/api/auth/password-login' && data.code === 200) {
      authToken = data.data.token
      console.log(`   🔑 Token saved for authenticated requests`)
    }
    
    return { success: response.ok, status: response.status, data, duration }
  } catch (error) {
    const duration = Date.now() - startTime
    console.log(`   ❌ Error: ${error.message} (${duration}ms)`)
    return { success: false, error: error.message, duration }
  }
}

// 运行测试
async function runTests(filter = null) {
  console.log('🚀 API 接口测试开始')
  console.log(`📡 测试目标: ${BASE_URL}`)
  console.log(`👤 测试用户: ${TEST_USER.phone}`)
  console.log('=' .repeat(50))
  
  const results = {}
  
  // 如果指定了过滤器，只运行对应的测试
  const categoriesToTest = filter ? { [filter]: TESTS[filter] } : TESTS
  
  for (const [category, tests] of Object.entries(categoriesToTest)) {
    console.log(`\n📂 ${category.toUpperCase()} 接口测试`)
    console.log('-'.repeat(30))
    
    results[category] = {}
    
    for (const [name, test] of Object.entries(tests)) {
      const result = await makeRequest(test)
      results[category][name] = result
      
      // 短暂延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  // 输出测试总结
  console.log('\n' + '='.repeat(50))
  console.log('📊 测试总结')
  
  let totalTests = 0
  let passedTests = 0
  
  for (const [category, tests] of Object.entries(results)) {
    for (const [name, result] of Object.entries(tests)) {
      totalTests++
      if (result.success) {
        passedTests++
        console.log(`   ✅ ${category}.${name}`)
      } else {
        console.log(`   ❌ ${category}.${name} - ${result.error || `Status ${result.status}`}`)
      }
    }
  }
  
  console.log(`\n🎯 通过率: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`)
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！')
  } else {
    console.log('⚠️  部分测试失败，请检查日志')
  }
}

// 命令行参数处理
const args = process.argv.slice(2)
const filter = args.includes('--filter') ? args[args.indexOf('--filter') + 1] : null

// 运行测试
runTests(filter).catch(console.error)
