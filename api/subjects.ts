/**
 * [POS] api/subjects.ts
 *   所属：API 路由层 | 角色：科目/考点管理统一入口
 *   简化版：支持科目和考点的增删改查，admin 权限控制，删除保护
 *   兄弟：questions.ts / answers.ts / comments.ts
 *
 * [INPUT]
 *   - @vercel/node          → VercelRequest / VercelResponse
 *   - ./_helpers            → prisma / getUserFromToken / AppError
 *   - ../src/types/dto      → SubjectDTO / TopicDTO
 *   - HTTP Methods:
 *     - GET /api/subjects: 获取所有启用的科目
 *     - POST /api/subjects: 创建科目 (admin)
 *     - PUT /api/subjects?id=:id: 修改科目 (admin)
 *     - DELETE /api/subjects?id=:id: 删除科目 (admin)
 *     - GET /api/subjects?key=:key&topics=1: 获取科目下的考点
 *     - POST /api/subjects?topics=1: 创建考点 (admin)
 *     - PUT /api/subjects?topicId=:id: 修改考点 (admin)
 *     - DELETE /api/subjects?topicId=:id: 删除考点 (admin)
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
import type { SubjectDTO, TopicDTO } from '../src/types/dto';

// ===== Type Definitions =====

interface SubjectUpdateData {
  name?: string;
  description?: string | null;
  order?: number;
  enabled?: boolean;
}

interface TopicUpdateData {
  label?: string;
  order?: number;
  enabled?: boolean;
}

interface ErrorResponse {
  code: number;
  message: string;
  timestamp: number;
}

// ===== Helper Functions =====

/**
 * Check if user is admin (pure function without side effects)
 */
function getAdminUser(req: VercelRequest): { id: string; phone: string; role: string; nickname: string } | null {
  const user = getUserFromToken(req);
  if (!user || user.role !== 'admin') {
    return null;
  }
  return user;
}

/**
 * Send unauthorized/forbidden error response
 */
function sendAuthError(res: VercelResponse, hasUser: boolean): void {
  const code = hasUser ? 403 : 401;
  const message = hasUser ? '权限不足：仅管理员可操作' : '未登录或 token 无效';
  res.status(code).json({ code, message, timestamp: Date.now() });
}

/**
 * Send error response
 */
function sendError(res: VercelResponse, code: number, message: string): void {
  res.status(code).json({ code, message, timestamp: Date.now() });
}

/**
 * Convert Subject model to DTO
 */
function toSubjectDTO(subject: { id: string; key: string; name: string; order: number; enabled: boolean; description: string | null }): SubjectDTO {
  return {
    id: subject.id,
    key: subject.key,
    name: subject.name,
    order: subject.order,
    enabled: subject.enabled,
    description: subject.description || undefined
  };
}

/**
 * Convert Topic model to DTO
 */
function toTopicDTO(topic: { id: string; subjectKey: string; value: string; label: string; order: number; enabled: boolean }): TopicDTO {
  return {
    id: topic.id,
    subjectKey: topic.subjectKey,
    value: topic.value,
    label: topic.label,
    order: topic.order,
    enabled: topic.enabled
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { id, key, topics, topicId } = req.query;

    // ===== SUBJECT ENDPOINTS =====

    // GET: List subjects (public, only enabled=true)
    if (req.method === 'GET' && !topics && !topicId) {
      const subjects = await prisma.subject.findMany({
        where: { enabled: true },
        orderBy: { order: 'asc' }
      });

      return res.json({
        code: 200,
        data: subjects.map(toSubjectDTO),
        timestamp: Date.now()
      });
    }

    // POST: Create subject (admin only)
    if (req.method === 'POST' && !topics) {
      const adminUser = getAdminUser(req);
      if (!adminUser) {
        sendAuthError(res, getUserFromToken(req) !== null);
        return;
      }

      const { key: subjectKey, name, description, order, enabled } = req.body;

      // Validation
      if (!subjectKey || subjectKey.trim() === '') {
        sendError(res, 400, 'key 为必填项');
        return;
      }

      if (!name || name.trim() === '') {
        sendError(res, 400, 'name 为必填项');
        return;
      }

      if (order === undefined || typeof order !== 'number') {
        sendError(res, 400, 'order 为必填项且必须为数字');
        return;
      }

      // Check if key already exists
      const existing = await prisma.subject.findUnique({
        where: { key: subjectKey.trim() }
      });

      if (existing) {
        sendError(res, 409, '科目 key 已存在');
        return;
      }

      // Create subject
      const subject = await prisma.subject.create({
        data: {
          key: subjectKey.trim(),
          name: name.trim(),
          description: description?.trim() || null,
          order,
          enabled: enabled !== undefined ? enabled : true
        }
      });

      return res.status(201).json({
        code: 201,
        data: toSubjectDTO(subject),
        timestamp: Date.now()
      });
    }

    // PUT: Update subject (admin only)
    if (req.method === 'PUT' && id && !topicId) {
      const adminUser = getAdminUser(req);
      if (!adminUser) {
        sendAuthError(res, getUserFromToken(req) !== null);
        return;
      }

      const { name, description, order, enabled } = req.body;

      // Check if subject exists
      const existing = await prisma.subject.findUnique({
        where: { id: id as string }
      });

      if (!existing) {
        sendError(res, 404, '科目不存在');
        return;
      }

      // Build update data
      const updateData: SubjectUpdateData = {};
      if (name !== undefined) {
        if (!name || name.trim() === '') {
          sendError(res, 400, 'name 不能为空');
          return;
        }
        updateData.name = name.trim();
      }
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (order !== undefined) {
        if (typeof order !== 'number') {
          sendError(res, 400, 'order 必须为数字');
          return;
        }
        updateData.order = order;
      }
      if (enabled !== undefined) updateData.enabled = enabled;

      // Update subject
      const updated = await prisma.subject.update({
        where: { id: id as string },
        data: updateData
      });

      return res.json({
        code: 200,
        data: toSubjectDTO(updated),
        timestamp: Date.now()
      });
    }

    // DELETE: Delete subject (admin only, with protection)
    if (req.method === 'DELETE' && id && !topicId) {
      const adminUser = getAdminUser(req);
      if (!adminUser) {
        sendAuthError(res, getUserFromToken(req) !== null);
        return;
      }

      // Check if subject exists
      const existing = await prisma.subject.findUnique({
        where: { id: id as string }
      });

      if (!existing) {
        sendError(res, 404, '科目不存在');
        return;
      }

      // Check for related questions
      const questionCount = await prisma.question.count({
        where: { subject: existing.key }
      });

      if (questionCount > 0) {
        sendError(res, 409, `无法删除：该科目下有 ${questionCount} 个关联问题`);
        return;
      }

      // Check for related topics
      const topicCount = await prisma.topic.count({
        where: { subjectKey: existing.key }
      });

      if (topicCount > 0) {
        sendError(res, 409, `无法删除：该科目下有 ${topicCount} 个关联考点`);
        return;
      }

      // Delete subject
      await prisma.subject.delete({
        where: { id: id as string }
      });

      return res.json({
        code: 200,
        data: { message: '删除成功' },
        timestamp: Date.now()
      });
    }

    // ===== TOPIC ENDPOINTS =====

    // GET: List topics for a subject (public)
    if (req.method === 'GET' && topics === '1' && key) {
      const topicList = await prisma.topic.findMany({
        where: { 
          subjectKey: key as string,
          enabled: true 
        },
        orderBy: { order: 'asc' }
      });

      return res.json({
        code: 200,
        data: topicList.map(toTopicDTO),
        timestamp: Date.now()
      });
    }

    // POST: Create topic (admin only)
    if (req.method === 'POST' && topics === '1') {
      const adminUser = getAdminUser(req);
      if (!adminUser) {
        sendAuthError(res, getUserFromToken(req) !== null);
        return;
      }

      const { subjectKey, value, label, order, enabled } = req.body;

      // Validation
      if (!subjectKey || subjectKey.trim() === '') {
        sendError(res, 400, 'subjectKey 为必填项');
        return;
      }

      if (!value || value.trim() === '') {
        sendError(res, 400, 'value 为必填项');
        return;
      }

      if (!label || label.trim() === '') {
        sendError(res, 400, 'label 为必填项');
        return;
      }

      if (order === undefined || typeof order !== 'number') {
        sendError(res, 400, 'order 为必填项且必须为数字');
        return;
      }

      // Check if subject exists
      const subject = await prisma.subject.findUnique({
        where: { key: subjectKey.trim() }
      });

      if (!subject) {
        sendError(res, 404, '科目不存在');
        return;
      }

      // Check if topic value already exists for this subject
      const existing = await prisma.topic.findUnique({
        where: {
          subjectKey_value: {
            subjectKey: subjectKey.trim(),
            value: value.trim()
          }
        }
      });

      if (existing) {
        sendError(res, 409, '考点 value 在该科目下已存在');
        return;
      }

      // Create topic
      const topic = await prisma.topic.create({
        data: {
          subjectKey: subjectKey.trim(),
          value: value.trim(),
          label: label.trim(),
          order,
          enabled: enabled !== undefined ? enabled : true
        }
      });

      return res.status(201).json({
        code: 201,
        data: toTopicDTO(topic),
        timestamp: Date.now()
      });
    }

    // PUT: Update topic (admin only)
    if (req.method === 'PUT' && topicId) {
      const adminUser = getAdminUser(req);
      if (!adminUser) {
        sendAuthError(res, getUserFromToken(req) !== null);
        return;
      }

      const { label, order, enabled } = req.body;

      // Check if topic exists
      const existing = await prisma.topic.findUnique({
        where: { id: topicId as string }
      });

      if (!existing) {
        sendError(res, 404, '考点不存在');
        return;
      }

      // Build update data
      const updateData: TopicUpdateData = {};
      if (label !== undefined) {
        if (!label || label.trim() === '') {
          sendError(res, 400, 'label 不能为空');
          return;
        }
        updateData.label = label.trim();
      }
      if (order !== undefined) {
        if (typeof order !== 'number') {
          sendError(res, 400, 'order 必须为数字');
          return;
        }
        updateData.order = order;
      }
      if (enabled !== undefined) updateData.enabled = enabled;

      // Update topic
      const updated = await prisma.topic.update({
        where: { id: topicId as string },
        data: updateData
      });

      return res.json({
        code: 200,
        data: toTopicDTO(updated),
        timestamp: Date.now()
      });
    }

    // DELETE: Delete topic (admin only, with protection)
    if (req.method === 'DELETE' && topicId) {
      const adminUser = getAdminUser(req);
      if (!adminUser) {
        sendAuthError(res, getUserFromToken(req) !== null);
        return;
      }

      // Check if topic exists
      const existing = await prisma.topic.findUnique({
        where: { id: topicId as string }
      });

      if (!existing) {
        sendError(res, 404, '考点不存在');
        return;
      }

      // Check for related questions (questions with this topic in tags array)
      const questionCount = await prisma.question.count({
        where: {
          tags: {
            has: existing.value
          }
        }
      });

      if (questionCount > 0) {
        sendError(res, 409, `无法删除：该考点下有 ${questionCount} 个关联问题`);
        return;
      }

      // Delete topic
      await prisma.topic.delete({
        where: { id: topicId as string }
      });

      return res.json({
        code: 200,
        data: { message: '删除成功' },
        timestamp: Date.now()
      });
    }

    // Invalid endpoint
    sendError(res, 400, '无效的请求参数');
  } catch (error: unknown) {
    console.error('[Subjects API Error]', error);
    
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
