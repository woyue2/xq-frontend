import { spawn } from 'node:child_process';

/**
 * 轻量级 API 状态码冒烟测试脚本
 *
 * 说明：
 * - 仅运行 api-status-smoke.spec.ts 集成测试文件；
 * - 覆盖典型路由跳转与返回的 HTTP 状态码 / `code` 字段；
 * - 作为文档 `backend/api-status-map.md` 的快速验证补充。
 */

const jestArgs = ['test', '--', '--runInBand', '--', 'api-status-smoke.spec.ts'];

const child = spawn('npm', jestArgs, {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});

