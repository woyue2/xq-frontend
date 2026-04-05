/**
 * [POS] src/hooks/useRealtimeAnswers.ts
 *   所属：Hooks 层 | 角色：问题回答实时订阅 Hook
 *
 * [METHODS]
 *   - useRealtimeAnswers: 自动订阅指定问题的新回答
 *
 * [PROTOCOL]
 *   - 使用 Supabase Realtime 替代轮询
 *   - 当有新回答时自动更新缓存
 */
import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { realtimeApi } from '@/services/api.supa'
import type { AnswerChangePayload } from '@/services/api.supa'

export interface UseRealtimeAnswersOptions {
  questionId: string
  onNewAnswer?: (answer: any) => void
}

/**
 * 问题回答实时订阅 Hook
 * 当有新回答时自动更新 React Query 缓存
 */
export function useRealtimeAnswers(options: UseRealtimeAnswersOptions) {
  const queryClient = useQueryClient()
  const { questionId, onNewAnswer } = options

  const handleNewAnswer = useCallback((payload: AnswerChangePayload) => {
    const newAnswer = payload.new

    // 触发回调
    onNewAnswer?.(newAnswer)

    // 更新回答列表缓存
    queryClient.setQueryData(['answers', 'list', questionId], (old: any[] = []) => {
      if (old.some(a => a.id === newAnswer.id)) return old
      return [...old, newAnswer]
    })

    // 更新问题详情中的回答数
    queryClient.setQueryData(['question', questionId], (old: any) => {
      if (!old) return old
      return { ...old, answers: (old.answers || 0) + 1 }
    })
  }, [queryClient, questionId, onNewAnswer])

  useEffect(() => {
    if (!questionId) return

    const unsubscribe = realtimeApi.subscribeAnswers(questionId, handleNewAnswer)

    return () => {
      unsubscribe()
    }
  }, [handleNewAnswer, questionId])
}

export default useRealtimeAnswers
