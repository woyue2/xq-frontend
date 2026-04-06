/**
 * [POS] api/subjects/index.ts
 *   所属：API 路由�?| 角色：学�?考点管理
 *
 * [METHODS]
 *   - GET �?获取学科列表及考点
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'

// === 内联 Prisma 客户�?===
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma = globalForPrisma.prisma ?? new PrismaClient()

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      code: 405,
      message: '方法不允�?,
      timestamp: Date.now()
    })
  }

  try {
    const { withTopics = 'true', subjectKey } = req.query

    // 如果指定了学科key，只返回该学科及其考点
    if (subjectKey) {
      const subject = await prisma.subject.findUnique({
        where: { 
          key: subjectKey as string,
          enabled: true 
        },
        include: {
          topics: {
            where: { enabled: true },
            orderBy: { order: 'asc' }
          }
        }
      })

      if (!subject) {
        return res.status(404).json({
          code: 404,
          message: '学科不存�?,
          timestamp: Date.now()
        })
      }

      return res.json({
        code: 200,
        data: subject,
        timestamp: Date.now()
      })
    }

    // 返回所有启用的学科
    const subjects = await prisma.subject.findMany({
      where: { enabled: true },
      orderBy: { order: 'asc' },
      include: withTopics === 'true' ? {
        topics: {
          where: { enabled: true },
          orderBy: { order: 'asc' }
        }
      } : undefined
    })

    return res.json({
      code: 200,
      data: subjects,
      timestamp: Date.now()
    })

  } catch (error: any) {
    console.error('[API /subjects]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错�? ' + (error.message || 'Unknown'),
      error: error.message,
      timestamp: Date.now()
    })
  }
}
