/**
 * [POS] api/comments.ts
 *   所属：API 路由层 | 角色：评论管理统一入口
 *   简化版：支持列表查询（按 questionId）、创建评论
 *   兄弟：questions.ts / answers.ts / subjects.ts
 *
 * [INPUT]
 *   - @vercel/node          → VercelRequest / VercelResponse
 *   - ./_helpers            → prisma / getUserFromToken / AppError
 *   - ../src/types/dto      → CommentDTO
 *   - HTTP Methods:
 *     - GET /api/comments?questionId=:id: 获取问题的所有评论
 *     - POST /api/comments: 创建评论
 *
 * [OUTPUT]
 *   - 成功: { code: 200, data: {...} }
 *   - 错误: { code: number, message: string, timestamp: number }
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. api/CLAUDE.md 的文件清单
 *   3. vercel.json 的路由配置（如果端点路径变化）
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma, getUserFromToken, AppError } from './_helpers';
import type { CommentDTO } from '../src/types/dto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Client-Version, X-Client-Mode');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET: List comments by questionId
    if (req.method === 'GET') {
      const { questionId } = req.query;

      if (!questionId) {
        return res.status(400).json({
          code: 400,
          message: '缺少 questionId 参数',
          timestamp: Date.now()
        });
      }

      // Get all comments for the question (no need to verify question exists first)
      const comments = await prisma.comment.findMany({
        where: { questionId: questionId as string },
        orderBy: { createdAt: 'desc' }
      });

      const formattedComments: CommentDTO[] = comments.map(c => ({
        id: c.id,
        questionId: c.questionId,
        content: c.content,
        image: c.image || undefined,
        authorId: c.authorId,
        authorName: c.authorName,
        authorAvatar: c.authorAvatar || undefined,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString()
      }));

      return res.json({
        code: 200,
        data: formattedComments,
        timestamp: Date.now()
      });
    }

    // POST: Create comment (requires authentication)
    if (req.method === 'POST') {
      const user = getUserFromToken(req);
      if (!user) {
        return res.status(401).json({
          code: 401,
          message: '未登录或 token 无效',
          timestamp: Date.now()
        });
      }

      const { questionId, content, image } = req.body;

      // Validation: questionId is required
      if (!questionId || questionId.trim() === '') {
        return res.status(400).json({
          code: 400,
          message: 'questionId 为必填项',
          timestamp: Date.now()
        });
      }

      // Validation: content is required and non-empty
      if (!content || content.trim() === '') {
        return res.status(400).json({
          code: 400,
          message: '评论内容为必填项',
          timestamp: Date.now()
        });
      }

      // Verify question exists
      const question = await prisma.question.findUnique({
        where: { id: questionId }
      });

      if (!question) {
        return res.status(404).json({
          code: 404,
          message: '问题不存在',
          timestamp: Date.now()
        });
      }

      // Create comment (use JWT token data directly, no need to query user)
      const comment = await prisma.comment.create({
        data: {
          questionId: questionId.trim(),
          content: content.trim(),
          image: image || null,
          authorId: user.id,
          authorName: user.nickname,
          authorAvatar: null // Avatar not in JWT, set to null for now
        }
      });

      const commentDTO: CommentDTO = {
        id: comment.id,
        questionId: comment.questionId,
        content: comment.content,
        image: comment.image || undefined,
        authorId: comment.authorId,
        authorName: comment.authorName,
        authorAvatar: comment.authorAvatar || undefined,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString()
      };

      return res.status(201).json({
        code: 201,
        data: commentDTO,
        timestamp: Date.now()
      });
    }

    return res.status(405).json({
      code: 405,
      message: '方法不允许',
      timestamp: Date.now()
    });

  } catch (error: unknown) {
    console.error('[Comments API Error]', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        code: error.statusCode,
        message: error.message,
        timestamp: Date.now()
      });
    }
    
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    });
  }
}
