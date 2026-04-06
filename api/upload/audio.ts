/**
 * [POS] api/upload/audio.ts
 *   所属：API 路由层 | 角色：音频上传（路由别名）
 *
 * [METHODS]
 *   - POST → 上传音频到 Supabase Storage
 *
 * 注意：此文件是 /api/upload/index.ts 的路由别名
 * 实际处理逻辑在 index.ts 中，这里仅做转发
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from './index'

// 直接转发到主上传处理器，它会自动识别文件类型
export default handler
