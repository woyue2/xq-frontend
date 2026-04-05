/**
 * [POS] api/behavior/log.ts
 *   所属：API 路由层 | 角色：行为日志上报
 *
 * [METHODS]
 *   - POST → 上报用户行为日志
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'
import { getCurrentUser } from '../_lib/auth'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      code: 405,
      message: '方法不允许',
      timestamp: Date.now()
    })
  }

  try {
    const {
      eventType,
      metadata,
      path,
      referrer,
      sessionId,
      clientTime
    } = req.body

    if (!eventType) {
      return res.status(400).json({
        code: 400,
        message: '事件类型为必填项',
        timestamp: Date.now()
      })
    }

    // 尝试获取当前用户（非必须，允许匿名上报）
    const user = await getCurrentUser(req)

    // 获取请求信息
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    const userAgent = req.headers['user-agent']

    await prisma.behaviorLog.create({
      data: {
        userId: user?.id,
        sessionId,
        eventType,
        metadata: metadata || {},
        path,
        referrer,
        userAgent: userAgent as string,
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress as string,
        clientTime: clientTime ? new Date(clientTime) : null
      }
    })

    return res.status(201).json({
      code: 201,
      message: '日志上报成功',
      timestamp: Date.now()
    })

  } catch (error: any) {
    console.error('[API /behavior/log]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误: ' + (error.message || 'Unknown'),
      error: error.message,
      timestamp: Date.now()
    })
  }
}
