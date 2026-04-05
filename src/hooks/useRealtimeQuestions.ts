/**
 * [POS] src/hooks/useRealtimeQuestions.ts
 *   所属：Hooks 层 | 角色：问题列表实时订阅 Hook
 *
 * [METHODS]
 *   - useRealtimeQuestions: 自动订阅新问题并更新列表
 *
 * [PROTOCOL]
 *   - 使用 Supabase Realtime 替代轮询
 *   - 自动处理订阅生命周期
 */
import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { realtimeApi } from '@/services/api.supa'
import type { QuestionChangePayload } from '@/services/api.supa'

export interface UseRealtimeQuestionsOptions {
  subject?: string
  status?: string
  onNewQuestion?: (question: any) => void
}

/**
 * 问题列表实时订阅 Hook
 * 当有新问题创建时自动更新 React Query 缓存
 */
export function useRealtimeQuestions(options: UseRealtimeQuestionsOptions = {}) {
  const queryClient = useQueryClient()
  const { subject, status = 'approved', onNewQuestion } = options

  const handleNewQuestion = useCallback((payload: QuestionChangePayload) => {
    const newQuestion = payload.new

    // 触发回调
    onNewQuestion?.(newQuestion)

    // 更新问题列表缓存
    queryClient.setQueryData(['questions', 'list', { subject, status }], (old: any[] = []) => {
      // 避免重复添加
      if (old.some(q => q.id === newQuestion.id)) return old
      return [newQuestion, ...old]
    })

    // 更新问题详情缓存
    queryClient.setQueryData(['question', newQuestion.id], newQuestion)
  }, [queryClient, subject, status, onNewQuestion])

  useEffect(() => {
    const unsubscribe = realtimeApi.subscribeQuestions(handleNewQuestion, {
      subject,
      status
    })

    return () => {
      unsubscribe()
    }
  }, [handleNewQuestion, subject, status])
}

export default useRealtimeQuestions
