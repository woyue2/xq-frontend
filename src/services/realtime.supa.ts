/**
 * [POS] src/services/realtime.supa.ts
 *   所属：服务层 | 角色：Supabase Realtime 订阅管理
 *
 * [METHODS]
 *   - subscribeQuestions: 订阅新问题
 *   - subscribeAnswers: 订阅问题的新回答
 *   - subscribeNotifications: 订阅用户通知
 *   - subscribeAuditStatus: 订阅审核状态变更
 *   - unsubscribe: 取消订阅
 *
 * [PROTOCOL]
 *   - 使用 Supabase Realtime 替代轮询
 *   - 自动处理订阅生命周期
 */
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export type QuestionChangePayload = RealtimePostgresChangesPayload<{
  id: string
  title: string
  status: string
  author_id: string
  created_at: string
}>

export type AnswerChangePayload = RealtimePostgresChangesPayload<{
  id: string
  question_id: string
  content: string
  author_id: string
  created_at: string
}>

export type NotificationChangePayload = RealtimePostgresChangesPayload<{
  id: string
  user_id: string
  type: string
  title: string
  is_read: boolean
  created_at: string
}>

const channels: Map<string, RealtimeChannel> = new Map()

/**
 * 订阅新问题
 */
export function subscribeQuestions(
  onInsert: (payload: QuestionChangePayload) => void,
  filter?: { subject?: string; status?: string }
): () => void {
  const channelName = `questions:${filter?.subject || 'all'}`

  let query = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'Question',
        filter: filter?.subject ? `subject=eq.${filter.subject}` : undefined
      },
      (payload) => {
        if (!filter?.status || (payload.new as any).status === filter.status) {
          onInsert(payload as QuestionChangePayload)
        }
      }
    )

  const channel = query.subscribe()
  channels.set(channelName, channel)

  return () => {
    channel.unsubscribe()
    channels.delete(channelName)
  }
}

/**
 * 订阅问题的新回答
 */
export function subscribeAnswers(
  questionId: string,
  onInsert: (payload: AnswerChangePayload) => void
): () => void {
  const channelName = `answers:${questionId}`

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'Answer',
        filter: `question_id=eq.${questionId}`
      },
      (payload) => onInsert(payload as AnswerChangePayload)
    )
    .subscribe()

  channels.set(channelName, channel)

  return () => {
    channel.unsubscribe()
    channels.delete(channelName)
  }
}

/**
 * 订阅用户通知
 */
export function subscribeNotifications(
  userId: string,
  onChange: (payload: NotificationChangePayload) => void
): () => void {
  const channelName = `notifications:${userId}`

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'Notification',
        filter: `user_id=eq.${userId}`
      },
      (payload) => onChange(payload as NotificationChangePayload)
    )
    .subscribe()

  channels.set(channelName, channel)

  return () => {
    channel.unsubscribe()
    channels.delete(channelName)
  }
}

/**
 * 订阅审核状态变更（管理员）
 */
export function subscribeAuditStatus(
  onUpdate: (payload: {
    table: string
    id: string
    status: string
    oldStatus: string
  }) => void
): () => void {
  const channelName = 'audit:status'

  const handleChange = (table: string) => (payload: any) => {
    if (payload.eventType === 'UPDATE' && payload.new.status !== payload.old.status) {
      onUpdate({
        table,
        id: payload.new.id,
        status: payload.new.status,
        oldStatus: payload.old.status
      })
    }
  }

  const questionChannel = supabase
    .channel(`${channelName}:questions`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'Question' },
      handleChange('Question')
    )
    .subscribe()

  const answerChannel = supabase
    .channel(`${channelName}:answers`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'Answer' },
      handleChange('Answer')
    )
    .subscribe()

  channels.set(`${channelName}:questions`, questionChannel)
  channels.set(`${channelName}:answers`, answerChannel)

  return () => {
    questionChannel.unsubscribe()
    answerChannel.unsubscribe()
    channels.delete(`${channelName}:questions`)
    channels.delete(`${channelName}:answers`)
  }
}

/**
 * 取消所有订阅
 */
export function unsubscribeAll(): void {
  channels.forEach((channel) => channel.unsubscribe())
  channels.clear()
}

/**
 * 获取活跃订阅数量
 */
export function getActiveSubscriptionCount(): number {
  return channels.size
}

export default {
  subscribeQuestions,
  subscribeAnswers,
  subscribeNotifications,
  subscribeAuditStatus,
  unsubscribeAll,
  getActiveSubscriptionCount
}
