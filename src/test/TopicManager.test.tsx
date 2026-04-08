/**
 * Unit tests for TopicManager component
 * Tests topic listing, creation, editing, and deletion functionality
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TopicManager } from '@/components/TopicManager';
import type { TopicDTO } from '@/types/dto';

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

// Mock error handler
vi.mock('@/lib/error-handler', () => ({
  handleApiError: vi.fn(),
}));

describe('TopicManager', () => {
  const mockTopics: TopicDTO[] = [
    {
      id: '1',
      subjectKey: 'math',
      value: 'algebra',
      label: '代数',
      order: 1,
      enabled: true,
    },
    {
      id: '2',
      subjectKey: 'math',
      value: 'geometry',
      label: '几何',
      order: 2,
      enabled: true,
    },
    {
      id: '3',
      subjectKey: 'math',
      value: 'calculus',
      label: '微积分',
      order: 3,
      enabled: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should show prompt when no subject is selected', () => {
      render(<TopicManager subjectKey="" />);
      expect(screen.getByText('请先选择一个科目')).toBeInTheDocument();
    });

    it('should show loading state while fetching topics', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      render(<TopicManager subjectKey="math" />);
      expect(screen.getByText('加载中...')).toBeInTheDocument();
    });
  });

  describe('Topic List Display', () => {
    it('should display topics for selected subject', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockTopics }),
      });

      render(<TopicManager subjectKey="math" />);

      await waitFor(() => {
        expect(screen.getByText('代数')).toBeInTheDocument();
        expect(screen.getByText('几何')).toBeInTheDocument();
        expect(screen.getByText('微积分')).toBeInTheDocument();
      });
    });

    it('should display topic details correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ code: 200, data: [mockTopics[0]] }),
      });

      render(<TopicManager subjectKey="math" />);

      await waitFor(() => {
        expect(screen.getByText('代数')).toBeInTheDocument();
        expect(screen.getByText('值: algebra')).toBeInTheDocument();
        expect(screen.getByText('排序: 1')).toBeInTheDocument();
        expect(screen.getByText('启用')).toBeInTheDocument();
      });
    });

    it('should show disabled badge for disabled topics', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ code: 200, data: [mockTopics[2]] }),
      });

      render(<TopicManager subjectKey="math" />);

      await waitFor(() => {
        expect(screen.getByText('微积分')).toBeInTheDocument();
        expect(screen.getByText('禁用')).toBeInTheDocument();
      });
    });

    it('should show empty state when no topics exist', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ code: 200, data: [] }),
      });

      render(<TopicManager subjectKey="math" />);

      await waitFor(() => {
        expect(
          screen.getByText('暂无考点，点击"添加考点"创建第一个考点')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Topic Creation', () => {
    it('should show create button', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockTopics }),
      });

      render(<TopicManager subjectKey="math" />);

      await waitFor(() => {
        expect(screen.getByText('添加考点')).toBeInTheDocument();
      });
    });

    it('should open create form when button clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockTopics }),
      });

      render(<TopicManager subjectKey="math" />);

      await waitFor(() => {
        expect(screen.getByText('添加考点')).toBeInTheDocument();
      });

      const createButton = screen.getByText('添加考点');
      fireEvent.click(createButton);

      // Check that the form dialog opens
      await waitFor(() => {
        expect(screen.getByText('创建考点')).toBeInTheDocument();
      });
    });
  });

  describe('Topic Editing', () => {
    it('should show edit button for each topic', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ code: 200, data: [mockTopics[0]] }),
      });

      render(<TopicManager subjectKey="math" />);

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: '' });
        expect(editButtons.length).toBeGreaterThan(0);
      });
    });

    it('should open edit form when edit button clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ code: 200, data: [mockTopics[0]] }),
      });

      render(<TopicManager subjectKey="math" />);

      await waitFor(() => {
        expect(screen.getByText('代数')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: '' });
      const editButton = editButtons.find((btn) =>
        btn.querySelector('svg')?.classList.contains('lucide-edit')
      );

      if (editButton) {
        fireEvent.click(editButton);
        
        // Check that the form dialog opens in edit mode
        await waitFor(() => {
          expect(screen.getByText('编辑考点')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Topic Deletion', () => {
    it('should show delete confirmation dialog', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ code: 200, data: [mockTopics[0]] }),
      });

      render(<TopicManager subjectKey="math" />);

      await waitFor(() => {
        expect(screen.getByText('代数')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const deleteButton = deleteButtons.find((btn) =>
        btn.querySelector('svg')?.classList.contains('lucide-trash-2')
      );

      if (deleteButton) {
        fireEvent.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByText('确认删除')).toBeInTheDocument();
          expect(
            screen.getByText(/确定要删除考点「代数」吗/)
          ).toBeInTheDocument();
        });
      }
    });

    it('should delete topic when confirmed', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: async () => ({ code: 200, data: mockTopics }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ code: 200, data: { message: '删除成功' } }),
        });

      render(<TopicManager subjectKey="math" />);

      await waitFor(() => {
        expect(screen.getByText('代数')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const deleteButton = deleteButtons.find((btn) =>
        btn.querySelector('svg')?.classList.contains('lucide-trash-2')
      );

      if (deleteButton) {
        fireEvent.click(deleteButton);

        await waitFor(() => {
          expect(screen.getByText('确认删除')).toBeInTheDocument();
        });

        const confirmButton = screen.getByRole('button', { name: '删除' });
        fireEvent.click(confirmButton);

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/subjects?topicId=1',
            expect.objectContaining({
              method: 'DELETE',
            })
          );
        });
      }
    });

    it('should show warning for enabled topics', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ code: 200, data: [mockTopics[0]] }),
      });

      render(<TopicManager subjectKey="math" />);

      await waitFor(() => {
        expect(screen.getByText('代数')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const deleteButton = deleteButtons.find((btn) =>
        btn.querySelector('svg')?.classList.contains('lucide-trash-2')
      );

      if (deleteButton) {
        fireEvent.click(deleteButton);

        await waitFor(() => {
          expect(
            screen.getByText('注意：该考点当前处于启用状态。')
          ).toBeInTheDocument();
        });
      }
    });
  });

  describe('API Integration', () => {
    it('should fetch topics with correct API call', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ code: 200, data: mockTopics }),
      });

      render(<TopicManager subjectKey="math" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/subjects?key=math&topics=1',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer mock-token',
            }),
          })
        );
      });
    });

    it('should reload topics when subject changes', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: async () => ({ code: 200, data: mockTopics }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ code: 200, data: [] }),
        });

      const { rerender } = render(<TopicManager subjectKey="math" />);

      await waitFor(() => {
        expect(screen.getByText('代数')).toBeInTheDocument();
      });

      rerender(<TopicManager subjectKey="physics" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/subjects?key=physics&topics=1',
          expect.any(Object)
        );
      });
    });
  });
});
