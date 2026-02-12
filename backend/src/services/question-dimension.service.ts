import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';

export class QuestionDimensionService {
  /**
   * 面向前端配置读取：仅返回启用的维度及其启用的选项
   */
  async getPublicDimensions() {
    const dimensions = await prisma.questionDimension.findMany({
      where: {
        enabled: true
      },
      orderBy: {
        order: 'asc'
      },
      include: {
        options: {
          where: {
            enabled: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    return dimensions;
  }

  /**
   * 管理端使用：返回所有维度及其选项
   */
  async listAllDimensions() {
    const dimensions = await prisma.questionDimension.findMany({
      orderBy: {
        order: 'asc'
      },
      include: {
        options: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    return dimensions;
  }

  async updateDimension(params: {
    key: string;
    name?: string;
    enabled?: boolean;
    multiSelect?: boolean;
  }) {
    const { key, name, enabled, multiSelect } = params;

    const dimension = await prisma.questionDimension.findUnique({
      where: { key }
    });

    if (!dimension) {
      throw new AppError(404, 'DIMENSION_NOT_FOUND', '题目维度不存在');
    }

    const data: any = {};

    if (typeof name === 'string') {
      data.name = name;
    }

    if (typeof enabled === 'boolean') {
      data.enabled = enabled;
    }

    if (typeof multiSelect === 'boolean') {
      data.multiSelect = multiSelect;
    }

    if (Object.keys(data).length === 0) {
      return dimension;
    }

    const updated = await prisma.questionDimension.update({
      where: { key },
      data
    });

    return updated;
  }

  async createOption(params: {
    dimensionKey: string;
    value: string;
    label: string;
    order?: number;
    enabled?: boolean;
  }) {
    const { dimensionKey, value, label, order, enabled } = params;

    const dimension = await prisma.questionDimension.findUnique({
      where: { key: dimensionKey }
    });

    if (!dimension) {
      throw new AppError(404, 'DIMENSION_NOT_FOUND', '题目维度不存在');
    }

    if (!value || !label) {
      throw new AppError(400, 'VALIDATION_ERROR', '参数验证失败', {
        errors: [
          { field: 'value', message: 'value 不能为空' },
          { field: 'label', message: 'label 不能为空' }
        ]
      });
    }

    const existing = await prisma.questionDimensionOption.findFirst({
      where: {
        dimensionKey,
        value
      }
    });

    if (existing) {
      throw new AppError(
        409,
        'OPTION_VALUE_EXISTS',
        '该维度下已存在相同 value 的选项'
      );
    }

    const created = await prisma.questionDimensionOption.create({
      data: {
        dimensionKey,
        value,
        label,
        order: typeof order === 'number' ? order : 0,
        enabled: enabled ?? true
      }
    });

    return created;
  }

  async updateOption(params: {
    id: string;
    dimensionKey?: string;
    label?: string;
    order?: number;
    enabled?: boolean;
  }) {
    const { id, dimensionKey, label, order, enabled } = params;

    const option = await prisma.questionDimensionOption.findUnique({
      where: { id }
    });

    if (!option) {
      throw new AppError(404, 'OPTION_NOT_FOUND', '维度选项不存在');
    }

    // 归属校验：校验该选项是否属于当前请求的维度 key
    if (dimensionKey && option.dimensionKey !== dimensionKey) {
      throw new AppError(
        403,
        'DIMENSION_MISMATCH',
        '选项归属维度不匹配，操作已拒绝'
      );
    }

    const data: any = {};

    if (typeof label === 'string') {
      data.label = label;
    }

    if (typeof order === 'number') {
      data.order = order;
    }

    if (typeof enabled === 'boolean') {
      data.enabled = enabled;
    }

    if (Object.keys(data).length === 0) {
      return option;
    }

    const updated = await prisma.questionDimensionOption.update({
      where: { id },
      data
    });

    return updated;
  }
}

export const questionDimensionService = new QuestionDimensionService();

