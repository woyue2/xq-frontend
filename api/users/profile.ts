/**
 * [POS] api/users/profile.ts
 *   所属：API 路由层 | 角色：用户资料管理
 *
 * [METHODS]
 *   - GET  → 获取用户详细资料
 *   - PUT  → 更新用户资料
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../../src/lib/prisma'
import { requireAuth } from '../_lib/auth'

async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const userId = req.user?.id

  // GET - 获取用户详细资料
  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phone: true,
          name: true,
          nickname: true,
          avatar: true,
          role: true,
          grade: true,
          age: true,
          school: true,
          expiresAt: true,
          createdAt: true,
          isActive: true,
          whitelist: {
            select: {
              validUntil: true,
              notes: true
            }
          }
        }
      })

      if (!user) {
        return res.status(404).json({
          code: 404,
          message: '用户不存在',
          timestamp: Date.now()
        })
      }

      // 获取统计信息
      const [questionCount, answerCount, favoriteCount] = await Promise.all([
        prisma.question.count({ where: { authorId: userId } }),
        prisma.answer.count({ where: { authorId: userId } }),
        prisma.favorite.count({ where: { userId } })
      ])

      return res.json({
        code: 200,
        data: {
          ...user,
          stats: {
            questionCount,
            answerCount,
            favoriteCount
          }
        },
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('[API /users/profile GET]', error)
      return res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        timestamp: Date.now()
      })
    }
  }

  // PUT - 更新用户资料
  if (req.method === 'PUT') {
    try {
      const { nickname, avatar, grade, age, school, name } = req.body

      // 构建更新数据
      const updateData: any = {}
      if (nickname !== undefined) updateData.nickname = nickname
      if (avatar !== undefined) updateData.avatar = avatar
      if (grade !== undefined) updateData.grade = grade
      if (age !== undefined) updateData.age = age
      if (school !== undefined) updateData.school = school
      if (name !== undefined) updateData.name = name

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          code: 400,
          message: '没有要更新的字段',
          timestamp: Date.now()
        })
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          phone: true,
          name: true,
          nickname: true,
          avatar: true,
          role: true,
          grade: true,
          age: true,
          school: true,
          updatedAt: true
        }
      })

      return res.json({
        code: 200,
        data: user,
        message: '资料更新成功',
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('[API /users/profile PUT]', error)
      return res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        timestamp: Date.now()
      })
    }
  }

  return res.status(405).json({
    code: 405,
    message: '方法不允许',
    timestamp: Date.now()
  })
}

export default requireAuth(handler)
