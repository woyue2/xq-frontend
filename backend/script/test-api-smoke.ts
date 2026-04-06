/**
 * API Smoke Test - 打 Vercel Preview 环境
 * 用法: npx tsx script/test-api-smoke.ts
 */

const BASE = process.env.API_BASE || 'http://localhost:3000/api'
const PHONE = '11111111111'
const PASSWORD = 'pXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5cWxtb3Z0Zmtmd21rbGZwdm5jIiwicm9sZSI6InNlcnZpY2Vf'

let token = ''
let createdQuestionId = ''

async function req(method: string, path: string, body?: any, auth = false) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth && token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, data: json }
}

function pass(label: string) { console.log(`  ✅ ${label}`) }
function fail(label: string, detail?: any) { console.log(`  ❌ ${label}`, detail ?? '') }
function section(label: string) { console.log(`\n── ${label} ──`) }

async function run() {
  // ── 1. 登录 ──────────────────────────────────────────────────────────────
  section('Auth')
  const login = await req('POST', '/auth?action=password-login', { phone: PHONE, password: PASSWORD })
  if (login.status === 200 && login.data?.data?.token) {
    token = login.data.data.token
    pass(`登录成功 role=${login.data.data.user?.role}`)
  } else {
    fail('登录失败', { status: login.status, msg: login.data?.message })
    process.exit(1)
  }

  // ── 2. 获取当前用户 ───────────────────────────────────────────────────────
  const me = await req('GET', '/users?action=me', undefined, true)
  me.status === 200 ? pass('GET /users?action=me') : fail('GET /users?action=me', me.status)

  // ── 3. 问题列表 ───────────────────────────────────────────────────────────
  section('Questions')
  const qList = await req('GET', '/questions?page=1&limit=10')
  qList.status === 200 ? pass(`GET /questions count=${qList.data?.data?.list?.length}`) : fail('GET /questions', qList.status)

  // ── 4. 创建问题 ───────────────────────────────────────────────────────────
  const qCreate = await req('POST', '/questions', {
    title: '[Smoke Test] 自动测试问题',
    content: '这是自动化测试创建的问题',
    subject: 'math',
    tags: [],
    images: []
  }, true)
  if (qCreate.status === 201 && qCreate.data?.data?.id) {
    createdQuestionId = qCreate.data.data.id
    pass(`POST /questions id=${createdQuestionId}`)
  } else {
    fail('POST /questions', { status: qCreate.status, msg: qCreate.data?.message })
  }

  // ── 5. 问题详情 ───────────────────────────────────────────────────────────
  if (createdQuestionId) {
    const qDetail = await req('GET', `/questions?action=detail&id=${createdQuestionId}`, undefined, true)
    qDetail.status === 200 ? pass(`GET /questions?action=detail id=${createdQuestionId}`) : fail('GET /questions?action=detail', qDetail.status)
  }

  // ── 6. 审核队列 ───────────────────────────────────────────────────────────
  section('Admin Audit')
  const pending = await req('GET', '/admin?action=audit&subaction=pending&type=question&page=1&pageSize=10', undefined, true)
  if (pending.status === 200) {
    pass(`GET /admin?action=audit&subaction=pending count=${pending.data?.data?.list?.length}`)
  } else {
    fail('GET /admin?action=audit&subaction=pending', { status: pending.status, msg: pending.data?.message })
  }

  // ── 7. 审核通过刚创建的问题 ───────────────────────────────────────────────
  if (createdQuestionId) {
    const approve = await req('POST', '/admin?action=audit&subaction=approve', {
      id: createdQuestionId,
      type: 'question',
      isGoodQuestion: false
    }, true)
    approve.status === 200 ? pass(`审核通过 id=${createdQuestionId}`) : fail('审核通过', { status: approve.status, msg: approve.data?.message })
  }

  // ── 8. 白名单 ─────────────────────────────────────────────────────────────
  section('Admin Whitelist')
  const wl = await req('GET', '/admin?action=whitelist&page=1&limit=10', undefined, true)
  wl.status === 200 ? pass(`GET /admin?action=whitelist count=${wl.data?.data?.list?.length}`) : fail('GET /admin?action=whitelist', { status: wl.status, msg: wl.data?.message })

  // ── 9. 通知 ───────────────────────────────────────────────────────────────
  section('Notifications')
  const notif = await req('GET', '/notifications?page=1&limit=10', undefined, true)
  notif.status === 200 ? pass('GET /notifications') : fail('GET /notifications', notif.status)

  console.log('\n── 完成 ──\n')
}

run().catch(console.error)
