/**
 * Unit tests for HomePage component
 * Tests filtering, pagination, and question display
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock IntersectionObserver properly
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

global.IntersectionObserver = MockIntersectionObserver as any;

const mockQuestionsResponse = {
  code: 200,
  data: {
    items: [
      {
        id: '1',
        title: '数学问题1',
        content: '这是一个数学问题',
        subject: 'math',
        tags: ['algebra'],
        images: [],
        authorId: 'user1',
        authorName: '张三',
        authorAvatar: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        answerCount: 2,
      },
      {
        id: '2',
        title: '语文问题1',
        content: '这是一个语文问题',
        subject: 'chinese',
        tags: ['reading'],
        images: [],
        authorId: 'user2',
        authorName: '李四',
        authorAvatar: null,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        answerCount: 1,
      },
    ],
    total: 2,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  },
  timestamp: Date.now(),
};

const renderHomePage = () => {
  return render(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>
  );
};

describe('HomePage', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and display questions on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => mockQuestionsResponse,
    });

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('数学问题1')).toBeInTheDocument();
      expect(screen.getByText('语文问题1')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/questions?page=1&pageSize=10')
    );
  });

  it('should display empty state when no questions', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        code: 200,
        data: {
          items: [],
          total: 0,
          page: 1,
          pageSize: 10,
          totalPages: 0,
        },
      }),
    });

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('暂无相关提问')).toBeInTheDocument();
    });
  });

  it('should call API with correct pagination parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => mockQuestionsResponse,
    });

    renderHomePage();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=10')
      );
    });
  });

  it('should show "no more" message when all pages loaded', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => mockQuestionsResponse,
    });

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('没有更多了')).toBeInTheDocument();
    });
  });

  it('should handle fetch errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    renderHomePage();

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch questions:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('should display question cards with correct data', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => mockQuestionsResponse,
    });

    renderHomePage();

    await waitFor(() => {
      // Check that question titles are displayed
      expect(screen.getByText('数学问题1')).toBeInTheDocument();
      expect(screen.getByText('语文问题1')).toBeInTheDocument();
      
      // Check that author names are displayed
      expect(screen.getByText('张三')).toBeInTheDocument();
      expect(screen.getByText('李四')).toBeInTheDocument();
    });
  });
});
