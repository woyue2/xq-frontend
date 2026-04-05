/**
 * [POS] src/services/interaction.supa.ts
 *   所属：服务层 | 角色：用户交互 API（点赞、收藏、懂了）
 *
 * [METHODS]
 *   - like: 调 Vercel API（需要事务）
 *   - unlike: 调 Vercel API
 *   - getFavorites: 直查 Supabase
 *   - addFavorite: 调 Vercel API
 *   - removeFavorite: 调 Vercel API
 *   - getUnderstanding: 直查 Supabase
 *   - setUnderstanding: 调 Vercel API
 *
 * [PROTOCOL]
 *   - 查询类：使用 Supabase 直查
 *   - 写入类（涉及计数更新）：使用 Vercel API
 */
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

export type Favorite = Database['public']['tables']['Favorite']['Row'] & {
  question?: {
    id: string
    title: string
    subject: string | null
    author_name: string
    created_at: string
  }
}

export type Understanding = Database['public']['tables']['QuestionUnderstanding']['Row']

/**
 * 点赞 - 调 Vercel API（需要事务更新计数）
 */
export async function like(targetType: 'question' | 'answer', targetId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch('/api/interactions/like', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({ targetType, targetId })
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || '点赞失败')
  }
}

/**
 * 取消点赞 - 调 Vercel API
 */
export async function unlike(targetType: 'question' | 'answer', targetId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch(`/api/interactions/like?targetType=${targetType}&targetId=${targetId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`
    }
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || '取消点赞失败')
  }
}

/**
 * 检查是否已点赞 - 直查 Supabase
 */
export async function hasLiked(targetType: 'question' | 'answer', targetId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('Like')
    .select('id')
    .eq('user_id', user.id)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
  return !!data
}

/**
 * 获取收藏列表 - 直查 Supabase
 */
export async function getFavorites(params?: {
  offset?: number
  limit?: number
}): Promise<Favorite[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { data, error } = await supabase
    .from('Favorite')
    .select(`
      *,
      question:question_id(id, title, subject, author_name, created_at)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(params?.offset || 0, (params?.offset || 0) + (params?.limit || 20) - 1)

  if (error) throw error
  return data || []
}

/**
 * 添加收藏 - 调 Vercel API
 */
export async function addFavorite(questionId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch('/api/interactions/favorite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({ questionId })
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || '收藏失败')
  }
}

/**
 * 取消收藏 - 调 Vercel API
 */
export async function removeFavorite(questionId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch(`/api/interactions/favorite?questionId=${questionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`
    }
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || '取消收藏失败')
  }
}

/**
 * 检查是否已收藏 - 直查 Supabase
 */
export async function hasFavorited(questionId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('Favorite')
    .select('id')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return !!data
}

/**
 * 获取懂了状态 - 直查 Supabase
 */
export async function getUnderstanding(questionId: string): Promise<{
  myStatus: 'understood' | 'not_understood' | null
  stats: {
    understoodCount: number
    notUnderstoodCount: number
  }
}> {
  const { data: { user } } = await supabase.auth.getUser()

  const [understanding, question] = await Promise.all([
    user ? supabase
      .from('QuestionUnderstanding')
      .select('status')
      .eq('question_id', questionId)
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => data) : Promise.resolve(null),
    supabase
      .from('Question')
      .select('understood_count, not_understood_count')
      .eq('id', questionId)
      .single()
  ])

  return {
    myStatus: understanding?.status || null,
    stats: {
      understoodCount: question.data?.understood_count || 0,
      notUnderstoodCount: question.data?.not_understood_count || 0
    }
  }
}

/**
 * 设置懂了状态 - 调 Vercel API
 */
export async function setUnderstanding(
  questionId: string,
  status: 'understood' | 'not_understood'
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch('/api/interactions/understanding', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({ questionId, status })
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || '设置失败')
  }
}

export default {
  like,
  unlike,
  hasLiked,
  getFavorites,
  addFavorite,
  removeFavorite,
  hasFavorited,
  getUnderstanding,
  setUnderstanding
}
