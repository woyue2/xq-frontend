/**
 * Unit tests for Answers API
 * Tests Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Create mock instances before importing
const mockAnswerFindMany = vi.fn();
const mockAnswerCreate = vi.fn();
const mockQuestionFindUnique = vi.fn();
const mockUserFindUnique = vi.fn();
const mockGetUserFromToken = vi.fn();

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrismaInstance = {
    answer: {
      findMany: mockAnswerFindMany,
      create: mockAnswerCreate,
    },
    question: {
      findUnique: mockQuestionFindUnique,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
  };
  return {
    PrismaClient: class MockPrismaClient {
      answer = mockPrismaInstance.answer;
      question = mockPrismaInstance.question;
      user = mockPrismaInstance.user;
    },
  };
});

// Mock helpers
vi.mock('../../api/_helpers', () => ({
  prisma: {
    answer: {
      findMany: mockAnswerFindMany,
      create: mockAnswerCreate,
    },
    question: {
      findUnique: mockQuestionFindUnique,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
  },
  getUserFromToken: mockGetUserFromToken,
  AppError: class AppError extends Error {
    constructor(public statusCode: number, public code: string, message: string) {
      super(message);
    }
  },
}));

// Import handler after mocks
const { default: handler } = await import('../../api/answers');

// Test data
const mockUser = {
  id: 'user-1',
  phone: '13800000001',
  nickname: 'Test Teacher',
  name: 'Teacher One',
  avatar: 'https://example.com/avatar1.jpg',
  role: 'teacher',
};

const mockQuestion = {
  id: 'question-1',
  title: 'Test Question',
  content: 'Test content',
  subject: 'math',
  tags: ['algebra'],
  images: [],
  authorId: 'user-1',
  authorName: 'Test Teacher',
  authorAvatar: 'https://example.com/avatar1.jpg',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockAnswer = {
  id: 'answer-1',
  questionId: 'question-1',
  content: 'This is a test answer',
  images: ['https://example.com/image1.jpg'],
  authorId: 'user-1',
  authorName: 'Test Teacher',
  authorAvatar: 'https://example.com/avatar1.jpg',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('Answers API - List (GET)', () => {
  let mockReq: Partial<VercelRequest>;
  let mockRes: Partial<VercelResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let setHeaderMock: ReturnType<typeof vi.fn>;
  let endMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock, end: endMock }));
    setHeaderMock = vi.fn();
    endMock = vi.fn();

    mockRes = {
      json: jsonMock as any,
      status: statusMock as any,
      setHeader: setHeaderMock as any,
      end: endMock as any,
    };
  });

  it('should return 400 when questionId is missing (Req 3.1)', async () => {
    mockReq = {
      method: 'GET',
      url: '/api/answers',
      query: {},
      headers: {},
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: expect.stringContaining('缺少 questionId'),
      })
    );
  });

  it('should return 404 when question does not exist (Req 3.1)', async () => {
    mockQuestionFindUnique.mockResolvedValue(null);

    mockReq = {
      method: 'GET',
      url: '/api/answers?questionId=nonexistent',
      query: { questionId: 'nonexistent' },
      headers: {},
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 404,
        message: expect.stringContaining('问题不存在'),
      })
    );
  });

  it('should return answers list without authentication (Req 3.1)', async () => {
    mockQuestionFindUnique.mockResolvedValue(mockQuestion);
    const mockAnswers = [
      mockAnswer,
      { ...mockAnswer, id: 'answer-2', content: 'Another answer', images: [] },
    ];
    mockAnswerFindMany.mockResolvedValue(mockAnswers);

    mockReq = {
      method: 'GET',
      url: '/api/answers?questionId=question-1',
      query: { questionId: 'question-1' },
      headers: {},
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(mockAnswerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { questionId: 'question-1' },
        orderBy: { createdAt: 'desc' },
      })
    );

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 200,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'answer-1',
            questionId: 'question-1',
            content: 'This is a test answer',
            images: ['https://example.com/image1.jpg'],
          }),
          expect.objectContaining({
            id: 'answer-2',
            content: 'Another answer',
          }),
        ]),
      })
    );
  });

  it('should return empty array when no answers exist', async () => {
    mockQuestionFindUnique.mockResolvedValue(mockQuestion);
    mockAnswerFindMany.mockResolvedValue([]);

    mockReq = {
      method: 'GET',
      url: '/api/answers?questionId=question-1',
      query: { questionId: 'question-1' },
      headers: {},
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 200,
        data: [],
      })
    );
  });
});

describe('Answers API - Create (POST)', () => {
  let mockReq: Partial<VercelRequest>;
  let mockRes: Partial<VercelResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let setHeaderMock: ReturnType<typeof vi.fn>;
  let endMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock, end: endMock }));
    setHeaderMock = vi.fn();
    endMock = vi.fn();

    mockRes = {
      json: jsonMock as any,
      status: statusMock as any,
      setHeader: setHeaderMock as any,
      end: endMock as any,
    };
  });

  it('should reject creation without authentication (Req 3.2)', async () => {
    mockGetUserFromToken.mockReturnValue(null);

    mockReq = {
      method: 'POST',
      url: '/api/answers',
      query: {},
      body: {
        questionId: 'question-1',
        content: 'Test answer'
      },
      headers: {},
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 401,
        message: expect.stringContaining('未登录'),
      })
    );
  });

  it('should reject creation with missing questionId (Req 3.3)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser);

    mockReq = {
      method: 'POST',
      url: '/api/answers',
      query: {},
      body: {
        content: 'Test answer'
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: expect.stringContaining('questionId 为必填项'),
      })
    );
  });

  it('should reject creation with empty content (Req 3.3)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser);

    mockReq = {
      method: 'POST',
      url: '/api/answers',
      query: {},
      body: {
        questionId: 'question-1',
        content: ''
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: expect.stringContaining('回答内容为必填项'),
      })
    );
  });

  it('should reject creation with whitespace-only content (Req 3.3)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser);

    mockReq = {
      method: 'POST',
      url: '/api/answers',
      query: {},
      body: {
        questionId: 'question-1',
        content: '   '
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: expect.stringContaining('回答内容为必填项'),
      })
    );
  });

  it('should return 404 when question does not exist (Req 3.3)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser);
    mockQuestionFindUnique.mockResolvedValue(null);

    mockReq = {
      method: 'POST',
      url: '/api/answers',
      query: {},
      body: {
        questionId: 'nonexistent',
        content: 'Test answer'
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 404,
        message: expect.stringContaining('问题不存在'),
      })
    );
  });

  it('should create answer with valid content (Req 3.4, 3.5)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser);
    mockQuestionFindUnique.mockResolvedValue(mockQuestion);
    mockUserFindUnique.mockResolvedValue(mockUser);
    
    const createdAnswer = {
      ...mockAnswer,
      id: 'new-answer-1',
      content: 'This is a valid answer',
      images: [],
    };
    
    mockAnswerCreate.mockResolvedValue(createdAnswer);

    mockReq = {
      method: 'POST',
      url: '/api/answers',
      query: {},
      body: {
        questionId: 'question-1',
        content: 'This is a valid answer'
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(mockAnswerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          questionId: 'question-1',
          content: 'This is a valid answer',
          images: [],
          authorId: mockUser.id,
          authorName: mockUser.nickname,
          authorAvatar: mockUser.avatar,
        }),
      })
    );

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 201,
        data: expect.objectContaining({
          id: 'new-answer-1',
          questionId: 'question-1',
          content: 'This is a valid answer',
          authorId: mockUser.id,
          authorName: mockUser.nickname,
        }),
      })
    );
  });

  it('should create answer with images (Req 3.4)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser);
    mockQuestionFindUnique.mockResolvedValue(mockQuestion);
    mockUserFindUnique.mockResolvedValue(mockUser);
    
    const createdAnswer = {
      ...mockAnswer,
      id: 'new-answer-2',
      content: 'Answer with images',
      images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
    };
    
    mockAnswerCreate.mockResolvedValue(createdAnswer);

    mockReq = {
      method: 'POST',
      url: '/api/answers',
      query: {},
      body: {
        questionId: 'question-1',
        content: 'Answer with images',
        images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg']
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(mockAnswerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
        }),
      })
    );

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 201,
        data: expect.objectContaining({
          images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
        }),
      })
    );
  });

  it('should trim whitespace from content', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser);
    mockQuestionFindUnique.mockResolvedValue(mockQuestion);
    mockUserFindUnique.mockResolvedValue(mockUser);
    
    const createdAnswer = {
      ...mockAnswer,
      id: 'new-answer-3',
      content: 'Trimmed content',
      images: [],
    };
    
    mockAnswerCreate.mockResolvedValue(createdAnswer);

    mockReq = {
      method: 'POST',
      url: '/api/answers',
      query: {},
      body: {
        questionId: 'question-1',
        content: '  Trimmed content  '
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(mockAnswerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: 'Trimmed content',
        }),
      })
    );
  });
});

describe('Answers API - Method Not Allowed', () => {
  let mockReq: Partial<VercelRequest>;
  let mockRes: Partial<VercelResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let setHeaderMock: ReturnType<typeof vi.fn>;
  let endMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock, end: endMock }));
    setHeaderMock = vi.fn();
    endMock = vi.fn();

    mockRes = {
      json: jsonMock as any,
      status: statusMock as any,
      setHeader: setHeaderMock as any,
      end: endMock as any,
    };
  });

  it('should return 405 for unsupported methods', async () => {
    mockReq = {
      method: 'DELETE',
      url: '/api/answers',
      query: {},
      headers: {},
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(405);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 405,
        message: expect.stringContaining('方法不允许'),
      })
    );
  });

  it('should handle OPTIONS request for CORS', async () => {
    mockReq = {
      method: 'OPTIONS',
      url: '/api/answers',
      query: {},
      headers: {},
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(endMock).toHaveBeenCalled();
  });
});
