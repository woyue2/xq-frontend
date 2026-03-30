/**
 * [POS] src/pages/NotificationsPage.tsx
 *   所属：pages 层 | 角色：通知列表页，路由 `/notifications`，已登录可见
 *   兄弟：所有其他 pages
 *
 * [INPUT]
 *   - react              → useEffect / useState
 *   - lucide-react       → Bell / CheckCircle / AlertCircle / ChevronRight
 *   - react-router-dom   → useNavigate
 *
 * [OUTPUT]
 *   - NotificationsPage（页面组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/pages/CLAUDE.md 的文件清单
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { notificationService } from '@/services/api';
import type { Notification } from '@/types/api';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import { ROUTES } from '@/config/app-constants';

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
};

export function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const {
        notifications,
        unreadCount: unread,
        total,
      } = await notificationService.getNotifications({
        page: 1,
        limit: 20,
      });
      setItems(notifications);
      setUnreadCount(unread);
    } catch {
      // 失败时交由全局拦截器处理，这里只恢复 loading 状态
    } finally {
      setLoading(false);
    }
  };

  // 仅允许已登录用户访问通知中心
  useEffect(() => {
    if (!user) {
      toast.error('请先登录');
      navigate(ROUTES.login);
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    void loadNotifications();
  }, [user]);

  const parseAnswerIdFromContent = (n: Notification): string | null => {
    if (n.type !== 'new_answer' || !n.content) return null;
    try {
      const parsed = JSON.parse(n.content) as { answerId?: string | null };
      if (parsed && typeof parsed.answerId === 'string' && parsed.answerId) {
        return parsed.answerId;
      }
    } catch {
      // 解析失败时退回普通字符串展示
    }
    return null;
  };

  const handleItemClick = async (n: Notification) => {
    if (!n.isRead) {
      try {
        await notificationService.markAsRead([n.id]);
        setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, isRead: true } : it)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // 失败由拦截器提示，这里不打断导航
      }
    }

    if (n.targetType === 'question' && n.targetId) {
      const answerId = parseAnswerIdFromContent(n);
      if (answerId) {
        navigate(ROUTES.questionWithAnswer(n.targetId, answerId));
      } else {
        navigate(ROUTES.question(n.targetId));
      }
    }
  };

  const handleMarkAllRead = async () => {
    const ids = items.filter((n) => !n.isRead).map((n) => n.id);
    if (ids.length === 0) return;
    try {
      await notificationService.markAsRead(ids);
      setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
      setUnreadCount(0);
    } catch {
      // 失败提示由拦截器负责
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* 顶部标题栏 */}
      <div className="bg-white rounded-3xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">通知中心</h1>
            <p className="text-xs text-gray-400">未读通知：{unreadCount} 条</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllRead}
            className="rounded-full text-xs"
          >
            全部标记已读
          </Button>
        )}
      </div>

      {/* 通知列表 */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-3xl p-10 text-center text-gray-400 shadow-sm">
            正在加载通知...
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center text-gray-400 shadow-sm">
            暂无通知
          </div>
        ) : (
          items.map((n) => {
            const isAudit = n.type === 'audit_result';
            const isNewAnswer = n.type === 'new_answer';
            const icon = isAudit ? (
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertCircle
                className={`w-5 h-5 ${isNewAnswer ? 'text-amber-500' : 'text-blue-500'}`}
              />
            );
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => void handleItemClick(n)}
                className="w-full text-left bg-white rounded-3xl p-4 shadow-sm flex items-center gap-3 active:scale-98 transition-transform"
                data-testid="notification-item"
              >
                <div className="relative">
                  {icon}
                  {!n.isRead && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{n.title}</p>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {formatDate(n.createdAt)}
                    </span>
                  </div>
                  {n.content && <p className="text-xs text-gray-500 line-clamp-2">{n.content}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
