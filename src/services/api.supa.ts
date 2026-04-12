/**
 * [POS] src/services/api.supa.ts
 *   所属：服务层 | 角色：Supabase API 统一入口
 *
 * [DESCRIPTION]
 *   提供基于 Supabase 的混合 API 调用方式：
 *   - 查询类操作：直接使用 Supabase 客户端（低延迟）
 *   - 写入类操作：调用 Vercel API（保证事务一致性）
 *
 * [USAGE]
 *   import { questionApi, userApi, realtimeApi } from '@/services/api.supa'
 *
 *   // 查询 - 直查 Supabase
 *   const questions = await questionApi.list({ subjectId: 'math' })
 *
 *   // 写入 - 调 Vercel API
 *   await questionApi.create({ title: '...', content: '...' })
 *
 *   // 实时订阅
 *   const unsubscribe = realtimeApi.subscribeQuestions((payload) => {
 *     console.log('New question:', payload.new)
 *   })
 */
export { default as questionApi } from './question.supa'
export { default as userApi } from './user.supa'
// TODO: Re-enable when interaction.supa is available
// export { default as interactionApi } from './interaction.supa'
export { default as realtimeApi } from './realtime.supa'

// Re-export types
export type { Question, CreateQuestionData, ListParams } from './question.supa'
export type { User, UpdateProfileData } from './user.supa'
// TODO: Re-enable when interaction.supa is available
// export type { Favorite, Understanding } from './interaction.supa'
export type {
  QuestionChangePayload,
  AnswerChangePayload,
  NotificationChangePayload
} from './realtime.supa'
