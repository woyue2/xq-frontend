import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DiagnosticPage } from '@/pages/DiagnosticPage';
import { BrowserRouter } from 'react-router-dom';
import { useDiagnosticStore } from '@/stores/useDiagnosticStore';

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
});
