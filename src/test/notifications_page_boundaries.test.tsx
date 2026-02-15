import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { useAuthStore } from '@/stores/useAuthStore';

// Mock notificationService to control data/side effects
const getNotificationsMock = vi.fn();
const markAsReadMock = vi.fn();
const markAllAsReadMock = vi.fn();

vi.mock('@/services/api', () => ({
  notificationService: {
    getNotifications: (...args: any[]) => getNotificationsMock(...args),
    markAsRead: (...args: any[]) => markAsReadMock(...args),
    markAllAsRead: (...args: any[]) => markAllAsReadMock(...args),
    getUnreadCount: vi.fn(),
  },
}));

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock useNavigate to observe navigation paths
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NotificationsPage boundaries', () => {
  beforeEach(() => {
    getNotificationsMock.mockReset();
    markAsReadMock.mockReset();
    markAllAsReadMock.mockReset();
    mockNavigate.mockReset();

    // 默认模拟已登录学生用户
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'u1', role: 'student', nickname: 'TestUser', avatar: '' },
    });
  });

  const renderPage = async () => {
    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <Routes>
          <Route path="/notifications" element={<NotificationsPage />} />
        </Routes>
      </MemoryRouter>
    );

    // 等待加载状态结束
    await waitFor(() =>
      expect(
        screen.queryByText('正在加载通知...')
      ).toBeNull()
    );
  };

  it('handles malformed new_answer content without crashing', async () => {
    getNotificationsMock.mockResolvedValue({
      list: [
        {
          id: 'n1',
          userId: 'u1',
          type: 'new_answer',
          title: '你的问题有新的回答',
          content: '{not-valid-json', // 非法 JSON
          targetType: 'question',
          targetId: 'q123',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    markAsReadMock.mockResolvedValue({ success: true, updatedCount: 1 });

    await renderPage();

    // 点击通知，不应抛错，且仍然能导航到 question 详情（不带 answerId）
    const item = screen.getByTestId('notification-item');
    fireEvent.click(item);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/question/q123');
    });
  });

  it('handles notification without targetId gracefully (no navigation)', async () => {
    getNotificationsMock.mockResolvedValue({
      list: [
        {
          id: 'n2',
          userId: 'u1',
          type: 'new_answer',
          title: '缺少 targetId 的通知',
          content: JSON.stringify({ answerId: 'a123' }),
          targetType: 'question',
          targetId: undefined,
          isRead: false,
          createdAt: new Date().toISOString(),
        } as any,
      ],
      unreadCount: 1,
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    markAsReadMock.mockResolvedValue({ success: true, updatedCount: 1 });

    await renderPage();

    const item = screen.getByTestId('notification-item');
    fireEvent.click(item);

    await waitFor(() => {
      // 不应触发导航，因为缺少 targetId
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('marks all unread notifications as read when clicking mark all', async () => {
    getNotificationsMock.mockResolvedValue({
      list: [
        {
          id: 'n3',
          userId: 'u1',
          type: 'audit_result',
          title: '审核结果通知',
          content: '你的问题已通过审核',
          targetType: 'question',
          targetId: 'q999',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    markAllAsReadMock.mockResolvedValue({ success: true, updatedCount: 1 });

    await renderPage();

    const markAllBtn = screen.getByText('全部标记已读');
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(markAllAsReadMock).toHaveBeenCalled();
    });

    // 未读计数应更新为 0
    expect(screen.getByText('未读通知：0 条')).toBeInTheDocument();
  });

  it('redirects unauthenticated user to login', async () => {
    // 未登录用户访问通知中心
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <Routes>
          <Route path="/notifications" element={<NotificationsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});
