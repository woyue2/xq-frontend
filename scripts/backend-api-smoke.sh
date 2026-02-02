#!/usr/bin/env bash

set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:4000}"

echo "🔍 Backend API smoke test"
echo "   Target: ${BACKEND_URL}"
echo

check() {
  local desc="$1"
  local expect="$2"
  shift 2

  echo "== ${desc} =="
  # 其余参数直接传给 curl
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' "$@")
  echo "HTTP ${code}"
  if [ "${code}" != "${expect}" ]; then
    echo "❌ 期望 ${expect}，实际 ${code}"
  else
    echo "✅ OK"
  fi
  echo
}

# 1. /health
check "Health check (GET /health)" 200 "${BACKEND_URL}/health"

# 2. 认证相关基础用例

# 2.1 正常发送验证码（login 场景，生成一个无换行的随机 11 位手机号）
LOGIN_PHONE="139$(printf '%08d' "$((RANDOM % 100000000))")"
check "AUTH-API-001 send-code login 正常发送" 200 \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"${LOGIN_PHONE}\",\"type\":\"login\"}" \
  "${BACKEND_URL}/api/auth/send-code"

# 2.2 手机号格式错误
check "AUTH-API-002 手机号格式错误" 400 \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"1380013\",\"type\":\"login\"}" \
  "${BACKEND_URL}/api/auth/send-code"

# 2.3 同一手机号 60 秒内重复发送，触发频率限制
check "AUTH-API-003 发送频率限制（二次发送）" 429 \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"${LOGIN_PHONE}\",\"type\":\"login\"}" \
  "${BACKEND_URL}/api/auth/send-code"

# 2.4 非白名单手机号（注册场景），应命中 NOT_IN_WHITELIST
check "AUTH-API-004 非白名单手机号注册验证码" 403 \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"18888888888\",\"type\":\"register\"}" \
  "${BACKEND_URL}/api/auth/send-code"

# 3. 简单注册 + 登录烟囱（验证 /api/auth/register 与 /api/auth/login 是否可用）
SMOKE_PHONE="1390000${RANDOM}"
SMOKE_PHONE="${SMOKE_PHONE:0:11}"

echo "== AUTH smoke register/login for ${SMOKE_PHONE} =="

# 3.1 注册（使用固定验证码 123456）
REG_CODE=$(curl -s -o /dev/null -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"${SMOKE_PHONE}\",\"code\":\"123456\",\"nickname\":\"SmokeUser\"}" \
  "${BACKEND_URL}/api/auth/register")
echo "注册 HTTP ${REG_CODE}"

# 3.2 login 场景：先发送 login 验证码，再登录
LOGIN_CODE1=$(curl -s -o /dev/null -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"${SMOKE_PHONE}\",\"type\":\"login\"}" \
  "${BACKEND_URL}/api/auth/send-code")
echo "login send-code HTTP ${LOGIN_CODE1}"

LOGIN_CODE2=$(curl -s -o /dev/null -w '%{http_code}' \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"${SMOKE_PHONE}\",\"code\":\"123456\"}" \
  "${BACKEND_URL}/api/auth/login")
echo "login HTTP ${LOGIN_CODE2}"
echo

echo "✅ Smoke 脚本执行完毕（请根据上方 HTTP 状态码检查是否符合预期）。"
