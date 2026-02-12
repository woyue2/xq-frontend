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

  test('LoginPage shows parent registration without binding fields for PARENT2024', async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    // Switch to Register - should show role selection dialog
    fireEvent.click(screen.getByText('快速注册'));
    
    // Wait for dialog and select parent role
    await waitFor(() => {
      expect(screen.getByText('选择注册身份')).toBeInTheDocument();
    });
    
    const parentButton = screen.getByText('家长');
    fireEvent.click(parentButton);

    // Now should be in register mode with parent fields
    await waitFor(() => {
      expect(screen.getByLabelText('邀请码 *')).toBeInTheDocument();
    });

    // Enter Parent Invite Code
    const inviteInput = screen.getByLabelText('邀请码 *');
    fireEvent.change(inviteInput, { target: { value: 'PARENT2024' } });

    // Check that binding fields do NOT appear (parent registration doesn't require child binding)
    expect(screen.queryByText('绑定孩子信息')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('孩子姓名 *')).not.toBeInTheDocument();
    
    // Check that real name field shows as optional for parent
    expect(screen.getByText('真实姓名（可选）')).toBeInTheDocument();
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
          list: [
            { id: 'q1', title: 'Why sky blue?', content: 'Tell me', isPinned: false, stats: {}, authorName: 'Test Author', authorId: 'child_1' }
          ],
          pagination: {
            total: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1
          }
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
