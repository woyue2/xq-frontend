/**
 * [POS] src/services/question.supa.ts
 *   所属：服务层 | 角色：问题相关 API（Supabase 直查 + Vercel API 混合）
 *
 * [METHODS]
 *   - list: 直查 Supabase（列表查询）
 *   - detail: 直查 Supabase（单条查询）
 *   - create: 调 Vercel API（需要复杂事务）
 *   - update: 调 Vercel API
 *   - delete: 调 Vercel API
 *   - getBySubject: 直查 Supabase
 *   - search: 直查 Supabase
 *
 * [PROTOCOL]
 *   - 列表/查询类：使用 Supabase 直查，减少延迟
 *   - 写入/复杂事务：使用 Vercel API，保证一致性
 */
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

export type Question = Database['public']['tables']['Question']['Row'] & {
  author?: {
    id: string
    nickname: string
    avatar: string | null
  }
  answers_count?: number
}

export type CreateQuestionData = {
  title: string
  content?: string
  subject?: string
  tags?: string[]
  images?: string[]
  difficulty?: string
}

export type ListParams = {
  subjectId?: string
  status?: string
  offset?: number
  limit?: number
  search?: string
}

/**
 * 获取问题列表 - 直查 Supabase
 */
export async function list(params?: ListParams): Promise<Question[]> {
  let query = supabase
    .from('Question')
    .select(`
      *,
      author:author_id(id, nickname, avatar),
      answers_count:Answer(count)
    `)
    .eq('status', params?.status || 'approved')
    .is('deleted_at', null)

  if (params?.subjectId) {
    query = query.eq('subject', params.subjectId)
  }

  if (params?.search) {
    query = query.or(`title.ilike.%${params.search}%,content.ilike.%${params.search}%`)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(params?.offset || 0, (params?.offset || 0) + (params?.limit || 20) - 1)

  if (error) throw error
  return data || []
}

/**
 * 获取问题详情 - 直查 Supabase
 */
export async function detail(id: string): Promise<Question | null> {
  const { data, error } = await supabase
    .from('Question')
    .select(`
      *,
      author:author_id(id, nickname, avatar),
      answers:Answer(*, author:author_id(id, nickname, avatar))
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) throw error
  return data
}

/**
 * 按学科获取问题 - 直查 Supabase
 */
export async function getBySubject(subjectId: string, params?: ListParams): Promise<Question[]> {
  return list({ ...params, subjectId })
}

/**
 * 搜索问题 - 直查 Supabase
 */
export async function search(keyword: string, params?: ListParams): Promise<Question[]> {
  return list({ ...params, search: keyword })
}

/**
 * 创建问题 - 调 Vercel API（需要复杂事务）
 */
export async function create(data: CreateQuestionData): Promise<Question> {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch('/api/questions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify(data)
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || '创建问题失败')
  }

  return res.json().then(r => r.data)
}

/**
 * 更新问题 - 调 Vercel API
 */
export async function update(id: string, data: Partial<CreateQuestionData>): Promise<Question> {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch(`/api/questions/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({ id, ...data })
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || '更新问题失败')
  }

  return res.json().then(r => r.data)
}

/**
 * 删除问题 - 调 Vercel API
 */
export async function remove(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch(`/api/questions/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({ id })
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || '删除问题失败')
  }
}

/**
 * 获取我的问题列表 - 直查 Supabase
 */
export async function getMyQuestions(params?: ListParams): Promise<Question[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  let query = supabase
    .from('Question')
    .select(`
      *,
      answers_count:Answer(count)
    `)
    .eq('author_id', user.id)
    .is('deleted_at', null)

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(params?.offset || 0, (params?.offset || 0) + (params?.limit || 20) - 1)

  if (error) throw error
  return data || []
}

/**
 * 获取待审核问题列表（管理员）- 直查 Supabase
 */
export async function getPendingQuestions(params?: ListParams): Promise<Question[]> {
  return list({ ...params, status: 'pending' })
}

export default {
  list,
  detail,
  create,
  update,
  remove,
  getBySubject,
  search,
  getMyQuestions,
  getPendingQuestions
}
