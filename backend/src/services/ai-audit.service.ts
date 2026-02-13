/**
 * AI 内容审核服务
 * 
 * 用于审核问题/回答/评论内容，检测违规内容并提供问题质量建议
 * 支持文本审核和图片审核
 */

import { env } from '../config/env';
import { coreLogger } from '../middlewares/logger.middleware';

export type ContentType = 'question' | 'answer' | 'comment' | 'nickname';

export interface AuditResult {
    safe: boolean;
    reason?: string;
    category?: string;
    requiresManualReview?: boolean;  // 是否需要人工审核（当AI服务不可用时）
    quality?: {
        clear: boolean;
        suggestion?: string;
    };
}

export interface ImageAuditResult {
    safe: boolean;
    reason?: string;
    category?: string;
    contentType?: string;
    description?: string;
    requiresManualReview?: boolean;  // 是否需要人工审核（当AI服务不可用时）
}

const SYSTEM_PROMPT = `你是一个中学数学答疑平台的内容审核助手，平台面向初一到初三的学生。

## 审核任务

请对用户提交的内容进行审核，检查以下两个方面：

### 1. 安全审核（必须）

检查内容是否包含以下违规项：
- 色情、低俗、性暗示内容
- 暴力、恐吓、欺凌言论
- 政治敏感、极端言论
- 广告、垃圾信息、引流内容
- 个人隐私泄露（如完整手机号、家庭地址、身份证号等）
- 其他不适合未成年人的内容
- 脏话、侮辱性语言

### 2. 问题质量评估（仅对"问题"类型）

如果是学生提问，评估问题是否足够清晰：
- 问题是否包含具体的数学内容或题目
- 是否能让老师理解学生想问什么
- 如果问题过于模糊（如只说"这题怎么做"、"帮我看看"而没有具体内容），给出改进建议

注意：如果学生提到"图片"或"如图"，说明题目在图片中，这种情况视为正常提问，不需要建议。

## 返回格式

请严格按照以下 JSON 格式返回，不要有任何其他内容：

{
  "safe": true或false,
  "reason": "如果不安全，说明违规原因，简短明了",
  "category": "违规类别：porn/violence/political/spam/privacy/inappropriate/profanity 或 null",
  "quality": {
    "clear": true或false,
    "suggestion": "如果问题不够清晰，给出友好的改进建议，例如：'建议补充具体的题目内容或条件哦～'"
  }
}

## 示例

输入："这道题怎么做啊"
输出：{"safe":true,"reason":null,"category":null,"quality":{"clear":false,"suggestion":"建议补充具体的题目内容，这样老师才能更好地帮助你哦～"}}

输入："已知三角形ABC中，角A=60°，AB=5，AC=3，求BC的长度"
输出：{"safe":true,"reason":null,"category":null,"quality":{"clear":true,"suggestion":null}}

输入："老师你真笨"
输出：{"safe":false,"reason":"包含不礼貌用语","category":"inappropriate","quality":{"clear":false,"suggestion":null}}
`;

const IMAGE_AUDIT_PROMPT = `你是一个中学数学答疑平台的内容审核助手，平台面向初一到初三的学生（12-15岁未成年人）。

## 审核任务

请对用户提交的图片进行严格审核，检查以下内容：

### 安全审核（重点关注）
1. **色情/性感内容**：任何裸露、性暗示、低俗、色情图片必须拒绝
2. **暴露穿着**：过于暴露的服装、泳装、内衣等图片
3. **暴力血腥**：暴力、血腥、恐怖、惊悚图片
4. **政治敏感**：政治人物、政治标语、敏感事件
5. **广告引流**：广告、二维码、微信号、外链引流
6. **隐私信息**：身份证、银行卡、个人住址、电话号码等
7. **其他不当**：任何不适合未成年人观看的内容

### 内容评估
- 图片是否包含数学题目或解题过程
- 如果是数学题目，能否看清题目内容
- 是否是正常的学习相关图片

## 判断标准
- 只要有任何不适合中学生的内容，必须标记为 safe: false
- 对于性感/暴露内容零容忍
- 正常的数学题目、解题步骤、几何图形等标记为 safe: true

## 返回 JSON 格式（严格按此格式）

{
  "safe": true或false,
  "reason": "如果不安全，说明具体原因",
  "category": "违规类别：porn/violence/political/ad/privacy/other 或 null",
  "content_type": "math_problem/solution/diagram/photo/other",
  "description": "简要描述图片内容（10字以内）"
}
`;

export class AiAuditService {
    private baseUrl: string;
    private apiKey: string;
    private enabled: boolean;
    private readonly requestTimeoutMs = 5000;
    // 修改原因：方案B要求“卡住时先快速重试一次，再转人工审核”，避免瞬时网络抖动直接放大量人工单。
    // ⚠️ 不确定因素：重试次数和触发条件需结合线上SLA/失败率再调优，当前先采用最保守的单次重试。
    private readonly maxRequestAttempts = 2;

    constructor() {
        this.baseUrl = env.AI_AUDIT_BASE_URL || '';
        this.apiKey = env.AI_AUDIT_API_KEY || '';
        this.enabled = !!(this.baseUrl && this.apiKey);

        if (!this.enabled) {
            coreLogger.warn(
                { feature: 'ai-audit' },
                'AI audit service disabled: missing AI_AUDIT_BASE_URL or AI_AUDIT_API_KEY'
            );
        }
    }

    /**
     * 审核文本内容
     */
    async auditContent(
        content: string,
        type: ContentType = 'question'
    ): Promise<AuditResult> {
        // 修改原因：AI 不可用时禁止“默认通过”，统一转人工审核。
        if (!this.enabled) {
            coreLogger.info(
                { feature: 'ai-audit', content: content.slice(0, 50) },
                'AI audit skipped: service not enabled'
            );
            return {
                safe: false,
                requiresManualReview: true,
                reason: 'AI审核服务未启用，已转人工审核',
                quality: { clear: true }
            };
        }

        // 内容为空的情况
        if (!content || content.trim().length === 0) {
            return {
                safe: true,
                quality: {
                    clear: false,
                    suggestion: '请输入问题内容哦～'
                }
            };
        }

        const typeLabel =
            type === 'question'
                ? '学生提问'
                : type === 'answer'
                    ? '老师回答'
                    : type === 'comment'
                        ? '评论'
                        : '用户昵称';

        try {
            const response = await this.requestAuditWithSingleRetry({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'glm-4-flash',
                    messages: [
                        {
                            role: 'system',
                            content: SYSTEM_PROMPT
                        },
                        {
                            role: 'user',
                            content: `请审核以下${typeLabel}：\n\n${content}`
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 500
                }),
                feature: 'ai-audit'
            });

            if (!response.ok) {
                const errorText = await response.text();
                coreLogger.error(
                    {
                        feature: 'ai-audit',
                        status: response.status,
                        error: errorText
                    },
                    'AI audit API request failed'
                );
                // API 失败时转为人工审核
                return {
                    safe: false,
                    requiresManualReview: true,
                    reason: 'AI审核服务暂时不可用，已转人工审核',
                    quality: { clear: true }
                };
            }

            const data = await response.json();
            const assistantMessage = data.choices?.[0]?.message?.content;

            if (!assistantMessage) {
                coreLogger.warn(
                    { feature: 'ai-audit', data },
                    'AI audit returned empty response'
                );
                // 空响应转为人工审核
                return {
                    safe: false,
                    requiresManualReview: true,
                    reason: 'AI审核服务返回异常，已转人工审核',
                    quality: { clear: true }
                };
            }

            // 解析 JSON 响应
            const result = this.parseAuditResponse(assistantMessage);

            coreLogger.info(
                {
                    feature: 'ai-audit',
                    type,
                    contentPreview: content.slice(0, 50),
                    result
                },
                'AI audit completed'
            );

            return result;

        } catch (error) {
            coreLogger.error(
                { feature: 'ai-audit', error },
                'AI audit service error'
            );
            // 出错时转为人工审核
            return {
                safe: false,
                requiresManualReview: true,
                reason: 'AI审核服务网络异常，已转人工审核',
                quality: { clear: true }
            };
        }
    }

    /**
     * 审核图片内容
     * @param imageUrl 图片 URL 或 base64 编码的图片（需包含 data:image/xxx;base64, 前缀）
     */
    async auditImage(imageUrl: string): Promise<ImageAuditResult> {
        // 修改原因：AI 不可用时禁止“默认通过”，统一转人工审核。
        if (!this.enabled) {
            coreLogger.info(
                { feature: 'ai-audit-image' },
                'Image audit skipped: service not enabled'
            );
            return {
                safe: false,
                requiresManualReview: true,
                reason: '图片审核服务未启用，已转人工审核'
            };
        }

        // 图片 URL 为空
        if (!imageUrl || imageUrl.trim().length === 0) {
            return { safe: true };
        }

        try {
            const response = await this.requestAuditWithSingleRetry({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'glm-4v-flash',  // 使用视觉模型
                    messages: [
                        {
                            role: 'system',
                            content: IMAGE_AUDIT_PROMPT
                        },
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: '请严格审核这张图片，判断是否适合在中学数学答疑平台展示。特别注意检查是否有色情、性感、暴露或其他不适合未成年人的内容。'
                                },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: imageUrl
                                    }
                                }
                            ]
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 500
                }),
                feature: 'ai-audit-image'
            });

            if (!response.ok) {
                const errorText = await response.text();
                coreLogger.error(
                    {
                        feature: 'ai-audit-image',
                        status: response.status,
                        error: errorText
                    },
                    'Image audit API request failed'
                );
                // API 失败时转为人工审核
                return {
                    safe: false,
                    requiresManualReview: true,
                    reason: '图片审核服务暂时不可用，已转人工审核'
                };
            }

            const data = await response.json();
            const assistantMessage = data.choices?.[0]?.message?.content;

            if (!assistantMessage) {
                coreLogger.warn(
                    { feature: 'ai-audit-image', data },
                    'Image audit returned empty response'
                );
                // 空响应转为人工审核
                return {
                    safe: false,
                    requiresManualReview: true,
                    reason: '图片审核服务返回异常，已转人工审核'
                };
            }

            // 解析 JSON 响应
            const result = this.parseImageAuditResponse(assistantMessage);

            coreLogger.info(
                {
                    feature: 'ai-audit-image',
                    imageUrlPreview: imageUrl.slice(0, 50),
                    result
                },
                'Image audit completed'
            );

            return result;

        } catch (error) {
            coreLogger.error(
                { feature: 'ai-audit-image', error },
                'Image audit service error'
            );
            // 出错时转为人工审核
            return {
                safe: false,
                requiresManualReview: true,
                reason: '图片审核服务网络异常，已转人工审核'
            };
        }
    }

    /**
     * 批量审核图片
     */
    async auditImages(imageUrls: string[]): Promise<ImageAuditResult[]> {
        if (!imageUrls || imageUrls.length === 0) {
            return [];
        }

        const results: ImageAuditResult[] = [];
        for (const url of imageUrls) {
            const result = await this.auditImage(url);
            results.push(result);

            // 如果发现违规图片，可以提前返回
            if (!result.safe) {
                // 标记剩余图片为未审核
                for (let i = results.length; i < imageUrls.length; i++) {
                    results.push({ safe: true }); // 未审核的默认通过，但第一张违规已足够拒绝
                }
                break;
            }
        }

        return results;
    }

    /**
     * 解析文本审核 AI 返回的 JSON
     */
    private parseAuditResponse(response: string): AuditResult {
        try {
            // 尝试提取 JSON（有时 AI 会在 JSON 前后加一些文字）
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                coreLogger.warn(
                    { feature: 'ai-audit', response },
                    'Failed to extract JSON from AI response'
                );
                // 修改原因：解析失败属于不可判定状态，避免误放行，统一转人工复核。
                return {
                    safe: false,
                    requiresManualReview: true,
                    reason: 'AI审核结果解析失败，已转人工复核',
                    quality: { clear: true }
                };
            }

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                safe: parsed.safe === true,
                reason: parsed.reason || undefined,
                category: parsed.category || undefined,
                quality: {
                    clear: parsed.quality?.clear !== false,
                    suggestion: parsed.quality?.suggestion || undefined
                }
            };
        } catch (error) {
            coreLogger.warn(
                { feature: 'ai-audit', response, error },
                'Failed to parse AI audit response'
            );
            // 修改原因：JSON 解析异常不再默认通过，改为人工复核，降低漏审风险。
            return {
                safe: false,
                requiresManualReview: true,
                reason: 'AI审核结果解析异常，已转人工复核',
                quality: { clear: true }
            };
        }
    }

    /**
     * 解析图片审核 AI 返回的 JSON
     */
    private parseImageAuditResponse(response: string): ImageAuditResult {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                coreLogger.warn(
                    { feature: 'ai-audit-image', response },
                    'Failed to extract JSON from image audit response'
                );
                // 修改原因：图片审核解析失败时不再默认安全，转人工复核。
                return {
                    safe: false,
                    requiresManualReview: true,
                    reason: '图片审核结果解析失败，已转人工复核'
                };
            }

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                safe: parsed.safe === true,
                reason: parsed.reason || undefined,
                category: parsed.category || undefined,
                contentType: parsed.content_type || undefined,
                description: parsed.description || undefined
            };
        } catch (error) {
            coreLogger.warn(
                { feature: 'ai-audit-image', response, error },
                'Failed to parse image audit response'
            );
            // 修改原因：图片审核 JSON 解析异常时转人工复核，避免误放行。
            return {
                safe: false,
                requiresManualReview: true,
                reason: '图片审核结果解析异常，已转人工复核'
            };
        }
    }

    /**
     * 检查服务是否启用
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * 带超时控制的 fetch 封装，避免外部 AI 服务长时间挂起
     */
    private async fetchWithTimeout(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

        try {
            const response = await fetch(input, {
                ...init,
                signal: controller.signal
            });
            return response;
        } catch (error) {
            if ((error as any)?.name === 'AbortError') {
                coreLogger.error(
                    { feature: 'ai-audit', error: 'Request timed out', timeoutMs: this.requestTimeoutMs },
                    'AI audit request timed out'
                );
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * 单次快速重试包装：仅针对超时/网络错误/服务端繁忙(429/5xx)进行一次重试
     */
    private async requestAuditWithSingleRetry(params: {
        method: string;
        headers: Record<string, string>;
        body: string;
        feature: 'ai-audit' | 'ai-audit-image';
    }): Promise<Response> {
        let lastResponse: Response | null = null;
        let lastError: unknown;

        for (let attempt = 1; attempt <= this.maxRequestAttempts; attempt++) {
            try {
                const response = await this.fetchWithTimeout(this.baseUrl, {
                    method: params.method,
                    headers: params.headers,
                    body: params.body
                });

                lastResponse = response;
                const canRetryStatus =
                    (response.status === 429 || response.status >= 500) &&
                    attempt < this.maxRequestAttempts;

                if (canRetryStatus) {
                    coreLogger.warn(
                        {
                            feature: params.feature,
                            attempt,
                            maxAttempts: this.maxRequestAttempts,
                            status: response.status
                        },
                        'AI audit request failed with retryable status, retrying once'
                    );
                    continue;
                }

                return response;
            } catch (error) {
                lastError = error;
                const errorName = (error as { name?: string })?.name;
                const canRetryError =
                    (errorName === 'AbortError' || errorName === 'TypeError') &&
                    attempt < this.maxRequestAttempts;

                if (canRetryError) {
                    coreLogger.warn(
                        {
                            feature: params.feature,
                            attempt,
                            maxAttempts: this.maxRequestAttempts,
                            errorName
                        },
                        'AI audit request failed with retryable error, retrying once'
                    );
                    continue;
                }

                throw error;
            }
        }

        if (lastResponse) {
            return lastResponse;
        }

        throw lastError ?? new Error('AI audit request failed without response');
    }
}

export const aiAuditService = new AiAuditService();

