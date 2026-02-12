import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';

// Helper to verify SMS code for parent-child binding.
// 与 AuthService 中验证码校验逻辑保持一致：始终依赖 VerificationCode 表，不再引入环境级“万能码”。
const verifyCode = async (phone: string, code: string, type: string) => {
  const normalizedPhone = phone.replace(/\D/g, '');

  const record = await prisma.verificationCode.findFirst({
    where: {
      phone: normalizedPhone,
      type,
      used: false,
      expireAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!record || record.code !== code) {
    throw new AppError(400, 'INVALID_CODE', '验证码错误或已过期');
  }

  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { used: true }
  });

  return true;
};

export class ParentService {
  /**
   * 绑定孩子
   */
  async bindChild(parentId: string, data: { phone: string; code: string; childName: string; school?: string }) {
    // 1. 验证验证码
    await verifyCode(data.phone, data.code, 'bind_child');

    // 2. 查找孩子账号
    const child = await prisma.user.findUnique({
      where: { phone: data.phone }
    });

    if (!child) {
      throw new AppError(404, 'CHILD_NOT_FOUND', '未找到该手机号对应的学生账号，请先让孩子注册');
    }

    // 校验账号角色：只能绑定学生
    if (child.role !== 'student') {
      throw new AppError(
        400,
        'INVALID_ROLE',
        '该账号不是学生角色，无法绑定'
      );
    }

    if (child.id === parentId) {
      throw new AppError(400, 'INVALID_BINDING', '不能绑定自己');
    }

    // 3. 检查是否已绑定
    const existing = await prisma.parentChild.findUnique({
      where: {
        parentId_childId: {
          parentId,
          childId: child.id
        }
      }
    });

    if (existing) {
      // 返回已绑定状态，由前端决定是否确认再次绑定
      return {
        ...child,
        alreadyBound: true,
        message: '该孩子已被绑定，是否确认再次绑定？'
      };
    }

    // 4. 参数校验：孩子姓名不能为空
    if (!data.childName || data.childName.trim() === '') {
      throw new AppError(400, 'INVALID_CHILD_NAME', '请输入孩子姓名');
    }

    // 5. 姓名验证：精确匹配 name 字段（真实姓名）
    // 注意：如果 child.name 为 null/undefined，视为不匹配
    if (child.name !== data.childName) {
      throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');
    }

    // 6. 创建绑定关系（使用事务确保原子性）
    // 顺便更新学生信息（如果为空）
    // 孩子姓名应该更新到 name 字段（真实姓名），而非 nickname
    const needsNameUpdate = !child.name || child.name.trim() === '';
    const needsNicknameUpdate = !child.nickname || child.nickname.startsWith('用户');

    // 使用 Prisma 事务确保 User.update 和 ParentChild.create 要么都成功，要么都失败
    await prisma.$transaction(async (tx) => {
      if (needsNameUpdate || needsNicknameUpdate || data.school) {
        await tx.user.update({
          where: { id: child.id },
          data: {
            name: needsNameUpdate ? data.childName : undefined,
            nickname: needsNicknameUpdate ? data.childName : undefined,
            school: data.school
          }
        });
      }

      await tx.parentChild.create({
        data: {
          parentId,
          childId: child.id
        }
      });
    });

    // 重新查询以返回最新数据
    const updatedChild = await prisma.user.findUnique({
      where: { id: child.id },
      select: {
        id: true,
        name: true,
        nickname: true,
        avatar: true,
        role: true,
        school: true,
        grade: true
      }
    });

    return updatedChild;
  }

  /**
   * 获取绑定的孩子列表
   */
  async getChildren(parentId: string) {
    const relations = await prisma.parentChild.findMany({
      where: { parentId },
      include: {
        child: {
          select: {
            id: true,
            name: true,
            nickname: true,
            avatar: true,
            role: true,
            school: true,
            grade: true
          }
        }
      },
      // 注意：boundAt 来自 parentChild 表的 createdAt 字段
      // 由于 select 中不能直接包含 createdAt，我们需要在 map 时使用 r.createdAt
    });

    return relations.map((r: { child: { id: string; name?: string | null; nickname: string; avatar?: string | null; role: string; school?: string | null; grade?: string | null }; createdAt: Date }) => ({
      ...r.child,
      name: r.child.nickname,      // 显示用的name（来自nickname）
      realName: r.child.name,      // 真实姓名（来自User.name）
      boundAt: r.createdAt,        // 绑定时间（来自parentChild.createdAt）
      // 注意：age 字段不在 User 表的查询结果中，需要从 User.age 获取，但当前查询未包含
      // 这里暂时不提供 age，让前端将其设为可选
      parentId: parentId
    }));
  }

  /**
   * 解绑孩子
   */
  async unbindChild(parentId: string, childId: string) {
    try {
      await prisma.parentChild.delete({
        where: {
          parentId_childId: {
            parentId,
            childId
          }
        }
      });
    } catch (e) {
      // 忽略已删除或不存在的错误
    }
  }

  /**
   * 获取孩子的问题列表
   */
  async getChildQuestions(parentId: string, childId: string, page: number = 1, pageSize: number = 10) {
    // 验证绑定关系
    const relation = await prisma.parentChild.findUnique({
      where: {
        parentId_childId: {
          parentId,
          childId
        }
      }
    });

    if (!relation) {
      throw new AppError(403, 'FORBIDDEN', '无权查看该孩子的问题');
    }

    const isValidInteger = (value: number) =>
      Number.isFinite(value) && Number.isInteger(value) && value > 0;

    if (!isValidInteger(page) || !isValidInteger(pageSize)) {
      throw new AppError(
        400,
        'INVALID_PAGINATION',
        '分页参数不合法'
      );
    }

    const safePageSize = Math.min(pageSize, 100);

    const where = {
      authorId: childId,
      status: 'approved'
    };

    const [total, items] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * safePageSize,
        take: safePageSize,
      })
    ]);

    return {
      list: items,
      pagination: {
        total,
        page,
        pageSize: safePageSize,
        totalPages: Math.ceil(total / safePageSize)
      }
    };
  }
}

export const parentService = new ParentService();
