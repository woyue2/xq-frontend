import { AiAuditService } from '../../services/ai-audit.service';
import { env } from '../../config/env';

describe('AiAuditService retry strategy', () => {
  const originalFetch = global.fetch;
  const originalAuditBaseUrl = env.AI_AUDIT_BASE_URL;
  const originalAuditApiKey = env.AI_AUDIT_API_KEY;
  const originalInternalToken = env.AI_INTERNAL_TOKEN;

  afterEach(() => {
    global.fetch = originalFetch;
    (env as any).AI_AUDIT_BASE_URL = originalAuditBaseUrl;
    (env as any).AI_AUDIT_API_KEY = originalAuditApiKey;
    (env as any).AI_INTERNAL_TOKEN = originalInternalToken;
    jest.restoreAllMocks();
  });

  it('should enable audit service when AI_AUDIT_API_KEY is missing but AI_INTERNAL_TOKEN is configured', () => {
    (env as any).AI_AUDIT_BASE_URL = 'https://mock-audit.example.com/api';
    (env as any).AI_AUDIT_API_KEY = undefined;
    (env as any).AI_INTERNAL_TOKEN = 'fallback-internal-token';

    const service = new AiAuditService() as any;

    // 修改原因：覆盖“云端仅配置 AI_INTERNAL_TOKEN”场景，避免服务被误判为 disabled。
    expect(service.enabled).toBe(true);
    expect(service.apiKey).toBe('fallback-internal-token');
  });

  it('should keep audit service disabled when both AI_AUDIT_API_KEY and AI_INTERNAL_TOKEN are missing', () => {
    (env as any).AI_AUDIT_BASE_URL = 'https://mock-audit.example.com/api';
    (env as any).AI_AUDIT_API_KEY = undefined;
    (env as any).AI_INTERNAL_TOKEN = undefined;

    const service = new AiAuditService() as any;

    // 修改原因：确保兼容兜底不会掩盖真实缺参问题。
    expect(service.enabled).toBe(false);
  });

  it('should retry once on timeout-like error and then succeed for text audit', async () => {
    const service = new AiAuditService() as any;
    service.enabled = true;
    service.baseUrl = 'http://mock-ai-audit.test';
    service.apiKey = 'mock-key';

    const timeoutError = new Error('timeout') as Error & { name: string };
    timeoutError.name = 'AbortError';

    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '{"safe":true,"reason":null,"category":null,"quality":{"clear":true,"suggestion":null}}'
              }
            }
          ]
        })
      });

    global.fetch = fetchMock as any;

    const result = await service.auditContent('这是一个数学问题', 'question');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.safe).toBe(true);
    expect(result.requiresManualReview).toBeUndefined();
  });

  it('should fallback to manual review when retryable errors persist', async () => {
    const service = new AiAuditService() as any;
    service.enabled = true;
    service.baseUrl = 'http://mock-ai-audit.test';
    service.apiKey = 'mock-key';

    const timeoutError = new Error('timeout') as Error & { name: string };
    timeoutError.name = 'AbortError';

    const fetchMock = jest.fn().mockRejectedValue(timeoutError);
    global.fetch = fetchMock as any;

    const result = await service.auditContent('这是一个数学问题', 'question');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.safe).toBe(false);
    expect(result.requiresManualReview).toBe(true);
  });

  it('should retry once on 5xx response and then succeed for image audit', async () => {
    const service = new AiAuditService() as any;
    service.enabled = true;
    service.baseUrl = 'http://mock-ai-audit.test';
    service.apiKey = 'mock-key';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => 'bad gateway'
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '{"safe":true,"reason":null,"category":null,"content_type":"math_problem","description":"数学题"}'
              }
            }
          ]
        })
      });

    global.fetch = fetchMock as any;

    const result = await service.auditImage('https://example.com/math.png');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.safe).toBe(true);
    expect(result.requiresManualReview).toBeUndefined();
  });

  it('should fallback to manual review when image audit response is not valid JSON', async () => {
    const service = new AiAuditService() as any;
    service.enabled = true;
    service.baseUrl = 'http://mock-ai-audit.test';
    service.apiKey = 'mock-key';

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'not-a-json-response' } }]
      })
    });

    global.fetch = fetchMock as any;

    const result = await service.auditImage('https://example.com/unsafe.png');

    // 修改原因：解析失败不再默认通过，必须走人工复核。
    expect(result.safe).toBe(false);
    expect(result.requiresManualReview).toBe(true);
  });

  it('should fallback to manual review when text audit service is disabled', async () => {
    const service = new AiAuditService() as any;
    service.enabled = false;

    const result = await service.auditContent('这是一个数学问题', 'question');

    expect(result.safe).toBe(false);
    expect(result.requiresManualReview).toBe(true);
    expect(result.reason).toContain('未启用');
  });

  it('should fallback to manual review when image audit service is disabled', async () => {
    const service = new AiAuditService() as any;
    service.enabled = false;

    const result = await service.auditImage('https://example.com/math.png');

    expect(result.safe).toBe(false);
    expect(result.requiresManualReview).toBe(true);
    expect(result.reason).toContain('未启用');
  });

  it('should fallback to manual review for relative image url without calling AI', async () => {
    const service = new AiAuditService() as any;
    service.enabled = true;
    service.baseUrl = 'http://mock-ai-audit.test';
    service.apiKey = 'mock-key';

    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    const result = await service.auditImage('/static/image/local-fallback.jpg');

    // 修改原因：本地相对路径外部AI不可达，应直接转人工审核且不发起AI请求。
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.safe).toBe(false);
    expect(result.requiresManualReview).toBe(true);
    expect(result.reason).toContain('相对路径');
  });

  it('should fallback to manual review for localhost/private image urls without calling AI', async () => {
    const service = new AiAuditService() as any;
    service.enabled = true;
    service.baseUrl = 'http://mock-ai-audit.test';
    service.apiKey = 'mock-key';

    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    const localhostResult = await service.auditImage('http://localhost:3000/static/image/a.jpg');
    const privateIpResult = await service.auditImage('http://192.168.1.2/static/image/b.jpg');

    // 修改原因：本机/私网地址通常不可被外部AI访问，需直接转人工审核避免无效调用。
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localhostResult.safe).toBe(false);
    expect(localhostResult.requiresManualReview).toBe(true);
    expect(privateIpResult.safe).toBe(false);
    expect(privateIpResult.requiresManualReview).toBe(true);
  });
});
