/**
 * 参考版本：最简单的 AI 审核 Worker 示例
 *
 * 使用场景（和你描述的一致）：
 *  - 你有一个外部审核接口，例如：
 *      https://www.baidu.com/thisIsMyAPI
 *  - 你发给它「提示词 + 文本」，让它做内容审核；
 *  - 它只需要返回一个 true / false（或 { safe: true/false } 的 JSON）；
 *  - 然后你把这个结果回调到当前后端的 `/api/internal/ai-check`。
 *
 * ⚠️ 注意：
 *  - 这个文件是“参考版本”，方便你读懂和改造；
 *  - 实际上线时，可以在此基础上接入真实数据库查询、真实审核 URL、鉴权等。
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

/**
 * 1. 配置区（你可以根据需要修改）
 */

// 当前后端的地址，用来回调 /api/internal/ai-check
// 例如你的 Node 后端跑在本机 3000 端口，就用默认值。
const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL ?? 'http://localhost:3000';

// 外部审核接口（按照你举的例子写死一个 URL，实际使用时请改成自己的）
const SIMPLE_AUDIT_URL =
  process.env.SIMPLE_AUDIT_URL ?? 'https://www.baidu.com/thisIsMyAPI';

// 审核提示词（Prompt），可以通过环境变量覆盖
const SIMPLE_AUDIT_PROMPT =
  process.env.SIMPLE_AUDIT_PROMPT ??
  '你是一个内容审核助手，我想和你说话。请你只返回 JSON 格式，包含一个布尔字段 safe，表示内容是否安全（true=通过，false=不通过）。';

// Prisma 客户端：用来从数据库里查待审核的问题
const prisma = new PrismaClient();

/**
 * 2. 从数据库读取“待审核问题”的真实示例
 *
 * 对应 Prisma 查询（显式展示方便你记忆）：
 *
 *   await prisma.question.findMany({
 *     where: { status: 'pending' },
 *     orderBy: { createdAt: 'asc' },
 *     take: 10
 *   });
 *
 * 你可以直接把这段复制到自己的服务里。
 */
async function fetchPendingQuestions(limit = 10) {
  const questions = await prisma.question.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
    take: limit
  });
  return questions;
}

/**
 * 3. 组装要发给审核服务的 payload（提示词 + 文本）
 */
function buildSimplePayload(q: { title: string; content?: string | null }) {
  const text = `标题: ${q.title}\n内容: ${q.content ?? ''}`;

  return {
    prompt: SIMPLE_AUDIT_PROMPT,
    text
  };
}

/**
 * 4. 调用外部审核接口
 *
 * 约定：
 *  - 请求：POST SIMPLE_AUDIT_URL
 *    body: { prompt: string, text: string }
 *  - 返回：
 *    - 要么是一个裸的 true/false；
 *    - 要么是一个 JSON 对象 { safe: true/false }。
 *
 * 我们统一把它解析成 boolean safe。
 */
async function callSimpleAuditService(payload: {
  prompt: string;
  text: string;
}): Promise<boolean> {
  console.log('[reference-worker] 调用审核接口:', SIMPLE_AUDIT_URL);

  const res = await fetch(SIMPLE_AUDIT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
      // 如果你的审核服务需要鉴权，在这里添加：
      // 'Authorization': `Bearer ${process.env.SIMPLE_AUDIT_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `审核接口调用失败: ${res.status} ${res.statusText} - ${text}`
    );
  }

  // 尝试解析 JSON；如果不是 JSON，就当做纯文本再判断
  let body: any;
  const text = await res.text();

  try {
    body = JSON.parse(text);
  } catch {
    // 如果不是 JSON，但恰好是 "true"/"false" 这种字符串，也做一次兜底
    if (text.trim() === 'true') return true;
    if (text.trim() === 'false') return false;
    throw new Error(`审核接口返回格式无法解析: ${text}`);
  }

  // 情况一：直接返回布尔值
  if (typeof body === 'boolean') {
    return body;
  }

  // 情况二：返回对象 { safe: true/false }
  if (typeof body.safe === 'boolean') {
    return body.safe;
  }

  throw new Error(
    `审核接口返回中缺少 safe 字段或类型错误: ${JSON.stringify(body)}`
  );
}

/**
 * 5. 把审核结果回调到当前后端
 *
 * 后端预期的格式：
 *  - targetType: "question" | "answer" | "comment"
 *  - targetId:  对应表里的 id
 *  - result:    一个对象，至少包含 safe 布尔值
 */
async function callbackInternalAiCheck(params: {
  targetType: 'question' | 'answer' | 'comment';
  targetId: string;
  safe: boolean;
}) {
  const callbackUrl = `${BACKEND_BASE_URL}/api/internal/ai-check`;

  const payload = {
    targetType: params.targetType,
    targetId: params.targetId,
    result: {
      safe: params.safe
      // 这里你也可以加上更多信息，比如：
      // score: 0.95,
      // reason: '这是一条示例理由',
      // provider: 'simple-example'
    }
  };

  console.log(
    '[reference-worker] 回调 /api/internal/ai-check:',
    callbackUrl,
    'payload=',
    JSON.stringify(payload)
  );

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
 * 6. 整体流程示例（main）
 *
 * 这个版本是真正“能跑”的版本：
 *  1）从数据库里查出 status = 'pending' 的问题列表；
 *  2）对每一条问题调用审核接口；
 *  3）拿到 safe 布尔值后，回调到 /api/internal/ai-check。
 *
 * ⚠️ 前提：
 *  - 你的数据库里已经有 question 表（Prisma 已经生成）；
 *  - 并且有一些 status = 'pending' 的问题记录。
 */
async function mainReferenceExample() {
  console.log('=== 参考版本 AI 审核 Worker 启动（真实数据库版本） ===');
  console.log('BACKEND_BASE_URL =', BACKEND_BASE_URL);
  console.log('SIMPLE_AUDIT_URL =', SIMPLE_AUDIT_URL);

  // 0）从数据库取待审核问题
  const questions = await fetchPendingQuestions(10);

  if (questions.length === 0) {
    console.log('[reference-worker] 当前没有 status=pending 的问题，直接退出。');
    return;
  }

  for (const q of questions) {
    try {
      console.log(
        `[reference-worker] 开始审核问题 id=${q.id}, title=${q.title}`
      );

      // 1）构造提示词 + 文本
      const payload = buildSimplePayload({
        title: q.title,
        content: q.content
      });

      // 2）调用外部审核接口，拿到 safe 布尔值
      const safe = await callSimpleAuditService(payload);
      console.log(
        `[reference-worker] 审核完成 id=${q.id}, safe=${safe}`
      );

      // 3）回调当前后端，通知 /api/internal/ai-check
      await callbackInternalAiCheck({
        targetType: 'question',
        targetId: q.id,
        safe
      });
    } catch (err) {
      console.error(
        `[reference-worker] 处理问题 id=${q.id} 时出错:`,
        err
      );
    }
  }

  console.log('=== 参考版本 AI 审核 Worker 执行完成 ===');
}

// 入口
mainReferenceExample()
  .catch((err) => {
    console.error('[reference-worker] 运行失败:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

