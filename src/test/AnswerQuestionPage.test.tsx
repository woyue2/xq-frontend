/**
 * Unit tests for AnswerQuestionPage component
 * 
 * Tests cover:
 * - Component rendering
 * - Form validation (content required)
 * - Navigation and exit confirmation
 * - Answer submission
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AnswerQuestionPage } from '@/pages/AnswerQuestionPage';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

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
});

describe('AnswerQuestionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
    
    // Mock question API call
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 200,
        data: {
          id: 'q1',
          title: '这是一个测试问题',
          content: '问题详情',
          subject: 'math',
          tags: [],
          images: [],
          authorId: 'u1',
          authorName: '测试用户',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      }),
    });
  });

  describe('Rendering', () => {
    it('should render answer page with question context', async () => {
      render(
        <MemoryRouter initialEntries={['/answer/q1']}>
          <Routes>
            <Route path="/answer/:id" element={<AnswerQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('回答问题')).toBeInTheDocument();
      });
      
      expect(screen.getByText('回答以下问题：')).toBeInTheDocument();
      expect(screen.getByText('这是一个测试问题')).toBeInTheDocument();
    });

    it('should render content textarea', async () => {
      render(
        <MemoryRouter initialEntries={['/answer/q1']}>
          <Routes>
            <Route path="/answer/:id" element={<AnswerQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/回答内容/)).toBeInTheDocument();
      });
      
      const textarea = screen.getByLabelText(/回答内容/) as HTMLTextAreaElement;
      expect(textarea).toHaveValue('');
      expect(textarea.placeholder).toBe('请输入你的回答');
    });

    it('should render ImageUploader component', async () => {
      render(
        <MemoryRouter initialEntries={['/answer/q1']}>
          <Routes>
            <Route path="/answer/:id" element={<AnswerQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/上传图片（可选）/)).toBeInTheDocument();
      });
    });

    it('should have submit button', async () => {
      render(
        <MemoryRouter initialEntries={['/answer/q1']}>
          <Routes>
            <Route path="/answer/:id" element={<AnswerQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /提交/ });
        expect(submitButton).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should disable submit button when content is empty', async () => {
      render(
        <MemoryRouter initialEntries={['/answer/q1']}>
          <Routes>
            <Route path="/answer/:id" element={<AnswerQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /提交/ });
        expect(submitButton).toBeDisabled();
      });
    });

    it('should enable submit button when content is provided', async () => {
      render(
        <MemoryRouter initialEntries={['/answer/q1']}>
          <Routes>
            <Route path="/answer/:id" element={<AnswerQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/回答内容/)).toBeInTheDocument();
      });

      const textarea = screen.getByLabelText(/回答内容/);
      fireEvent.change(textarea, { target: { value: '这是我的回答' } });

      const submitButton = screen.getByRole('button', { name: /提交/ });
      expect(submitButton).not.toBeDisabled();
    });

    it('should show error when submitting empty content', async () => {
      const { toast } = await import('sonner');
      
      render(
        <MemoryRouter initialEntries={['/answer/q1']}>
          <Routes>
            <Route path="/answer/:id" element={<AnswerQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/回答内容/)).toBeInTheDocument();
      });

      // The submit button should be disabled when content is empty
      const submitButton = screen.getByRole('button', { name: /提交/ });
      expect(submitButton).toBeDisabled();
      
      // Add content to enable button
      const textarea = screen.getByLabelText(/回答内容/);
      fireEvent.change(textarea, { target: { value: 'test' } });
      
      // Now remove content (whitespace only)
      fireEvent.change(textarea, { target: { value: '   ' } });
      
      // Button should be disabled again
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Navigation', () => {
    it('should show exit confirmation when form has data', async () => {
      render(
        <MemoryRouter initialEntries={['/answer/q1']}>
          <Routes>
            <Route path="/answer/:id" element={<AnswerQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/回答内容/)).toBeInTheDocument();
      });

      const textarea = screen.getByLabelText(/回答内容/);
      fireEvent.change(textarea, { target: { value: '一些回答内容' } });

      const backButton = screen.getAllByRole('button')[0]; // First button is back button
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('是否放弃回答？')).toBeInTheDocument();
      });
    });

    it('should navigate back without confirmation when form is empty', async () => {
      render(
        <MemoryRouter initialEntries={['/answer/q1']}>
          <Routes>
            <Route path="/answer/:id" element={<AnswerQuestionPage />} />
            <Route path="/question/:id" element={<div>Question Detail</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('回答问题')).toBeInTheDocument();
      });

      const backButton = screen.getAllByRole('button')[0]; // First button is back button
      fireEvent.click(backButton);

      // Should not show confirmation dialog
      expect(screen.queryByText('是否放弃回答？')).not.toBeInTheDocument();
    });
  });

  describe('Answer Submission', () => {
    it('should submit answer successfully', async () => {
      const { toast } = await import('sonner');
      
      // Mock successful answer submission
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 200,
          data: {
            id: 'q1',
            title: '这是一个测试问题',
          },
        }),
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 201,
          data: {
            id: 'a1',
            questionId: 'q1',
            content: '这是我的回答',
            images: [],
            authorId: 'u1',
            authorName: '测试用户',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        }),
      });

      render(
        <MemoryRouter initialEntries={['/answer/q1']}>
          <Routes>
            <Route path="/answer/:id" element={<AnswerQuestionPage />} />
            <Route path="/question/:id" element={<div>Question Detail</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/回答内容/)).toBeInTheDocument();
      });

      const textarea = screen.getByLabelText(/回答内容/);
      fireEvent.change(textarea, { target: { value: '这是我的回答' } });

      const submitButton = screen.getByRole('button', { name: /提交/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('回答已提交');
      });
    });

    it('should handle submission error', async () => {
      const { toast } = await import('sonner');
      
      // Mock failed answer submission
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 200,
          data: {
            id: 'q1',
            title: '这是一个测试问题',
          },
        }),
      }).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          code: 400,
          message: '提交失败',
        }),
      });

      render(
        <MemoryRouter initialEntries={['/answer/q1']}>
          <Routes>
            <Route path="/answer/:id" element={<AnswerQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/回答内容/)).toBeInTheDocument();
      });

      const textarea = screen.getByLabelText(/回答内容/);
      fireEvent.change(textarea, { target: { value: '这是我的回答' } });

      const submitButton = screen.getByRole('button', { name: /提交/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('提交失败');
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state while fetching question', async () => {
      // Mock delayed response
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            code: 200,
            data: {
              id: 'q1',
              title: '这是一个测试问题',
            },
          }),
        }), 100))
      );

      render(
        <MemoryRouter initialEntries={['/answer/q1']}>
          <Routes>
            <Route path="/answer/:id" element={<AnswerQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('加载中...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('回答问题')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
});
