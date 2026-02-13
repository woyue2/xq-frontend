import { AiAuditService } from '../../services/ai-audit.service';

describe('AiAuditService retry strategy', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
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
});
