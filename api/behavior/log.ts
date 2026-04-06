/**
 * [POS] api/behavior/log.ts
 *   所属：API 路由层 | 角色：行为埋点日志（路由别名）
 *
 * [METHODS]
 *   - POST → 记录用户行为日志
 *
 * 注意：此文件是 /api/behavior/index.ts 的路由别名
 * 实际处理逻辑在 index.ts 中，这里仅做转发
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from './index'

export default handler
