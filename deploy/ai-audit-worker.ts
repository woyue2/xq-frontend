/**
 * AI 审核异步 Worker 示例（基于模式 3）
 *
 * 用途：
 *  - 从数据库里拉取待审核内容（例如 status = 'pending' 的 Question）
 *  - 调用你自己的 LLM 审核服务（base_url + api）
 *  - 拿到 answer 后，整理成 { safe, score, reason, ... } 结构
 *  - 回调到当前后端的 /api/internal/ai-check，完成状态更新
 *
 * 使用方式（示例）：
 *  - 在项目根目录执行：
 *    BACKEND_BASE_URL="http://localhost:4000" \
 *    AI_AUDIT_BASE_URL="https://your-audit-service/api" \
 *    npx tsx deploy/ai-audit-worker.ts
 *
 * ⚠️ 注意：
 *  - 本文件是一个“可修改模板”，请根据你的审核服务入参/出参协议自行调整。
 *  - 该脚本默认只处理 Question，你可以按需扩展到 Answer/Comment。
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { aiAuditConfig } from '../backend/src/config/ai-audit';

// 你的后端地址，用于回调 /api/internal/ai-check
// 可以通过环境变量覆盖，便于在不同环境下切换。
const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL ?? 'http://localhost:4000';

const prisma = new PrismaClient();

type AuditTargetType = 'question' | 'answer' | 'comment';

interface ExternalAuditResult {
  safe: boolean;
  score?: number;
  reason?: string;
  raw: unknown;
}

/**
 * 根据问题构造发送给 LLM 的提示词与待审核文本
 */
function buildQuestionAuditPayload(question: {
  id: string;
  title: string;
  content: string | null;
}): { prompt: string; text: string } {
  const basePrompt =
    process.env.AI_AUDIT_PROMPT ??
    '你是一个内容安全审核助手，请判断下面学生提问内容是否安全、是否包含辱骂/色情/暴力/违法等违规信息，并给出 safe(布尔) 与 score(风险评分 0~1) 与 reason(简短理由)。直接返回 JSON。';

  const text = `标题: ${question.title}\n内容: ${question.content ?? ''}`;

  return {
    prompt: basePrompt,
    text
  };
}

/**
 * 调用你的“审核 LLM 服务”
 *
 * 这里默认：
 *  - 使用 POST {baseUrl}/v1/audit
 *  - 请求体包含 { prompt, text }
 *  - 响应体中直接有 { safe, score, reason, ... }
 *
 * ⚠️ 如果你的服务现在只是返回 answer 字符串，请在这里按照实际格式解析。
 */
async function callExternalAuditService(input: {
  prompt: string;
  text: string;
}): Promise<ExternalAuditResult> {
  if (!aiAuditConfig.baseUrl) {
    throw new Error(
      'AI_AUDIT_BASE_URL 未配置，请在 .env 或运行环境中设置后再运行 worker。'
    );
  }

  const url = new URL('/v1/audit', aiAuditConfig.baseUrl).toString();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 如果你的审核服务需要鉴权，这里加上：
      // 'Authorization': `Bearer ${process.env.AI_AUDIT_API_KEY}`
    },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `审核服务调用失败: ${res.status} ${res.statusText} - ${text}`
    );
  }

  const data: any = await res.json();

  // 默认假设审核服务已经返回类似 { safe, score, reason }
  // 如果你的服务格式不同，请在这里做映射。
  const safe = Boolean(data.safe);
  const score =
    typeof data.score === 'number' ? data.score : undefined;
  const reason =
    typeof data.reason === 'string' ? data.reason : undefined;

  return {
    safe,
    score,
    reason,
    raw: data
  };
}

/**
 * 回调当前后端的 /api/internal/ai-check
 * 按后端已有实现要求发送 { targetType, targetId, result }。
 */
async function callbackInternalAiCheck(params: {
  targetType: AuditTargetType;
  targetId: string;
  result: ExternalAuditResult;
}) {
  const callbackUrl = new URL(
    aiAuditConfig.internalCallbackPath,
    BACKEND_BASE_URL
  ).toString();

  const payload = {
    targetType: params.targetType,
    targetId: params.targetId,
    result: {
      safe: params.result.safe,
      score: params.result.score,
      reason: params.result.reason,
      provider: aiAuditConfig.provider,
      raw: params.result.raw
    }
  };

  const res = await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `/api/internal/ai-check 回调失败: ${res.status} ${res.statusText} - ${text}`
    );
  }
}

/**
 * 从数据库中批量拉取待审核问题
 *
 * 你可以直接参考这里的 Prisma 语句，在自己的服务里复制使用。
 * 与 aiAuditConfig.examplePrismaQuery 保持语义一致。
 */
async function fetchPendingQuestions(limit = 10) {
  const questions = await prisma.question.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
    take: limit
  });
  return questions;
}

async function main() {
  console.log(
    `[ai-audit-worker] start, backend=${BACKEND_BASE_URL}, provider=${aiAuditConfig.provider}, enabled=${aiAuditConfig.enabled}`
  );

  const questions = await fetchPendingQuestions(10);

  if (questions.length === 0) {
    console.log('[ai-audit-worker] 没有待审核的问题，直接退出。');
    return;
  }

  for (const q of questions) {
    try {
      console.log(
        `[ai-audit-worker] 审核问题 id=${q.id}, title=${q.title}`
      );

      const payload = buildQuestionAuditPayload({
        id: q.id,
        title: q.title,
        content: q.content
      });

      const auditResult = await callExternalAuditService(payload);

      await callbackInternalAiCheck({
        targetType: 'question',
        targetId: q.id,
        result: auditResult
      });

      console.log(
        `[ai-audit-worker] 审核完成 id=${q.id}, safe=${auditResult.safe}, score=${auditResult.score}`
      );
    } catch (err) {
      console.error(
        `[ai-audit-worker] 处理问题 id=${q.id} 失败:`,
        err
      );
    }
  }
}

main()
  .catch((err) => {
    console.error('[ai-audit-worker] 运行失败:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

