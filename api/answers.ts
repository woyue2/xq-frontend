/**
 * [POS] api/answers.ts
 *   所属：API 路由层 | 角色：回答管理统一入口
 *   简化版：支持列表查询（按 questionId）、创建回答
 *   兄弟：questions.ts / comments.ts / subjects.ts
 *
 * [INPUT]
 *   - @vercel/node          → VercelRequest / VercelResponse
 *   - ./_helpers            → prisma / getUserFromToken / AppError
 *   - ../src/types/dto      → AnswerDTO
 *   - HTTP Methods:
 *     - GET /api/answers?questionId=:id: 获取问题的所有回答
 *     - POST /api/answers: 创建回答
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
import { prisma, getUserFromToken, AppError } from './_helpers.js';
import type { AnswerDTO } from '../src/types/dto.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Client-Version, X-Client-Mode');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET: List answers by questionId
    if (req.method === 'GET') {
      const { questionId } = req.query;

      if (!questionId) {
        return res.status(400).json({
          code: 400,
          message: '缺少 questionId 参数',
          timestamp: Date.now()
        });
      }

      // Get all answers for the question (no need to verify question exists first)
      const answers = await prisma.answer.findMany({
        where: { questionId: questionId as string },
        orderBy: { createdAt: 'desc' }
      });

      const formattedAnswers: AnswerDTO[] = answers.map(a => ({
        id: a.id,
        questionId: a.questionId,
        content: a.content,
        images: a.images.length > 0 ? a.images : undefined,
        authorId: a.authorId,
        authorName: a.authorName,
        authorAvatar: a.authorAvatar || undefined,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString()
      }));

      return res.json({
        code: 200,
        data: formattedAnswers,
        timestamp: Date.now()
      });
    }

    // POST: Create answer (requires authentication)
    if (req.method === 'POST') {
      const user = getUserFromToken(req);
      if (!user) {
        return res.status(401).json({
          code: 401,
          message: '未登录或 token 无效',
          timestamp: Date.now()
        });
      }

      const { questionId, content, images } = req.body;

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
          message: '回答内容为必填项',
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

      // Create answer (use JWT token data directly, no need to query user)
      const answer = await prisma.answer.create({
        data: {
          questionId: questionId.trim(),
          content: content.trim(),
          images: images || [],
          authorId: user.id,
          authorName: user.nickname,
          authorAvatar: null // Avatar not in JWT, set to null for now
        }
      });

      const answerDTO: AnswerDTO = {
        id: answer.id,
        questionId: answer.questionId,
        content: answer.content,
        images: answer.images.length > 0 ? answer.images : undefined,
        authorId: answer.authorId,
        authorName: answer.authorName,
        authorAvatar: answer.authorAvatar || undefined,
        createdAt: answer.createdAt.toISOString(),
        updatedAt: answer.updatedAt.toISOString()
      };

      return res.status(201).json({
        code: 201,
        data: answerDTO,
        timestamp: Date.now()
      });
    }

    return res.status(405).json({
      code: 405,
      message: '方法不允许',
      timestamp: Date.now()
    });

  } catch (error: unknown) {
    console.error('[Answers API Error]', error);
    
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
