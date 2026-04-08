/**
 * Unit tests for Questions API
 * Tests Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 7.1, 7.3, 7.5, 7.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Create mock instances before importing
const mockQuestionFindMany = vi.fn();
const mockQuestionFindUnique = vi.fn();
const mockQuestionCreate = vi.fn();
const mockQuestionUpdate = vi.fn();
const mockQuestionCount = vi.fn();
const mockUserFindUnique = vi.fn();
const mockGetUserFromToken = vi.fn();

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrismaInstance = {
    question: {
      findMany: mockQuestionFindMany,
      findUnique: mockQuestionFindUnique,
      create: mockQuestionCreate,
      update: mockQuestionUpdate,
      count: mockQuestionCount,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
  };
  return {
    PrismaClient: class MockPrismaClient {
      question = mockPrismaInstance.question;
      user = mockPrismaInstance.user;
    },
  };
});

// Mock helpers
vi.mock('../../api/_helpers', () => ({
  prisma: {
    question: {
      findMany: mockQuestionFindMany,
      findUnique: mockQuestionFindUnique,
      create: mockQuestionCreate,
      update: mockQuestionUpdate,
      count: mockQuestionCount,
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
const { default: handler } = await import('../../api/questions');

// Test data
const mockUser1 = {
  id: 'user-1',
  phone: '13800000001',
  nickname: 'Test Teacher 1',
  name: 'Teacher One',
  avatar: 'https://example.com/avatar1.jpg',
  role: 'teacher',
};

const mockUser2 = {
  id: 'user-2',
  phone: '13800000002',
  nickname: 'Test Teacher 2',
  role: 'teacher',
};

const mockQuestion = {
  id: 'question-1',
  title: 'Test Question',
  content: 'Test content',
  subject: 'math',
  tags: ['algebra'],
  images: ['https://example.com/image1.jpg'],
  authorId: 'user-1',
  authorName: 'Test Teacher 1',
  authorAvatar: 'https://example.com/avatar1.jpg',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  answerList: [],
};


describe('Questions API - Create (POST)', () => {
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

  it('should reject creation without authentication', async () => {
    mockGetUserFromToken.mockReturnValue(null);

    mockReq = {
      method: 'POST',
      url: '/api/questions',
      query: {},
      body: {
        title: 'Test Question',
        subject: 'math'
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

  it('should reject creation with empty title (Req 2.1)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser1);

    mockReq = {
      method: 'POST',
      url: '/api/questions',
      query: {},
      body: {
        title: '',
        subject: 'math'
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: expect.stringContaining('标题为必填项'),
      })
    );
  });

  it('should reject creation with title > 100 characters (Req 2.1)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser1);

    const longTitle = 'a'.repeat(101);
    mockReq = {
      method: 'POST',
      url: '/api/questions',
      query: {},
      body: {
        title: longTitle,
        subject: 'math'
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: expect.stringContaining('标题最多100字'),
      })
    );
  });

  it('should reject creation with content > 500 characters (Req 2.2)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser1);

    const longContent = 'a'.repeat(501);
    mockReq = {
      method: 'POST',
      url: '/api/questions',
      query: {},
      body: {
        title: 'Test Question',
        content: longContent,
        subject: 'math'
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: expect.stringContaining('内容最多500字'),
      })
    );
  });

  it('should reject creation without subject (Req 2.3)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser1);

    mockReq = {
      method: 'POST',
      url: '/api/questions',
      query: {},
      body: {
        title: 'Test Question'
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: expect.stringContaining('科目为必填项'),
      })
    );
  });

  it('should reject creation with more than 3 images (Req 2.5)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser1);

    mockReq = {
      method: 'POST',
      url: '/api/questions',
      query: {},
      body: {
        title: 'Test Question',
        subject: 'math',
        images: ['url1', 'url2', 'url3', 'url4']
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: expect.stringContaining('最多上传3张图片'),
      })
    );
  });

  it('should create question with valid data (Req 2.6)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser1);
    mockUserFindUnique.mockResolvedValue(mockUser1);
    
    const createdQuestion = {
      ...mockQuestion,
      id: 'new-question-1',
      title: 'Valid Test Question',
      content: 'This is a valid question content',
      tags: ['algebra', 'equations'],
      images: ['https://example.com/image1.jpg'],
    };
    
    mockQuestionCreate.mockResolvedValue(createdQuestion);

    mockReq = {
      method: 'POST',
      url: '/api/questions',
      query: {},
      body: {
        title: 'Valid Test Question',
        content: 'This is a valid question content',
        subject: 'math',
        tags: ['algebra', 'equations'],
        images: ['https://example.com/image1.jpg']
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 201,
        data: expect.objectContaining({
          title: 'Valid Test Question',
          content: 'This is a valid question content',
          subject: 'math',
          tags: ['algebra', 'equations'],
          images: ['https://example.com/image1.jpg'],
          authorId: mockUser1.id,
          authorName: mockUser1.nickname,
        }),
      })
    );
  });
});


describe('Questions API - List (GET)', () => {
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

  it('should return question list without authentication (Req 7.1)', async () => {
    const mockQuestions = [
      { ...mockQuestion, answerList: [] },
      { ...mockQuestion, id: 'question-2', answerList: [] },
    ];
    
    mockQuestionFindMany.mockResolvedValue(mockQuestions);
    mockQuestionCount.mockResolvedValue(2);

    mockReq = {
      method: 'GET',
      url: '/api/questions?page=1&pageSize=10',
      query: { page: '1', pageSize: '10' },
      headers: {},
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 200,
        data: expect.objectContaining({
          items: expect.any(Array),
          total: 2,
          page: 1,
          pageSize: 10,
        }),
      })
    );
  });

  it('should filter by subject (Req 7.3)', async () => {
    const mockQuestions = [
      { ...mockQuestion, subject: 'math', answerList: [] },
    ];
    
    mockQuestionFindMany.mockResolvedValue(mockQuestions);
    mockQuestionCount.mockResolvedValue(1);

    mockReq = {
      method: 'GET',
      url: '/api/questions?subject=math',
      query: { subject: 'math', page: '1', pageSize: '10' },
      headers: {},
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(mockQuestionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          subject: 'math',
        }),
      })
    );
    
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 200,
        data: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ subject: 'math' }),
          ]),
        }),
      })
    );
  });

  it('should filter by topic (Req 7.3)', async () => {
    const mockQuestions = [
      { ...mockQuestion, tags: ['algebra'], answerList: [] },
    ];
    
    mockQuestionFindMany.mockResolvedValue(mockQuestions);
    mockQuestionCount.mockResolvedValue(1);

    mockReq = {
      method: 'GET',
      url: '/api/questions?topic=algebra',
      query: { topic: 'algebra', page: '1', pageSize: '10' },
      headers: {},
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(mockQuestionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tags: { has: 'algebra' },
        }),
      })
    );
  });

  it('should search by title and content (Req 7.6)', async () => {
    const mockQuestions = [
      { ...mockQuestion, title: 'Valid Test Question', answerList: [] },
    ];
    
    mockQuestionFindMany.mockResolvedValue(mockQuestions);
    mockQuestionCount.mockResolvedValue(1);

    mockReq = {
      method: 'GET',
      url: '/api/questions?search=Valid',
      query: { search: 'Valid', page: '1', pageSize: '10' },
      headers: {},
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(mockQuestionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { title: { contains: 'Valid', mode: 'insensitive' } },
            { content: { contains: 'Valid', mode: 'insensitive' } },
          ]),
        }),
      })
    );
  });

  it('should return questions in descending order by createdAt (Req 7.5)', async () => {
    const mockQuestions = [
      { ...mockQuestion, id: 'q1', createdAt: new Date('2024-01-02'), answerList: [] },
      { ...mockQuestion, id: 'q2', createdAt: new Date('2024-01-01'), answerList: [] },
    ];
    
    mockQuestionFindMany.mockResolvedValue(mockQuestions);
    mockQuestionCount.mockResolvedValue(2);

    mockReq = {
      method: 'GET',
      url: '/api/questions?pageSize=20',
      query: { page: '1', pageSize: '20' },
      headers: {},
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(mockQuestionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      })
    );
  });
});


describe('Questions API - Detail (GET)', () => {
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

  it('should return 404 for non-existent question', async () => {
    mockQuestionFindUnique.mockResolvedValue(null);

    mockReq = {
      method: 'GET',
      url: '/api/questions?id=nonexistent',
      query: { id: 'nonexistent' },
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

  it('should return question detail without authentication', async () => {
    mockQuestionFindUnique.mockResolvedValue({ ...mockQuestion, answerList: [] });

    mockReq = {
      method: 'GET',
      url: `/api/questions?id=${mockQuestion.id}`,
      query: { id: mockQuestion.id },
      headers: {},
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 200,
        data: expect.objectContaining({
          id: mockQuestion.id,
          title: mockQuestion.title,
          answerCount: 0,
        }),
      })
    );
  });
});

describe('Questions API - Update (PUT)', () => {
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

  it('should reject update without authentication', async () => {
    mockGetUserFromToken.mockReturnValue(null);

    mockReq = {
      method: 'PUT',
      url: `/api/questions?id=${mockQuestion.id}`,
      query: { id: mockQuestion.id },
      body: {
        title: 'Updated Title'
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

  it('should reject update by non-author (Req 2.7)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser2);
    mockQuestionFindUnique.mockResolvedValue(mockQuestion);

    mockReq = {
      method: 'PUT',
      url: `/api/questions?id=${mockQuestion.id}`,
      query: { id: mockQuestion.id },
      body: {
        title: 'Updated Title'
      },
      headers: { authorization: 'Bearer token2' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 403,
        message: expect.stringContaining('权限不足'),
      })
    );
  });

  it('should reject update with empty title', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser1);
    mockQuestionFindUnique.mockResolvedValue(mockQuestion);

    mockReq = {
      method: 'PUT',
      url: `/api/questions?id=${mockQuestion.id}`,
      query: { id: mockQuestion.id },
      body: {
        title: ''
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: expect.stringContaining('标题为必填项'),
      })
    );
  });

  it('should reject update with title > 100 characters', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser1);
    mockQuestionFindUnique.mockResolvedValue(mockQuestion);

    const longTitle = 'a'.repeat(101);
    mockReq = {
      method: 'PUT',
      url: `/api/questions?id=${mockQuestion.id}`,
      query: { id: mockQuestion.id },
      body: {
        title: longTitle
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: expect.stringContaining('标题最多100字'),
      })
    );
  });

  it('should reject update with content > 500 characters', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser1);
    mockQuestionFindUnique.mockResolvedValue(mockQuestion);

    const longContent = 'a'.repeat(501);
    mockReq = {
      method: 'PUT',
      url: `/api/questions?id=${mockQuestion.id}`,
      query: { id: mockQuestion.id },
      body: {
        content: longContent
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: expect.stringContaining('内容最多500字'),
      })
    );
  });

  it('should reject update with more than 3 images', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser1);
    mockQuestionFindUnique.mockResolvedValue(mockQuestion);

    mockReq = {
      method: 'PUT',
      url: `/api/questions?id=${mockQuestion.id}`,
      query: { id: mockQuestion.id },
      body: {
        images: ['url1', 'url2', 'url3', 'url4']
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: expect.stringContaining('最多上传3张图片'),
      })
    );
  });

  it('should update question with valid data (Req 2.8)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser1);
    mockQuestionFindUnique.mockResolvedValue(mockQuestion);
    
    const updatedQuestion = {
      ...mockQuestion,
      title: 'Updated Test Question',
      content: 'Updated content',
      tags: ['geometry'],
      images: ['https://example.com/new-image.jpg'],
      answerList: [],
    };
    
    mockQuestionUpdate.mockResolvedValue(updatedQuestion);

    mockReq = {
      method: 'PUT',
      url: `/api/questions?id=${mockQuestion.id}`,
      query: { id: mockQuestion.id },
      body: {
        title: 'Updated Test Question',
        content: 'Updated content',
        tags: ['geometry'],
        images: ['https://example.com/new-image.jpg']
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 200,
        data: expect.objectContaining({
          title: 'Updated Test Question',
          content: 'Updated content',
          tags: ['geometry'],
          images: ['https://example.com/new-image.jpg'],
        }),
      })
    );
  });

  it('should return 404 when updating non-existent question', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser1);
    mockQuestionFindUnique.mockResolvedValue(null);

    mockReq = {
      method: 'PUT',
      url: '/api/questions?id=nonexistent',
      query: { id: 'nonexistent' },
      body: {
        title: 'Updated Title'
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
});

