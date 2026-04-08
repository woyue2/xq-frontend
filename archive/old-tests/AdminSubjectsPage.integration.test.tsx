/**
 * [POS] src/test/AdminSubjectsPage.integration.test.tsx
 *   所属：test 层 | 角色：AdminSubjectsPage 集成测试
 *   兄弟：AdminSubjectsPage.test.tsx
 *
 * [INPUT]
 *   - @testing-library/react        → render / screen / waitFor / fireEvent
 *   - vitest                        → describe / it / expect / vi / beforeEach
 *   - @/pages/admin/AdminSubjectsPage → AdminSubjectsPage
 *
 * [OUTPUT]
 *   - AdminSubjectsPage 集成测试套件
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminSubjectsPage } from '@/pages/admin/AdminSubjectsPage';

// Mock fetch
global.fetch = vi.fn();

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('AdminSubjectsPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <AdminSubjectsPage />
      </BrowserRouter>
    );
  };

  it('loads subjects and allows selection to show topics', async () => {
    // Mock subjects API response
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({
        code: 200,
        data: [
          {
            id: 1,
            key: 'math',
            name: '数学',
            order: 1,
            enabled: true,
            description: '数学科目',
          },
          {
            id: 2,
            key: 'chinese',
            name: '语文',
            order: 2,
            enabled: true,
            description: '语文科目',
          },
        ],
      }),
    });

    renderComponent();

    // Wait for subjects to load
    await waitFor(() => {
      expect(screen.getByText('数学')).toBeInTheDocument();
      expect(screen.getByText('语文')).toBeInTheDocument();
    });

    // Initially, no subject is selected, so topics should show "请先选择一个科目"
    expect(screen.getByText('请先选择一个科目')).toBeInTheDocument();

    // Mock topics API response for math
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({
        code: 200,
        data: [
          {
            id: 1,
            subjectKey: 'math',
            value: 'algebra',
            label: '代数',
            order: 1,
            enabled: true,
          },
          {
            id: 2,
            subjectKey: 'math',
            value: 'geometry',
            label: '几何',
            order: 2,
            enabled: true,
          },
        ],
      }),
    });

    // Click on math subject
    const mathSubject = screen.getByText('数学');
    fireEvent.click(mathSubject);

    // Wait for topics to load
    await waitFor(() => {
      expect(screen.getByText('代数')).toBeInTheDocument();
      expect(screen.getByText('几何')).toBeInTheDocument();
    });

    // Verify the "请先选择一个科目" message is gone
    expect(screen.queryByText('请先选择一个科目')).not.toBeInTheDocument();
  });

  it('displays proper layout with both managers visible', async () => {
    // Mock subjects API response
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({
        code: 200,
        data: [],
      }),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('科目管理')).toBeInTheDocument();
      expect(screen.getByText('考点管理')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    renderComponent();

    // The page should still render even if API fails
    expect(screen.getByText('科目和考点管理')).toBeInTheDocument();
  });
});
