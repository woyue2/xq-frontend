/**
 * [POS] src/lib/supabase.ts
 *   所属：基础设施层 | 角色：Supabase 客户端初始化
 *
 * [INPUT]
 *   - @supabase/supabase-js → createClient
 *   - import.meta.env → VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *
 * [OUTPUT]
 *   - supabase → 全局 Supabase 客户端实例
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing environment variables: ' +
    'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY'
  )
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
)

// Database types
export type Database = {
  public: {
    tables: {
      User: {
        Row: {
          id: string
          phone: string
          name: string | null
          nickname: string
          avatar: string | null
          role: 'student' | 'teacher' | 'parent' | 'admin'
          grade: string | null
          age: number | null
          school: string | null
          is_active: boolean
          is_banned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          phone: string
          nickname: string
          role: 'student' | 'teacher' | 'parent' | 'admin'
          name?: string
          avatar?: string
          grade?: string
          age?: number
          school?: string
        }
        Update: {
          name?: string
          nickname?: string
          avatar?: string
          grade?: string
          age?: number
          school?: string
          is_active?: boolean
        }
      }
      Question: {
        Row: {
          id: string
          title: string
          content: string | null
          subject: string | null
          tags: string[]
          images: string[]
          difficulty: string | null
          status: 'pending' | 'approved' | 'rejected'
          is_good_question: boolean
          is_pinned: boolean
          score: number | null
          ai_result: any
          likes: number
          favorites: number
          comments: number
          answers: number
          understood_count: number
          not_understood_count: number
          author_id: string
          author_name: string
          author_avatar: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          content?: string
          subject?: string
          tags?: string[]
          images?: string[]
          difficulty?: string
          author_id: string
          author_name: string
          author_avatar?: string
        }
        Update: {
          title?: string
          content?: string
          status?: 'pending' | 'approved' | 'rejected'
          is_good_question?: boolean
          is_pinned?: boolean
        }
      }
      Answer: {
        Row: {
          id: string
          question_id: string
          content: string
          images: string[]
          audio_url: string | null
          author_id: string
          author_name: string
          author_avatar: string | null
          likes: number
          status: 'pending' | 'approved' | 'rejected'
          ai_result: any
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          question_id: string
          content: string
          images?: string[]
          audio_url?: string
          author_id: string
          author_name: string
          author_avatar?: string
        }
        Update: {
          content?: string
          status?: 'pending' | 'approved' | 'rejected'
        }
      }
      Comment: {
        Row: {
          id: string
          question_id: string
          content: string
          image: string | null
          author_id: string
          author_name: string
          author_avatar: string | null
          status: 'pending' | 'approved' | 'rejected'
          ai_result: any
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          question_id: string
          content: string
          image?: string
          author_id: string
          author_name: string
          author_avatar?: string
        }
        Update: {
          content?: string
          status?: 'pending' | 'approved' | 'rejected'
        }
      }
    }
  }
}
