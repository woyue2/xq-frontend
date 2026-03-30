/**
 * [POS] backend/src/services/subject.service.ts
 *   所属：服务层 | 角色：科目/考点业务逻辑（增删改查）
 *
 * [INPUT]
 *   - ../config/database → prisma
 *   - ../errors/AppError → AppError
 *
 * [OUTPUT]
 *   - subjectService（SubjectService 单例）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/services/CLAUDE.md 的文件清单
 */
import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';

export class SubjectService {
  /**
   * 面向前端配置读取：仅返回启用的科目及其启用的考点
   */
  async getPublicSubjects() {
    const subjects = await prisma.subject.findMany({
      where: { enabled: true },
      orderBy: { order: 'asc' },
      include: {
        topics: {
          where: { enabled: true },
          orderBy: { order: 'asc' }
        }
      }
    });
    return subjects;
  }

  /**
   * 管理端：返回所有科目及其考点
   */
  async listAllSubjects() {
    const subjects = await prisma.subject.findMany({
      orderBy: { order: 'asc' },
      include: {
        topics: {
          orderBy: { order: 'asc' }
        }
      }
    });
    return subjects;
  }

  async createSubject(params: {
    key: string;
    name: string;
    order?: number;
    description?: string;
  }) {
    const { key, name, order = 0, description } = params;

    const existing = await prisma.subject.findUnique({ where: { key } });
    if (existing) {
      throw new AppError(409, 'SUBJECT_KEY_EXISTS', `科目 key "${key}" 已存在`);
    }

    return prisma.subject.create({
      data: { key, name, order, description },
      include: { topics: { orderBy: { order: 'asc' } } }
    });
  }

  async updateSubject(params: {
    key: string;
    name?: string;
    enabled?: boolean;
    order?: number;
    description?: string;
  }) {
    const { key, ...rest } = params;

    const subject = await prisma.subject.findUnique({ where: { key } });
    if (!subject) {
      throw new AppError(404, 'SUBJECT_NOT_FOUND', '科目不存在');
    }

    const data: any = {};
    if (typeof rest.name === 'string') data.name = rest.name;
    if (typeof rest.enabled === 'boolean') data.enabled = rest.enabled;
    if (typeof rest.order === 'number') data.order = rest.order;
    if (typeof rest.description === 'string') data.description = rest.description;

    if (Object.keys(data).length === 0) return subject;

    return prisma.subject.update({ where: { key }, data });
  }

  async createTopic(params: {
    subjectKey: string;
    value: string;
    label: string;
    order?: number;
  }) {
    const { subjectKey, value, label, order = 0 } = params;

    const subject = await prisma.subject.findUnique({ where: { key: subjectKey } });
    if (!subject) {
      throw new AppError(404, 'SUBJECT_NOT_FOUND', '所属科目不存在');
    }

    const existing = await prisma.topic.findUnique({
      where: { subjectKey_value: { subjectKey, value } }
    });
    if (existing) {
      throw new AppError(409, 'TOPIC_VALUE_EXISTS', `考点 value "${value}" 在该科目下已存在`);
    }

    return prisma.topic.create({ data: { subjectKey, value, label, order } });
  }

  async updateTopic(params: {
    id: string;
    subjectKey?: string;
    label?: string;
    order?: number;
    enabled?: boolean;
  }) {
    const { id, subjectKey, ...rest } = params;

    const topic = await prisma.topic.findUnique({ where: { id } });
    if (!topic) {
      throw new AppError(404, 'TOPIC_NOT_FOUND', '考点不存在');
    }

    if (subjectKey && topic.subjectKey !== subjectKey) {
      throw new AppError(403, 'SUBJECT_MISMATCH', '考点归属科目不匹配，操作已拒绝');
    }

    const data: any = {};
    if (typeof rest.label === 'string') data.label = rest.label;
    if (typeof rest.order === 'number') data.order = rest.order;
    if (typeof rest.enabled === 'boolean') data.enabled = rest.enabled;

    if (Object.keys(data).length === 0) return topic;

    return prisma.topic.update({ where: { id }, data });
  }
}

export const subjectService = new SubjectService();
