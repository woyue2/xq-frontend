#!/usr/bin/env bash

set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:4000}"

echo "🔍 Backend perf smoke test against ${BACKEND_URL}"
echo

run() {
  echo "▶ $*"
  echo "----------------------------------------"
  eval "$@"
  echo
}

echo "Step 1/3: Health check baseline (GET /health)"
run "npx autocannon -c 5 -d 10 \"${BACKEND_URL}/health\""

echo "Step 2/3: Public behavior log write (POST /api/behavior/log)"
run "npx autocannon -c 2 -d 10 -m POST -H 'Content-Type=application/json' --body '{\"type\":\"perf_smoke_click\",\"timestamp\":1706832000000}' \"${BACKEND_URL}/api/behavior/log\""

echo "Step 3/3: Admin audit pending list (GET /api/admin/audit/pending?type=question)"
echo "  (requires a teacher token in BACKEND_SMOKE_TEACHER_TOKEN)"
if [[ -n "${BACKEND_SMOKE_TEACHER_TOKEN:-}" ]]; then
  run "npx autocannon -c 2 -d 10 -H \"Authorization=Bearer ${BACKEND_SMOKE_TEACHER_TOKEN}\" \"${BACKEND_URL}/api/admin/audit/pending?type=question&page=1&pageSize=10\""
else
  echo "⚠️  BACKEND_SMOKE_TEACHER_TOKEN 未设置，跳过带鉴权的审核接口压测。" 
fi

echo "✅ Perf smoke test finished."
