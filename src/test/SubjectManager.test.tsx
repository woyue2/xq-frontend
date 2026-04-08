/**
 * SubjectManager 组件测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SubjectManager } from '@/components/SubjectManager';
import type { SubjectDTO } from '@/types/dto';

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

describe('SubjectManager', () => {
  const mockSubjects: SubjectDTO[] = [
    {
      id: '1',
      key: 'math',
      name: '数学',
      order: 1,
      enabled: true,
      description: '数学科目',
    },
    {
      id: '2',
      key: 'chinese',
      name: '语文',
      order: 2,
      enabled: false,
      description: '语文科目',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<SubjectManager />);
    
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('should load and display subjects', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        code: 200,
        data: mockSubjects,
      }),
    });

    render(<SubjectManager />);

    await waitFor(() => {
      expect(screen.getByText('数学')).toBeInTheDocument();
      expect(screen.getByText('语文')).toBeInTheDocument();
    });

    // Check badges
    expect(screen.getByText('启用')).toBeInTheDocument();
    expect(screen.getByText('禁用')).toBeInTheDocument();

    // Check descriptions
    expect(screen.getByText('数学科目')).toBeInTheDocument();
    expect(screen.getByText('语文科目')).toBeInTheDocument();
  });

  it('should display empty state when no subjects', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        code: 200,
        data: [],
      }),
    });

    render(<SubjectManager />);

    await waitFor(() => {
      expect(screen.getByText(/暂无科目/)).toBeInTheDocument();
    });
  });

  it('should call onSubjectSelect when subject is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        code: 200,
        data: mockSubjects,
      }),
    });

    const onSubjectSelect = vi.fn();
    render(<SubjectManager onSubjectSelect={onSubjectSelect} />);

    await waitFor(() => {
      expect(screen.getByText('数学')).toBeInTheDocument();
    });

    // Click on subject
    fireEvent.click(screen.getByText('数学'));

    expect(onSubjectSelect).toHaveBeenCalledWith('math');
  });

  it('should highlight selected subject', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        code: 200,
        data: mockSubjects,
      }),
    });

    render(<SubjectManager />);

    await waitFor(() => {
      expect(screen.getByText('数学')).toBeInTheDocument();
    });

    // Find the subject container (the div with flex items-center justify-between)
    const mathSubjectContainer = screen.getByText('数学').closest('.flex.items-center.justify-between');
    
    // Click to select
    if (mathSubjectContainer) {
      fireEvent.click(mathSubjectContainer);

      // Check if selected (has blue background class)
      await waitFor(() => {
        expect(mathSubjectContainer).toHaveClass('bg-blue-50');
      });
    }
  });

  it('should open delete dialog when delete button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        code: 200,
        data: mockSubjects,
      }),
    });

    render(<SubjectManager />);

    await waitFor(() => {
      expect(screen.getByText('数学')).toBeInTheDocument();
    });

    // Find and click delete button (Trash2 icon)
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-trash-2')
    );
    
    if (deleteButton) {
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument();
      });
    }
  });

  it('should delete subject when confirmed', async () => {
    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({
          code: 200,
          data: mockSubjects,
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          code: 200,
          data: { message: '删除成功' },
        }),
      });

    render(<SubjectManager />);

    await waitFor(() => {
      expect(screen.getByText('数学')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-trash-2')
    );
    
    if (deleteButton) {
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument();
      });

      // Click confirm
      const confirmButton = screen.getByText('删除');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/subjects?id='),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    }
  });

  it('should sort subjects by order', async () => {
    const unsortedSubjects = [
      { ...mockSubjects[1], order: 3 },
      { ...mockSubjects[0], order: 1 },
    ];

    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        code: 200,
        data: unsortedSubjects,
      }),
    });

    render(<SubjectManager />);

    await waitFor(() => {
      // Get all subject name spans (font-medium class)
      const subjectElements = screen.getAllByText(/^(数学|语文)$/);
      // Filter to get only the main subject names (not descriptions)
      const subjectNames = subjectElements.filter(el => 
        el.classList.contains('font-medium')
      );
      
      expect(subjectNames[0]).toHaveTextContent('数学'); // order: 1
      expect(subjectNames[1]).toHaveTextContent('语文'); // order: 3
    });
  });

  it('should include authorization header in requests', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        code: 200,
        data: mockSubjects,
      }),
    });

    render(<SubjectManager />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/subjects',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });
  });
});
