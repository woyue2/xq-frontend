/**
 * [POS] src/test/AdminSubjectsPage.test.tsx
 *   所属：test 层 | 角色：AdminSubjectsPage 组件单元测试
 *   兄弟：SubjectManager.test.tsx / TopicManager.test.tsx
 *
 * [INPUT]
 *   - @testing-library/react        → render / screen / waitFor / fireEvent
 *   - vitest                        → describe / it / expect / vi
 *   - @/pages/admin/AdminSubjectsPage → AdminSubjectsPage
 *
 * [OUTPUT]
 *   - AdminSubjectsPage 测试套件
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/test/CLAUDE.md 的文件清单
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminSubjectsPage } from '@/pages/admin/AdminSubjectsPage';

// Mock the child components
vi.mock('@/components/SubjectManager', () => ({
  SubjectManager: ({ onSubjectSelect }: { onSubjectSelect: (key: string) => void }) => (
    <div data-testid="subject-manager">
      <button onClick={() => onSubjectSelect('math')}>Select Math</button>
    </div>
  ),
}));

vi.mock('@/components/TopicManager', () => ({
  TopicManager: ({ subjectKey }: { subjectKey: string }) => (
    <div data-testid="topic-manager">
      Subject Key: {subjectKey || 'none'}
    </div>
  ),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('AdminSubjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <AdminSubjectsPage />
      </BrowserRouter>
    );
  };

  it('renders the page with title and navigation', () => {
    renderComponent();

    expect(screen.getByText('科目和考点管理')).toBeInTheDocument();
    expect(screen.getByText('好好学习，天天向上')).toBeInTheDocument();
  });

  it('renders SubjectManager and TopicManager components', () => {
    renderComponent();

    expect(screen.getByTestId('subject-manager')).toBeInTheDocument();
    expect(screen.getByTestId('topic-manager')).toBeInTheDocument();
  });

  it('passes selected subject key to TopicManager', async () => {
    renderComponent();

    // Initially, no subject is selected
    expect(screen.getByText('Subject Key: none')).toBeInTheDocument();

    // Select a subject
    const selectButton = screen.getByText('Select Math');
    fireEvent.click(selectButton);

    // TopicManager should receive the selected subject key
    await waitFor(() => {
      expect(screen.getByText('Subject Key: math')).toBeInTheDocument();
    });
  });

  it('navigates back to home when back button is clicked', async () => {
    renderComponent();

    const backButton = screen.getByRole('button', { name: '' }); // ChevronLeft icon button
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('displays master-detail layout structure', () => {
    renderComponent();

    const subjectManager = screen.getByTestId('subject-manager');
    const topicManager = screen.getByTestId('topic-manager');

    // Both components should be present in the layout
    expect(subjectManager).toBeInTheDocument();
    expect(topicManager).toBeInTheDocument();
  });
});
