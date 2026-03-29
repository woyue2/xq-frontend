/**
 * [POS] backend/src/config/ai-audit.ts
 *   所属：配置层 | 角色：AI 审核服务配置（模型、endpoint、超时等参数）
 *
 * [INPUT]
 *   - ./env → env
 *
 * [OUTPUT]
 *   - aiAuditConfig（AI 审核配置对象）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 */
import { env } from './env';

/**
 * AI 审核服务配置
 *
 * - baseUrl: 你的外部审核服务基础地址（例如 https://audit.example.com/api）
 * - provider: 供应商/实现名称，便于排查问题（例如 "openai-proxy" / "custom-llm"）
 * - internalCallbackPath: 当前后端用于接收审核结果的固定回调路径
 * - examplePrismaQuery: 一条“从数据库拉取待审核内容”的示例命令，方便你在脚本/worker 中直接参考
 */
export const aiAuditConfig = {
  enabled: !!env.AI_AUDIT_BASE_URL,
  baseUrl: env.AI_AUDIT_BASE_URL,
  provider: env.AI_AUDIT_PROVIDER_NAME ?? 'custom-llm',
  internalCallbackPath: '/api/internal/ai-check',
  examplePrismaQuery:
    "await prisma.question.findMany({ where: { status: 'pending' } })"
} as const;

