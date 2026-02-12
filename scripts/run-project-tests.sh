#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== 1. 后端 Jest 测试 (backend) ==="
(cd "$ROOT_DIR/backend" && npm test)

echo
echo "=== 2. 前端单元测试 (Vitest) ==="
(cd "$ROOT_DIR" && npm test)

echo
echo "=== 3. 前端 E2E 测试 (Playwright) ==="
(cd "$ROOT_DIR" && npx playwright test)

echo
echo "=== 4. 后端日志异常扫描 (scan-error-logs) ==="
(cd "$ROOT_DIR/backend" && npx tsx script/scan-error-logs.ts || true)

echo
echo "✅ 项目测试与日志扫描已全部执行完成"

