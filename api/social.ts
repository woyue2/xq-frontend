/**
 * [POS] api/social.ts
 *   所属：API 路由层 | 角色：社交互动统一入口（interactions + notifications）
 *   兄弟：core.ts / auth.ts / content.ts
 *
 * [INPUT]
 *   - module参数：'interactions' | 'notifications'
 *   - 各模块原始请求参数
 *
 * [OUTPUT]
 *   - 统一路由到 interactions 或 notifications 处理器
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. api/CLAUDE.md 的文件清单
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};
const prisma = globalForPrisma.prisma ?? new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET!;

interface AuthUser {
  id: string;
  phone: string;
  role: string;
  nickname: string;
}

function getUserFromToken(req: VercelRequest): AuthUser | null {
  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

// Interactions Handler
async function interactionsHandler(req: VercelRequest, res: VercelResponse) {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ code: 401, message: '未登录', timestamp: Date.now() });
  }

  // POST /api/interactions/like
  if (req.method === 'POST' && req.url?.includes('/like')) {
    return handleLike(req, res, user);
  }

  // POST /api/interactions/favorite
  if (req.method === 'POST' && req.url?.includes('/favorite')) {
    return handleFavorite(req, res, user);
  }

  return res.status(404).json({ code: 404, message: 'Not found', timestamp: Date.now() });
}

async function handleLike(req: VercelRequest, res: VercelResponse, user: AuthUser) {
  try {
    const { targetType, targetId, action } = req.body;

    if (!targetType || !targetId || !action) {
      return res.status(400).json({
        code: 400,
        message: '缺少必填参数',
        timestamp: Date.now()
      });
    }

    if (targetType !== 'question') {
      return res.status(400).json({
        code: 400,
        message: '当前仅支持问题点赞',
        timestamp: Date.now()
      });
    }

    if (action !== 'like' && action !== 'unlike') {
      return res.status(400).json({
        code: 400,
        message: 'action 只能为 like 或 unlike',
        timestamp: Date.now()
      });
    }

    const question = await prisma.question.findUnique({
      where: { id: targetId }
    });

    if (!question) {
      return res.status(404).json({ code: 404, message: '问题不存在', timestamp: Date.now() });
    }

    if (question.status !== 'approved') {
      return res.status(403).json({
        code: 403,
        message: '无法对未审核通过的问题进行操作',
        timestamp: Date.now()
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.like.findUnique({
        where: {
          userId_targetType_targetId: {
            userId: user.id,
            targetType: 'question',
            targetId
          }
        }
      });

      if (!existing) {
        await tx.like.create({
          data: {
            userId: user.id,
            targetType: 'question',
            targetId
          }
        });

        const updated = await tx.question.update({
          where: { id: targetId },
          data: { likes: { increment: 1 } }
        });

        return { isLiked: true, likes: updated.likes };
      }

      await tx.like.delete({ where: { id: existing.id } });

      const updated = await tx.question.update({
        where: { id: targetId },
        data: { likes: { decrement: 1 } }
      });

      return { isLiked: false, likes: updated.likes };
    });

    return res.json({
      code: 200,
      message: result.isLiked ? '点赞成功' : '取消点赞',
      data: {
        liked: result.isLiked,
        likesCount: result.likes
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[Like Error]', error);
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误: ' + (error.message || 'Unknown'),
      timestamp: Date.now()
    });
  }
}

async function handleFavorite(req: VercelRequest, res: VercelResponse, user: AuthUser) {
  try {
    const { questionId, action } = req.body;

    if (!questionId || !action) {
      return res.status(400).json({
        code: 400,
        message: '缺少必填参数',
        timestamp: Date.now()
      });
    }

    if (action !== 'favorite' && action !== 'unfavorite') {
      return res.status(400).json({
        code: 400,
        message: 'action 只能为 favorite 或 unfavorite',
        timestamp: Date.now()
      });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      return res.status(404).json({ code: 404, message: '问题不存在', timestamp: Date.now() });
    }

    if (question.status !== 'approved') {
      return res.status(403).json({
        code: 403,
        message: '无法对未审核通过的问题进行操作',
        timestamp: Date.now()
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.favorite.findUnique({
        where: {
          userId_questionId: {
            userId: user.id,
            questionId
          }
        }
      });

      if (!existing) {
        await tx.favorite.create({
          data: { userId: user.id, questionId }
        });

        const updated = await tx.question.update({
          where: { id: questionId },
          data: { favorites: { increment: 1 } }
        });

        return { isFavorited: true, favorites: updated.favorites };
      }

      await tx.favorite.delete({ where: { id: existing.id } });

      const updated = await tx.question.update({
        where: { id: questionId },
        data: { favorites: { decrement: 1 } }
      });

      return { isFavorited: false, favorites: updated.favorites };
    });

    return res.json({
      code: 200,
      message: result.isFavorited ? '收藏成功' : '取消收藏',
      data: {
        favorited: result.isFavorited,
        favoritesCount: result.favorites
      },
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('[Favorite Error]', error);
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误: ' + (error.message || 'Unknown'),
      timestamp: Date.now()
    });
  }
}

// Notifications Handler
async function notificationsHandler(req: VercelRequest, res: VercelResponse) {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ code: 401, message: '未登录', timestamp: Date.now() });
  }

  // GET /api/notifications/unread-count
  if (req.method === 'GET' && req.url?.includes('/unread-count')) {
    try {
      const unreadCount = await prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false
        }
      });

      return res.json({
        code: 200,
        data: { unreadCount },
        timestamp: Date.now()
      });
    } catch (error: any) {
      console.error('[Unread Count Error]', error);
      return res.status(500).json({
        code: 500,
        message: '服务器内部错误: ' + (error.message || 'Unknown'),
        timestamp: Date.now()
      });
    }
  }

  // GET /api/notifications
  if (req.method === 'GET') {
    try {
      const { page = '1', pageSize = '10' } = req.query;
      const pageNum = parseInt(page as string);
      const pageSizeNum = parseInt(pageSize as string);
      const skip = (pageNum - 1) * pageSizeNum;

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSizeNum
        }),
        prisma.notification.count({ where: { userId: user.id } })
      ]);

      return res.json({
        code: 200,
        data: {
          items: notifications,
          total,
          page: pageNum,
          pageSize: pageSizeNum,
          totalPages: Math.ceil(total / pageSizeNum)
        },
        timestamp: Date.now()
      });
    } catch (error: any) {
      console.error('[Notifications List Error]', error);
      return res.status(500).json({
        code: 500,
        message: '服务器内部错误: ' + (error.message || 'Unknown'),
        timestamp: Date.now()
      });
    }
  }

  return res.status(404).json({ code: 404, message: 'Not found', timestamp: Date.now() });
}

// 模块映射
const handlers: Record<string, Function> = {
  interactions: interactionsHandler,
  notifications: notificationsHandler,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-request-id, x-client-version, x-client-mode');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { module } = req.query;
    
    if (!module || typeof module !== 'string' || !handlers[module]) {
      return res.status(404).json({ 
        error: 'Module not found',
        available: Object.keys(handlers)
      });
    }

    return await handlers[module](req, res);
    
  } catch (error) {
    console.error('[Social API Error]', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown'
    });
  }
}
