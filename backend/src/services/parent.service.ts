import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';
import { chromium } from '@playwright/test';

type PrintableQuestion = {
  id: string;
  title: string;
  content: string | null;
  images: string[];
  createdAt: Date;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizePdfFileName = (value: string) => {
  const base = value.trim() || '打印题目';
  return base
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 80);
};

const resolveAssetUrl = (rawUrl: string, requestOrigin: string) => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('/')) return `${requestOrigin}${trimmed}`;
  return `${requestOrigin}/${trimmed}`;
};

const renderPrintPdfHtml = (questions: PrintableQuestion[], fileName: string, requestOrigin: string) => {
  const cards = questions.map((question, index) => {
    const safeTitle = escapeHtml(question.title || '未命名题目');
    const safeContent = escapeHtml(
      question.content?.trim() ? question.content : '（未填写疑问描述）'
    );
    const safeDate = question.createdAt.toISOString().slice(0, 10);
    const imagesHtml =
      question.images.length > 0
        ? `<div class="print-image-grid">${question.images
            .map((url, imageIndex) => {
              const safeUrl = escapeHtml(resolveAssetUrl(url, requestOrigin));
              return `<div class="image-wrapper"><img src="${safeUrl}" alt="question-${index + 1}-image-${imageIndex + 1}" class="print-question-image" /></div>`;
            })
            .join('')}</div>`
        : '<p class="empty-image">（本题未上传图片）</p>';

    return `
      <article class="print-card">
        <div class="head-row">
          <h2>第 ${index + 1} 题</h2>
          <span>${safeDate}</span>
        </div>
        <p class="title">${safeTitle}</p>
        <p class="content">${safeContent.replace(/\n/g, '<br/>')}</p>
        ${imagesHtml}
        <section class="answer-section">
          <p class="answer-title">答题区</p>
          <div class="print-answer-space"></div>
        </section>
      </article>
    `;
  });

  return `
  <!doctype html>
  <html lang="zh-CN">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(fileName)}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          color: #111827;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
        }
        .print-root {
          margin: 0;
          padding: 0;
        }
        .print-card {
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 8mm;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .head-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
        }
        .head-row h2 {
          margin: 0;
          font-size: 16px;
          line-height: 1.4;
        }
        .head-row span {
          color: #9ca3af;
          font-size: 12px;
          line-height: 1;
        }
        .title {
          margin: 0;
          font-size: 14px;
          line-height: 1.7;
          font-weight: 600;
          color: #111827;
        }
        .content {
          margin: 8px 0 0;
          font-size: 14px;
          line-height: 1.7;
          color: #374151;
        }
        .print-image-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 3mm;
          margin-top: 12px;
        }
        .image-wrapper {
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          background: #ffffff;
        }
        .print-question-image {
          width: 100%;
          max-height: 78mm;
          object-fit: contain;
          background: #ffffff;
          display: block;
        }
        .empty-image {
          margin-top: 12px;
          color: #9ca3af;
          font-size: 12px;
        }
        .answer-section {
          margin-top: 16px;
        }
        .answer-title {
          margin: 0 0 8px;
          color: #9ca3af;
          font-size: 12px;
        }
        .print-answer-space {
          min-height: 42mm;
          border: 1px dashed #d1d5db;
          border-radius: 10px;
          background-image: repeating-linear-gradient(to bottom, #ffffff 0px, #ffffff 27px, #f3f4f6 28px);
        }
      </style>
    </head>
    <body>
      <main class="print-root">${cards.join('')}</main>
    </body>
  </html>
  `;
};

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
  async generateQuestionsPdf(params: {
    parentId: string;
    questionIds: string[];
    fileName?: string;
    requestOrigin: string;
  }) {
    const { parentId, questionIds, fileName, requestOrigin } = params;

    const dedupedIds = Array.from(
      new Set(questionIds.filter((id) => typeof id === 'string' && id.trim() !== ''))
    );

    if (dedupedIds.length === 0) {
      throw new AppError(400, 'INVALID_PARAMS', '请先选择要打印的题目');
    }

    // 修改原因：限制单次打印数量，避免移动端一次性导出过大 PDF 导致超时。
    if (dedupedIds.length > 100) {
      throw new AppError(400, 'INVALID_PARAMS', '单次最多打印 100 道题目');
    }

    // 修改原因：与当前前端逻辑保持一致，仅允许导出审核通过题目，避免扩大可见范围。
    const questions = await prisma.question.findMany({
      where: {
        id: { in: dedupedIds },
        status: 'approved'
      },
      select: {
        id: true,
        title: true,
        content: true,
        images: true,
        createdAt: true
      }
    });

    const byId = new Map<string, PrintableQuestion>(
      questions.map((item) => [
        item.id,
        {
          id: item.id,
          title: item.title,
          content: item.content,
          images: Array.isArray(item.images) ? item.images : [],
          createdAt: item.createdAt
        }
      ])
    );

    const ordered = dedupedIds
      .map((id) => byId.get(id))
      .filter((item): item is PrintableQuestion => Boolean(item));
    const missingIds = dedupedIds.filter((id) => !byId.has(id));

    if (ordered.length === 0) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', '没有可导出的题目');
    }

    const safeFileName = sanitizePdfFileName(fileName || '打印题目');
    const html = renderPrintPdfHtml(ordered, safeFileName, requestOrigin);

    let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage({
        viewport: { width: 1240, height: 1754 }
      });
      await page.setContent(html, { waitUntil: 'networkidle' });

      await page.evaluate(async () => {
        const images = Array.from(document.images);
        if (images.length === 0) return;

        const waitAll = Promise.all(
          images.map(
            (image) =>
              new Promise<void>((resolve) => {
                if (image.complete) {
                  resolve();
                  return;
                }
                image.addEventListener('load', () => resolve(), { once: true });
                image.addEventListener('error', () => resolve(), { once: true });
              })
          )
        );

        // ⚠️ 不确定因素：个别外链图片可能长期 pending；这里 3 秒超时后继续导出，避免接口无响应。
        await Promise.race([
          waitAll,
          new Promise<void>((resolve) => {
            window.setTimeout(() => resolve(), 3000);
          })
        ]);
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        }
      });

      // 修改原因：预留 parentId，便于后续若需按“绑定关系”收紧权限时可直接扩展，不影响当前接口签名。
      void parentId;

      return {
        fileName: safeFileName,
        pdfBuffer,
        missingIds
      };
    } catch {
      // ⚠️ 不确定因素：若部署环境未安装 Playwright Chromium 二进制，会进入此分支并返回 503。
      throw new AppError(503, 'PDF_RENDER_FAILED', 'PDF 生成失败，请稍后重试');
    } finally {
      // 修改原因：确保异常路径也能关闭浏览器进程，避免长期运行出现资源泄漏。
      if (browser) {
        await browser.close();
      }
    }
  }

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

    // 5. 姓名验证：匹配真实姓名（忽略首尾空格，避免输入法带空格导致误判）
    // 修改原因：用户修改真实姓名后，绑定时应按规范化值比较。
    const normalizedChildRealName = child.name?.trim();
    const normalizedInputChildName = data.childName.trim();
    if (!normalizedChildRealName || normalizedChildRealName !== normalizedInputChildName) {
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
  async getChildQuestions(
    parentId: string,
    childId: string,
    page: number = 1,
    pageSize: number = 10,
    subject?: string,
    topic?: string
  ) {
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

    const where: any = {
      authorId: childId,
      status: 'approved'
    };

    if (subject) {
      // 修改原因：家长“孩子提问列表”与首页筛选能力对齐，支持按科目过滤。
      where.subject = subject;
    }

    if (topic) {
      // 修改原因：支持家长按考点（tags）过滤。
      // ⚠️ 不确定因素：当前约定是 topic 与 question.tags 文本直接匹配；若后续有别名/标准化字典，需要在此处统一映射。
      where.tags = { hasSome: [topic] };
    }

    const [total, items] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * safePageSize,
        take: safePageSize,
      })
    ]);

    // 修改原因：家长侧问题列表也需要返回“当前家长本人”的点赞/收藏状态，
    // 避免前端卡片刷新后出现固定空心态。
    let likedQuestionIds = new Set<string>();
    let favoritedQuestionIds = new Set<string>();
    if (items.length > 0) {
      const questionIds = items.map((item) => item.id);
      const [likes, favorites] = await Promise.all([
        prisma.like.findMany({
          where: {
            userId: parentId,
            targetType: 'question',
            targetId: { in: questionIds }
          },
          select: { targetId: true }
        }),
        prisma.favorite.findMany({
          where: {
            userId: parentId,
            questionId: { in: questionIds }
          },
          select: { questionId: true }
        })
      ]);

      likedQuestionIds = new Set(likes.map((item) => item.targetId));
      favoritedQuestionIds = new Set(favorites.map((item) => item.questionId));
    }

    return {
      list: items.map((item) => ({
        ...item,
        // ⚠️ 不确定因素：如果后续产品策略改为“家长不可互动”，这两个字段将始终是 false；
        // 这里仍保留输出，保持前后端字段契约稳定。
        isLiked: likedQuestionIds.has(item.id),
        isFavorited: favoritedQuestionIds.has(item.id)
      })),
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
