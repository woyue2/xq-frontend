/**
 * Unit tests for CreateQuestionPage component
 * 
 * Tests cover:
 * - Component rendering in create and edit modes
 * - Form validation (title, content length limits)
 * - Navigation and exit confirmation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CreateQuestionPage } from '@/pages/CreateQuestionPage';

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

describe('CreateQuestionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
    
    // Mock subjects API call for SubjectTopicSelector
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 200,
        data: [
          { id: 's1', key: 'math', name: '数学', order: 1, enabled: true },
          { id: 's2', key: 'chinese', name: '语文', order: 2, enabled: true },
        ],
      }),
    });
  });

  describe('Create Mode', () => {
    it('should render create mode with empty form', async () => {
      render(
        <MemoryRouter initialEntries={['/create']}>
          <Routes>
            <Route path="/create" element={<CreateQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('创建问题')).toBeInTheDocument();
      });
      
      expect(screen.getByLabelText(/问题标题/)).toHaveValue('');
      expect(screen.getByLabelText(/问题详情/)).toHaveValue('');
    });

    it('should enforce title max length of 100 characters', async () => {
      render(
        <MemoryRouter initialEntries={['/create']}>
          <Routes>
            <Route path="/create" element={<CreateQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/问题标题/)).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/问题标题/) as HTMLInputElement;
      const longTitle = 'a'.repeat(150);
      
      fireEvent.change(titleInput, { target: { value: longTitle } });

      expect(titleInput.value.length).toBe(100);
      expect(screen.getByText('100/100')).toBeInTheDocument();
    });

    it('should enforce content max length of 500 characters', async () => {
      render(
        <MemoryRouter initialEntries={['/create']}>
          <Routes>
            <Route path="/create" element={<CreateQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/问题详情/)).toBeInTheDocument();
      });

      const contentInput = screen.getByLabelText(/问题详情/) as HTMLTextAreaElement;
      const longContent = 'a'.repeat(600);
      
      fireEvent.change(contentInput, { target: { value: longContent } });

      expect(contentInput.value.length).toBeLessThanOrEqual(500);
    });

    it('should display character counters', async () => {
      render(
        <MemoryRouter initialEntries={['/create']}>
          <Routes>
            <Route path="/create" element={<CreateQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('0/100')).toBeInTheDocument();
        expect(screen.getByText('0/500')).toBeInTheDocument();
      });
    });

    it('should update character counter when typing', async () => {
      render(
        <MemoryRouter initialEntries={['/create']}>
          <Routes>
            <Route path="/create" element={<CreateQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/问题标题/)).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/问题标题/);
      fireEvent.change(titleInput, { target: { value: 'Test Title' } });

      expect(screen.getByText('10/100')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should show edit mode title', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 200,
          data: {
            id: 'q1',
            title: 'Test',
            subject: 'math',
            tags: [],
            images: [],
          },
        }),
      });

      render(
        <MemoryRouter initialEntries={['/edit/q1']}>
          <Routes>
            <Route path="/edit/:id" element={<CreateQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('编辑问题')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should show exit confirmation when form has data', async () => {
      render(
        <MemoryRouter initialEntries={['/create']}>
          <Routes>
            <Route path="/create" element={<CreateQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/问题标题/)).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/问题标题/);
      fireEvent.change(titleInput, { target: { value: 'Some title' } });

      const backButton = screen.getAllByRole('button')[0]; // First button is back button
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('是否放弃编辑？')).toBeInTheDocument();
      });
    });

    it('should navigate back without confirmation when form is empty', async () => {
      render(
        <MemoryRouter initialEntries={['/create']}>
          <Routes>
            <Route path="/create" element={<CreateQuestionPage />} />
            <Route path="/" element={<div>Home Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('创建问题')).toBeInTheDocument();
      });

      const backButton = screen.getAllByRole('button')[0]; // First button is back button
      fireEvent.click(backButton);

      // Should not show confirmation dialog
      expect(screen.queryByText('是否放弃编辑？')).not.toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should render SubjectTopicSelector component', async () => {
      render(
        <MemoryRouter initialEntries={['/create']}>
          <Routes>
            <Route path="/create" element={<CreateQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        // Use getAllByText since there are multiple elements with "科目"
        const subjectLabels = screen.getAllByText(/科目/);
        expect(subjectLabels.length).toBeGreaterThan(0);
        
        expect(screen.getByText(/考点/)).toBeInTheDocument();
      });
    });

    it('should render ImageUploader component', async () => {
      render(
        <MemoryRouter initialEntries={['/create']}>
          <Routes>
            <Route path="/create" element={<CreateQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/上传图片（最多3张）/)).toBeInTheDocument();
      });
    });

    it('should have submit button', async () => {
      render(
        <MemoryRouter initialEntries={['/create']}>
          <Routes>
            <Route path="/create" element={<CreateQuestionPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /提交/ });
        expect(submitButton).toBeInTheDocument();
      });
    });
  });
});
