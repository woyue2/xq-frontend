/**
 * [POS] src/services/user.supa.ts
 *   所属：服务层 | 角色：用户相关 API（Supabase 直查 + Vercel API 混合）
 *
 * [METHODS]
 *   - getProfile: 直查 Supabase
 *   - updateProfile: 调 Vercel API
 *   - getUserStats: 直查 Supabase
 *   - getChildren: 直查 Supabase（家长角色）
 *
 * [PROTOCOL]
 *   - 查询类：使用 Supabase 直查
 *   - 写入类：使用 Vercel API
 */
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

export type User = Database['public']['tables']['User']['Row']

export type UpdateProfileData = {
  name?: string
  nickname?: string
  avatar?: string
  grade?: string
  age?: number
  school?: string
}

/**
 * 获取当前用户资料 - 直查 Supabase
 */
export async function getProfile(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('User')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}

/**
 * 更新用户资料 - 调 Vercel API
 */
export async function updateProfile(data: UpdateProfileData): Promise<User> {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch('/api/users/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify(data)
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || '更新资料失败')
  }

  return res.json().then(r => r.data)
}

/**
 * 获取用户统计 - 直查 Supabase
 */
export async function getUserStats(userId?: string): Promise<{
  questionsCount: number
  answersCount: number
  likesReceived: number
}> {
  const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id
  if (!targetUserId) throw new Error('未登录')

  const [
    { count: questionsCount },
    { count: answersCount },
    { data: questions }
  ] = await Promise.all([
    supabase.from('Question').select('*', { count: 'exact', head: true }).eq('author_id', targetUserId),
    supabase.from('Answer').select('*', { count: 'exact', head: true }).eq('author_id', targetUserId),
    supabase.from('Question').select('likes').eq('author_id', targetUserId)
  ])

  const likesReceived = questions?.reduce((sum, q) => sum + (q.likes || 0), 0) || 0

  return {
    questionsCount: questionsCount || 0,
    answersCount: answersCount || 0,
    likesReceived
  }
}

/**
 * 获取家长的孩子列表 - 直查 Supabase
 */
export async function getChildren(): Promise<User[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  // 获取当前用户的家长关系
  const { data: relations, error: relError } = await supabase
    .from('ParentStudent')
    .select('student_id')
    .eq('parent_id', user.id)

  if (relError) throw relError
  if (!relations?.length) return []

  const studentIds = relations.map(r => r.student_id)

  const { data, error } = await supabase
    .from('User')
    .select('*')
    .in('id', studentIds)
    .eq('role', 'student')

  if (error) throw error
  return data || []
}

/**
 * 绑定学生到家长 - 调 Vercel API
 */
export async function bindChild(studentId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch('/api/users/bind-child', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({ studentId })
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || '绑定失败')
  }
}

/**
 * 获取用户列表（管理员）- 直查 Supabase
 */
export async function getUserList(params?: {
  role?: string
  search?: string
  offset?: number
  limit?: number
}): Promise<User[]> {
  let query = supabase
    .from('User')
    .select('*')

  if (params?.role) {
    query = query.eq('role', params.role)
  }

  if (params?.search) {
    query = query.or(`nickname.ilike.%${params.search}%,phone.ilike.%${params.search}%`)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(params?.offset || 0, (params?.offset || 0) + (params?.limit || 20) - 1)

  if (error) throw error
  return data || []
}

export default {
  getProfile,
  updateProfile,
  getUserStats,
  getChildren,
  bindChild,
  getUserList
}
