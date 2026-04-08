/**
 * Unit tests for QuestionDetailPage component
 * Tests the simplified question detail page implementation
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import { QuestionDetailPage } from '@/pages/QuestionDetailPage';
import type { QuestionDTO, AnswerDTO, CommentDTO } from '@/types/dto';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

const mockQuestion: QuestionDTO = {
  id: 'q1',
  title: '这道数学题怎么解？',
  content: '求解方程 x^2 + 2x + 1 = 0',
  subject: 'math',
  tags: ['algebra', 'equations'],
  images: ['https://example.com/image1.jpg'],
  authorId: 'user1',
  authorName: '张老师',
  authorAvatar: 'https://example.com/avatar1.jpg',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  answerCount: 2,
};

const mockAnswers: AnswerDTO[] = [
  {
    id: 'a1',
    questionId: 'q1',
    content: '这是一个完全平方公式，可以分解为 (x+1)^2 = 0',
    images: ['https://example.com/answer1.jpg'],
    authorId: 'teacher1',
    authorName: '李老师',
    authorAvatar: 'https://example.com/avatar2.jpg',
    createdAt: '2024-01-15T11:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z',
  },
];

const mockComments: CommentDTO[] = [
  {
    id: 'c1',
    questionId: 'q1',
    content: '这个解法很清楚',
    image: 'https://example.com/comment1.jpg',
    authorId: 'user2',
    authorName: '王同学',
    authorAvatar: 'https://example.com/avatar3.jpg',
    createdAt: '2024-01-15T12:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z',
  },
];

describe('QuestionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should display loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <MemoryRouter initialEntries={['/question/q1']}>
        <Routes>
          <Route path="/question/:id" element={<QuestionDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('问题详情')).toBeInTheDocument();
    // Loading spinner should be visible
    const loader = document.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
  });

  it('should fetch and display question details', async () => {
    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockQuestion, timestamp: Date.now() }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockAnswers, timestamp: Date.now() }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockComments, timestamp: Date.now() }),
      });

    render(
      <MemoryRouter initialEntries={['/question/q1']}>
        <Routes>
          <Route path="/question/:id" element={<QuestionDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('这道数学题怎么解？')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/questions?id=q1');
    expect(mockFetch).toHaveBeenCalledWith('/api/answers?questionId=q1');
    expect(mockFetch).toHaveBeenCalledWith('/api/comments?questionId=q1');
  });

  it('should display error when question not found', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ code: 404, message: '问题不存在', timestamp: Date.now() }),
    });

    render(
      <MemoryRouter initialEntries={['/question/q1']}>
        <Routes>
          <Route path="/question/:id" element={<QuestionDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('问题不存在')).toBeInTheDocument();
    });

    expect(screen.getByText('返回首页')).toBeInTheDocument();
  });

  it('should display error when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter initialEntries={['/question/q1']}>
        <Routes>
          <Route path="/question/:id" element={<QuestionDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('加载问题失败')).toBeInTheDocument();
    });
  });

  it('should show action buttons when user is logged in', async () => {
    mockLocalStorage.getItem.mockReturnValue('fake-token');

    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockQuestion, timestamp: Date.now() }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockAnswers, timestamp: Date.now() }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockComments, timestamp: Date.now() }),
      });

    render(
      <MemoryRouter initialEntries={['/question/q1']}>
        <Routes>
          <Route path="/question/:id" element={<QuestionDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('这道数学题怎么解？')).toBeInTheDocument();
    });

    // Action buttons should be visible for logged-in users
    expect(screen.getByText('回答')).toBeInTheDocument();
    expect(screen.getByText('评论')).toBeInTheDocument();
  });

  it('should not show action buttons when user is not logged in', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockQuestion, timestamp: Date.now() }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockAnswers, timestamp: Date.now() }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockComments, timestamp: Date.now() }),
      });

    render(
      <MemoryRouter initialEntries={['/question/q1']}>
        <Routes>
          <Route path="/question/:id" element={<QuestionDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('这道数学题怎么解？')).toBeInTheDocument();
    });

    // Action buttons should not be visible for guests
    expect(screen.queryByText('回答')).not.toBeInTheDocument();
    expect(screen.queryByText('评论')).not.toBeInTheDocument();
  });

  it('should display answers and comments', async () => {
    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockQuestion, timestamp: Date.now() }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockAnswers, timestamp: Date.now() }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockComments, timestamp: Date.now() }),
      });

    render(
      <MemoryRouter initialEntries={['/question/q1']}>
        <Routes>
          <Route path="/question/:id" element={<QuestionDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('这道数学题怎么解？')).toBeInTheDocument();
    });

    // Check if answers are displayed
    await waitFor(() => {
      expect(screen.getByText(/这是一个完全平方公式/)).toBeInTheDocument();
    });

    // Check if comments are displayed
    await waitFor(() => {
      expect(screen.getByText('这个解法很清楚')).toBeInTheDocument();
    });
  });
});
