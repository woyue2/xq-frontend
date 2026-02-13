import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MyQuestionsPage } from '@/pages/MyQuestionsPage';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuestions } from '@/hooks/useQuestions';
import { questionService } from '@/services/api';

vi.mock('@/hooks/useQuestions', () => ({
  useQuestions: vi.fn()
}));

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: vi.fn()
}));

vi.mock('@/services/api', async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    questionService: {
      ...actual.questionService,
      delete: vi.fn()
    }
  };
});

describe('MyQuestionsPage delete button visibility', () => {
  const mockedUseAuth = useAuthStore as unknown as vi.Mock;
  const mockedUseQuestions = useQuestions as unknown as vi.Mock;
  const mockedDelete = questionService.delete as unknown as vi.Mock;

  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: { id: 'u1', nickname: 'Test User', role: 'student' }
    });
    mockedDelete.mockReset();
    (window as any).confirm = vi.fn(() => true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderMyQuestions = () =>
    render(
      <MemoryRouter initialEntries={['/my-questions']}>
        <Routes>
          <Route path="/my-questions" element={<MyQuestionsPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('hides delete button for student when own question is approved and has no answers', async () => {
    mockedUseQuestions.mockReturnValue({
      data: {
        pages: [
          {
            list: [
              {
                id: 'q-no-answer',
                title: 'No Answer Question',
                content: 'Content',
                status: 'approved',
                createdAt: new Date().toISOString(),
                stats: { likes: 0, comments: 0, answers: 0 },
                isGoodQuestion: false,
                answerCount: 0,
                subject: 'math',
                likeCount: 0,
                collectionCount: 0,
                authorId: 'u1'
              }
            ]
          }
        ]
      },
      isLoading: false,
      refetch: vi.fn()
    });

    renderMyQuestions();

    const deleteBtn = screen.queryByTestId('delete-question-q-no-answer');
    expect(deleteBtn).toBeNull();
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('shows delete button for student when own pending question has no answers', async () => {
    mockedUseQuestions.mockReturnValue({
      data: {
        pages: [
          {
            list: [
              {
                id: 'q-pending-no-answer',
                title: 'Pending No Answer Question',
                content: 'Content',
                status: 'pending',
                createdAt: new Date().toISOString(),
                stats: { likes: 0, comments: 0, answers: 0 },
                isGoodQuestion: false,
                answerCount: 0,
                subject: 'math',
                likeCount: 0,
                collectionCount: 0,
                authorId: 'u1'
              }
            ]
          }
        ]
      },
      isLoading: false,
      refetch: vi.fn()
    });

    renderMyQuestions();

    const deleteBtn = await screen.findByTestId('delete-question-q-pending-no-answer');
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockedDelete).toHaveBeenCalledWith('q-pending-no-answer');
    });
  });
});

