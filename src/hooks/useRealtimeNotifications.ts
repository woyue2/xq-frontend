/**
 * [POS] src/hooks/useRealtimeNotifications.ts
 *   所属：Hooks 层 | 角色：用户通知实时订阅 Hook
 *
 * [METHODS]
 *   - useRealtimeNotifications: 自动订阅用户通知
 *   - useUnreadCount: 获取未读通知数量
 *
 * [PROTOCOL]
 *   - 使用 Supabase Realtime 替代轮询
 *   - 自动更新未读计数
 */
import { useEffect, useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { realtimeApi } from '@/services/api.supa'
import type { NotificationChangePayload } from '@/services/api.supa'

export interface UseRealtimeNotificationsOptions {
  userId?: string
  onNewNotification?: (notification: any) => void
}

/**
 * 用户通知实时订阅 Hook
 * 当有新通知时自动更新缓存和未读计数
 */
export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const queryClient = useQueryClient()
  const { userId, onNewNotification } = options
  const [unreadCount, setUnreadCount] = useState(0)

  // 获取初始未读数
  useEffect(() => {
    if (!userId) return

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('Notification')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      setUnreadCount(count || 0)
    }

    fetchUnreadCount()
  }, [userId])

  const handleNotificationChange = useCallback((payload: NotificationChangePayload) => {
    const notification = payload.new

    // 触发回调
    if (payload.eventType === 'INSERT') {
      onNewNotification?.(notification)
      setUnreadCount(prev => prev + 1)
    }

    // 更新通知列表缓存
    queryClient.setQueryData(['notifications', 'list', userId], (old: any[] = []) => {
      if (payload.eventType === 'INSERT') {
        if (old.some(n => n.id === notification.id)) return old
        return [notification, ...old]
      }
      if (payload.eventType === 'UPDATE') {
        return old.map(n => n.id === notification.id ? notification : n)
      }
      return old
    })
  }, [queryClient, userId, onNewNotification])

  useEffect(() => {
    if (!userId) return

    const unsubscribe = realtimeApi.subscribeNotifications(userId, handleNotificationChange)

    return () => {
      unsubscribe()
    }
  }, [handleNotificationChange, userId])

  return { unreadCount, setUnreadCount }
}

export default useRealtimeNotifications
