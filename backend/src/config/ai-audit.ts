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

