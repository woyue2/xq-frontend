/**
 * Unit tests for Comments API
 * Tests Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Create mock instances before importing
const mockCommentFindMany = vi.fn();
const mockCommentCreate = vi.fn();
const mockQuestionFindUnique = vi.fn();
const mockUserFindUnique = vi.fn();
const mockGetUserFromToken = vi.fn();

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrismaInstance = {
    comment: {
      findMany: mockCommentFindMany,
      create: mockCommentCreate,
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
      comment = mockPrismaInstance.comment;
      question = mockPrismaInstance.question;
      user = mockPrismaInstance.user;
    },
  };
});

// Mock helpers
vi.mock('../../api/_helpers', () => ({
  prisma: {
    comment: {
      findMany: mockCommentFindMany,
      create: mockCommentCreate,
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
const { default: handler } = await import('../../api/comments');

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

const mockComment = {
  id: 'comment-1',
  questionId: 'question-1',
  content: 'This is a test comment',
  image: 'https://example.com/image1.jpg',
  authorId: 'user-1',
  authorName: 'Test Teacher',
  authorAvatar: 'https://example.com/avatar1.jpg',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('Comments API - List (GET)', () => {
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

  it('should return 400 when questionId is missing (Req 4.1)', async () => {
    mockReq = {
      method: 'GET',
      url: '/api/comments',
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

  it('should return 404 when question does not exist (Req 4.1)', async () => {
    mockQuestionFindUnique.mockResolvedValue(null);

    mockReq = {
      method: 'GET',
      url: '/api/comments?questionId=nonexistent',
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

  it('should return comments list without authentication (Req 4.1)', async () => {
    mockQuestionFindUnique.mockResolvedValue(mockQuestion);
    const mockComments = [
      mockComment,
      { ...mockComment, id: 'comment-2', content: 'Another comment', image: null },
    ];
    mockCommentFindMany.mockResolvedValue(mockComments);

    mockReq = {
      method: 'GET',
      url: '/api/comments?questionId=question-1',
      query: { questionId: 'question-1' },
      headers: {},
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(mockCommentFindMany).toHaveBeenCalledWith(
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
            id: 'comment-1',
            questionId: 'question-1',
            content: 'This is a test comment',
            image: 'https://example.com/image1.jpg',
          }),
          expect.objectContaining({
            id: 'comment-2',
            content: 'Another comment',
          }),
        ]),
      })
    );
  });

  it('should return empty array when no comments exist', async () => {
    mockQuestionFindUnique.mockResolvedValue(mockQuestion);
    mockCommentFindMany.mockResolvedValue([]);

    mockReq = {
      method: 'GET',
      url: '/api/comments?questionId=question-1',
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

describe('Comments API - Create (POST)', () => {
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

  it('should reject creation without authentication (Req 4.2)', async () => {
    mockGetUserFromToken.mockReturnValue(null);

    mockReq = {
      method: 'POST',
      url: '/api/comments',
      query: {},
      body: {
        questionId: 'question-1',
        content: 'Test comment'
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

  it('should reject creation with missing questionId (Req 4.3)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser);

    mockReq = {
      method: 'POST',
      url: '/api/comments',
      query: {},
      body: {
        content: 'Test comment'
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

  it('should reject creation with empty content (Req 4.3)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser);

    mockReq = {
      method: 'POST',
      url: '/api/comments',
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
        message: expect.stringContaining('评论内容为必填项'),
      })
    );
  });

  it('should reject creation with whitespace-only content (Req 4.3)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser);

    mockReq = {
      method: 'POST',
      url: '/api/comments',
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
        message: expect.stringContaining('评论内容为必填项'),
      })
    );
  });

  it('should return 404 when question does not exist (Req 4.3)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser);
    mockQuestionFindUnique.mockResolvedValue(null);

    mockReq = {
      method: 'POST',
      url: '/api/comments',
      query: {},
      body: {
        questionId: 'nonexistent',
        content: 'Test comment'
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

  it('should create comment with valid content (Req 4.4, 4.5)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser);
    mockQuestionFindUnique.mockResolvedValue(mockQuestion);
    mockUserFindUnique.mockResolvedValue(mockUser);
    
    const createdComment = {
      ...mockComment,
      id: 'new-comment-1',
      content: 'This is a valid comment',
      image: null,
    };
    
    mockCommentCreate.mockResolvedValue(createdComment);

    mockReq = {
      method: 'POST',
      url: '/api/comments',
      query: {},
      body: {
        questionId: 'question-1',
        content: 'This is a valid comment'
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(mockCommentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          questionId: 'question-1',
          content: 'This is a valid comment',
          image: null,
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
          id: 'new-comment-1',
          questionId: 'question-1',
          content: 'This is a valid comment',
          authorId: mockUser.id,
          authorName: mockUser.nickname,
        }),
      })
    );
  });

  it('should create comment with image URL (Req 4.4)', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser);
    mockQuestionFindUnique.mockResolvedValue(mockQuestion);
    mockUserFindUnique.mockResolvedValue(mockUser);
    
    const createdComment = {
      ...mockComment,
      id: 'new-comment-2',
      content: 'Comment with image',
      image: 'https://example.com/img1.jpg',
    };
    
    mockCommentCreate.mockResolvedValue(createdComment);

    mockReq = {
      method: 'POST',
      url: '/api/comments',
      query: {},
      body: {
        questionId: 'question-1',
        content: 'Comment with image',
        image: 'https://example.com/img1.jpg'
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(mockCommentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          image: 'https://example.com/img1.jpg',
        }),
      })
    );

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 201,
        data: expect.objectContaining({
          image: 'https://example.com/img1.jpg',
        }),
      })
    );
  });

  it('should trim whitespace from content', async () => {
    mockGetUserFromToken.mockReturnValue(mockUser);
    mockQuestionFindUnique.mockResolvedValue(mockQuestion);
    mockUserFindUnique.mockResolvedValue(mockUser);
    
    const createdComment = {
      ...mockComment,
      id: 'new-comment-3',
      content: 'Trimmed content',
      image: null,
    };
    
    mockCommentCreate.mockResolvedValue(createdComment);

    mockReq = {
      method: 'POST',
      url: '/api/comments',
      query: {},
      body: {
        questionId: 'question-1',
        content: '  Trimmed content  '
      },
      headers: { authorization: 'Bearer token' },
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(mockCommentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: 'Trimmed content',
        }),
      })
    );
  });
});

describe('Comments API - Method Not Allowed', () => {
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
      url: '/api/comments',
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
      url: '/api/comments',
      query: {},
      headers: {},
    };

    await handler(mockReq as VercelRequest, mockRes as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(endMock).toHaveBeenCalled();
  });
});
