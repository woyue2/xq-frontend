import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DiagnosticPage } from '@/pages/DiagnosticPage';
import { BrowserRouter } from 'react-router-dom';
import { useDiagnosticStore } from '@/stores/useDiagnosticStore';

const useAuthStoreMock = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => useAuthStoreMock(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const toastErrorMock = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    error: (...args: any[]) => toastErrorMock(...args),
    success: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Mock the runner to avoid waiting 3s
vi.mock('@/lib/test-runner', () => ({
  runDiagnosticTests: vi.fn(async () => {
    useDiagnosticStore.getState().startTests();
    useDiagnosticStore.getState().addLog('Mock run started');
    useDiagnosticStore.setState({
        results: [
            { id: 'test1', name: 'Mock Test', description: 'Desc', status: 'success', duration: 10 }
        ]
    });
    useDiagnosticStore.getState().completeTests();
  })
}));

describe('DiagnosticPage Integration', () => {
  beforeEach(() => {
    toastErrorMock.mockReset();
    useAuthStoreMock.mockReturnValue({
      user: { id: 't1', role: 'teacher', nickname: '老师用户' },
    });
    mockNavigate.mockReset();
    useDiagnosticStore.getState().reset();
  });

  it('should render initial state correctly', () => {
    render(
      <BrowserRouter>
        <DiagnosticPage />
      </BrowserRouter>
    );

    expect(screen.getByText('系统接口诊断工具')).toBeInTheDocument();
    expect(screen.getByText('开始诊断')).toBeInTheDocument();
    expect(screen.getByText('测试用例总数')).toBeInTheDocument();
    expect(screen.getByText('// 等待运行...')).toBeInTheDocument();
  });

  it('should trigger tests when start button clicked', async () => {
    render(
      <BrowserRouter>
        <DiagnosticPage />
      </BrowserRouter>
    );

    const startBtn = screen.getByText('开始诊断');
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText('Mock Test')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Mock run started', { exact: false })).toBeInTheDocument();
  });

  it('redirects unauthenticated user to login', async () => {
    useAuthStoreMock.mockReturnValueOnce({ user: null });

    render(
      <BrowserRouter>
        <DiagnosticPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('请先登录');
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('blocks non-teacher user from accessing diagnostic tool', async () => {
    useAuthStoreMock.mockReturnValueOnce({
      user: { id: 's1', role: 'student', nickname: '学生用户' },
    });

    render(
      <BrowserRouter>
        <DiagnosticPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('只有老师可以访问诊断工具');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
