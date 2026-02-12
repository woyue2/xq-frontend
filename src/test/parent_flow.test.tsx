import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ParentQuestionPage } from '@/pages/ParentQuestionPage';
import { parentService } from '@/services/parentService';
import { useAuthStore } from '@/stores/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, beforeEach, test, expect } from 'vitest';

// Mock parentService
vi.mock('@/services/parentService');
vi.mock('@/stores/useAuthStore');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ childId: 'child_1' }),
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe('Parent Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      login: vi.fn(),
      user: null,
      updateUser: vi.fn(),
    });
  });

  test('LoginPage shows parent binding fields for PARENT2024', async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    // Switch to Register
    fireEvent.click(screen.getByText('快速注册'));
    
    // Enter Parent Invite Code
    const inviteInput = screen.getByLabelText('邀请码 *');
    fireEvent.change(inviteInput, { target: { value: 'PARENT2024' } });

    // Check if binding fields appear
    expect(screen.getByText('绑定孩子信息')).toBeInTheDocument();
    expect(screen.getByLabelText('孩子姓名 *')).toBeInTheDocument();
  });

  test('ProfilePage shows My Children section for parent', async () => {
    // Mock user as parent
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'p1', role: 'parent', nickname: 'ParentUser', avatar: '' },
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    // Mock getChildren response
    (parentService.getChildren as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        code: 200,
        data: [{ id: 'child_1', name: 'Little Ming', grade: 'Grade 3', avatar: '' }]
      }
    });

    render(
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('我的孩子')).toBeInTheDocument();
      expect(screen.getByText('Little Ming')).toBeInTheDocument();
    });
  });

  test('ParentQuestionPage loads questions', async () => {
    // Mock user as parent
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'p1', role: 'parent', nickname: 'ParentUser', avatar: '' },
      logout: vi.fn(),
      updateUser: vi.fn(),
      login: vi.fn(),
    });

    // Mock getChildQuestions
    (parentService.getChildQuestions as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        code: 200,
        data: {
          items: [
            { id: 'q1', title: 'Why sky blue?', content: 'Tell me', isPinned: false, stats: {}, authorName: 'Test Author', authorId: 'child_1' }
          ],
          total: 1,
          page: 1,
          totalPages: 1
        }
      }
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ParentQuestionPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('孩子提问列表')).toBeInTheDocument();
      expect(screen.getByText('Why sky blue?')).toBeInTheDocument();
    });
  });

  test('non-parent user is redirected away from ParentQuestionPage', async () => {
    // 模拟学生用户
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 's1', role: 'student', nickname: 'Student', avatar: '' },
      logout: vi.fn(),
      updateUser: vi.fn(),
      login: vi.fn()
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ParentQuestionPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
