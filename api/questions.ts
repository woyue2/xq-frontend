/**
 * [POS] api/questions.ts
 *   所属：API 路由层 | 角色：问题管理统一入口
 *   简化版：支持列表查询、创建、详情、修改
 *   兄弟：answers.ts / comments.ts / subjects.ts
 *
 * [INPUT]
 *   - @vercel/node          → VercelRequest / VercelResponse
 *   - ./_helpers            → prisma / getUserFromToken / AppError
 *   - ../src/types/dto      → QuestionDTO
 *   - HTTP Methods:
 *     - GET /api/questions: 列表查询（分页、筛选、搜索）
 *     - POST /api/questions: 创建问题
 *     - GET /api/questions?id=:id: 获取详情
 *     - PUT /api/questions?id=:id: 修改问题
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
import type { QuestionDTO } from '../src/types/dto.js';

// ===== Type Definitions =====

interface QuestionWhereInput {
  subject?: string;
  tags?: { has: string };
  OR?: Array<{
    title?: { contains: string; mode: 'insensitive' };
    content?: { contains: string; mode: 'insensitive' };
  }>;
}

interface QuestionUpdateData {
  title?: string;
  content?: string | null;
  subject?: string;
  tags?: string[];
  images?: string[];
}

// ===== Helper Functions =====

/**
 * Send error response
 */
function sendError(res: VercelResponse, code: number, message: string): void {
  res.status(code).json({ code, message, timestamp: Date.now() });
}

/**
 * Convert Question model to DTO
 */
function toQuestionDTO(question: {
  id: string;
  title: string;
  content: string | null;
  subject: string | null;
  tags: string[];
  images: string[];
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  createdAt: Date;
  updatedAt: Date;
  answerList: unknown[];
}): QuestionDTO {
  return {
    id: question.id,
    title: question.title,
    content: question.content || undefined,
    subject: question.subject || undefined,
    tags: question.tags,
    images: question.images,
    authorId: question.authorId,
    authorName: question.authorName,
    authorAvatar: question.authorAvatar || undefined,
    createdAt: question.createdAt.toISOString(),
    updatedAt: question.updatedAt.toISOString(),
    answerCount: question.answerList.length
  };
}

/**
 * Validate question title
 */
function validateTitle(title: string | undefined, isUpdate: boolean): string | null {
  if (!isUpdate && (!title || title.trim() === '')) {
    return '标题为必填项';
  }
  if (isUpdate && title !== undefined && (!title || title.trim() === '')) {
    return '标题为必填项';
  }
  if (title && title.length > 100) {
    return '标题最多100字';
  }
  return null;
}

/**
 * Validate question content
 */
function validateContent(content: string | undefined): string | null {
  if (content && content.length > 500) {
    return '内容最多500字';
  }
  return null;
}

/**
 * Validate question subject
 */
function validateSubject(subject: string | undefined, isUpdate: boolean): string | null {
  if (!isUpdate && (!subject || subject.trim() === '')) {
    return '科目为必填项';
  }
  if (isUpdate && subject !== undefined && (!subject || subject.trim() === '')) {
    return '科目为必填项';
  }
  return null;
}

/**
 * Validate question images
 */
function validateImages(images: unknown): string | null {
  if (images && Array.isArray(images) && images.length > 3) {
    return '最多上传3张图片';
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Client-Version, X-Client-Mode');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET: List or Detail
    if (req.method === 'GET') {
      const { id } = req.query;

      // Detail endpoint
      if (id) {
        const question = await prisma.question.findUnique({
          where: { id: id as string },
          include: {
            answerList: {
              orderBy: { createdAt: 'desc' }
            }
          }
        });

        if (!question) {
          sendError(res, 404, '问题不存在');
          return;
        }

        return res.json({
          code: 200,
          data: toQuestionDTO(question),
          timestamp: Date.now()
        });
      }

      // List endpoint with pagination, filtering, and search
      const { 
        page = '1', 
        pageSize = '10',
        subject,
        topic,
        search
      } = req.query;

      const pageNum = parseInt(page as string);
      const pageSizeNum = parseInt(pageSize as string);
      const skip = (pageNum - 1) * pageSizeNum;

      const where: QuestionWhereInput = {};
      if (subject && subject !== '') where.subject = subject as string;
      if (topic && topic !== '') {
        where.tags = { has: topic as string };
      }
      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { content: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      const [items, total] = await Promise.all([
        prisma.question.findMany({
          where,
          skip,
          take: pageSizeNum,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { answerList: true }
            }
          }
        }),
        prisma.question.count({ where })
      ]);

      // Map items with answer count
      const itemsWithCount = items.map(item => ({
        ...item,
        answerList: Array(item._count.answerList).fill(null) // Create array with correct length for toQuestionDTO
      }));

      return res.json({
        code: 200,
        data: {
          items: itemsWithCount.map(toQuestionDTO),
          total,
          page: pageNum,
          pageSize: pageSizeNum,
          totalPages: Math.ceil(total / pageSizeNum)
        },
        timestamp: Date.now()
      });
    }

    // POST: Create question (requires authentication)
    if (req.method === 'POST') {
      const user = getUserFromToken(req);
      if (!user) {
        sendError(res, 401, '未登录或 token 无效');
        return;
      }

      const { title, content, subject, tags, images } = req.body;

      // Validation
      const titleError = validateTitle(title, false);
      if (titleError) {
        sendError(res, 400, titleError);
        return;
      }

      const contentError = validateContent(content);
      if (contentError) {
        sendError(res, 400, contentError);
        return;
      }

      const subjectError = validateSubject(subject, false);
      if (subjectError) {
        sendError(res, 400, subjectError);
        return;
      }

      const imagesError = validateImages(images);
      if (imagesError) {
        sendError(res, 400, imagesError);
        return;
      }

      // Create question (use JWT token data directly, no need to query user)
      const question = await prisma.question.create({
        data: {
          title: title.trim(),
          content: content?.trim() || null,
          subject: subject.trim(),
          tags: tags || [],
          images: images || [],
          authorId: user.id,
          authorName: user.nickname,
          authorAvatar: null // Avatar not in JWT, set to null for now
        }
      });

      return res.status(201).json({
        code: 201,
        data: toQuestionDTO({ ...question, answerList: [] }),
        timestamp: Date.now()
      });
    }

    // PUT: Update question (requires authentication and ownership)
    if (req.method === 'PUT') {
      const user = getUserFromToken(req);
      if (!user) {
        sendError(res, 401, '未登录或 token 无效');
        return;
      }

      const { id } = req.query;
      if (!id) {
        sendError(res, 400, '缺少问题 ID');
        return;
      }

      // Check if question exists
      const existingQuestion = await prisma.question.findUnique({
        where: { id: id as string }
      });

      if (!existingQuestion) {
        sendError(res, 404, '问题不存在');
        return;
      }

      // Check ownership
      if (existingQuestion.authorId !== user.id) {
        sendError(res, 403, '权限不足：仅作者可修改');
        return;
      }

      const { title, content, subject, tags, images } = req.body;

      // Validation
      const titleError = validateTitle(title, true);
      if (titleError) {
        sendError(res, 400, titleError);
        return;
      }

      const contentError = validateContent(content);
      if (contentError) {
        sendError(res, 400, contentError);
        return;
      }

      const subjectError = validateSubject(subject, true);
      if (subjectError) {
        sendError(res, 400, subjectError);
        return;
      }

      const imagesError = validateImages(images);
      if (imagesError) {
        sendError(res, 400, imagesError);
        return;
      }

      // Update question
      const updateData: QuestionUpdateData = {};
      if (title !== undefined) updateData.title = title.trim();
      if (content !== undefined) updateData.content = content?.trim() || null;
      if (subject !== undefined) updateData.subject = subject.trim();
      if (tags !== undefined) updateData.tags = tags;
      if (images !== undefined) updateData.images = images;

      const updatedQuestion = await prisma.question.update({
        where: { id: id as string },
        data: updateData,
        include: {
          answerList: true
        }
      });

      return res.json({
        code: 200,
        data: toQuestionDTO(updatedQuestion),
        timestamp: Date.now()
      });
    }

    sendError(res, 405, '方法不允许');
  } catch (error: unknown) {
    console.error('[Questions API Error]', error);
    
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
