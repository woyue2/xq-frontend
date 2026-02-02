#!/usr/bin/env bash

set -euo pipefail

# 简单开发脚本：在本地执行 Prisma 迁移并启动后端 dev 服务。
# 使用方式（在仓库根目录）:
#   bash deploy/dev-backend.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "${ROOT_DIR}/backend"

echo "[dev-backend] 当前工作目录: $(pwd)"

if [ ! -f ".env" ]; then
  echo "[dev-backend] ⚠️ 未找到 backend/.env，请先根据示例配置数据库/Redis/JWT 等环境变量。"
  exit 1
fi

echo "[dev-backend] 安装依赖（如已安装会快速跳过缓存）..."
npm install

echo "[dev-backend] 执行 Prisma 迁移以同步数据库结构..."
npm run prisma:migrate

echo "[dev-backend] 启动本地开发服务器 (npm run dev)..."
echo "[dev-backend] 提示：按 Ctrl+C 可停止服务。"
npm run dev

