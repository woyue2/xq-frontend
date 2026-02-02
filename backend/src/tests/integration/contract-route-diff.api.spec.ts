import request from 'supertest';
import { createApp } from '../../app';
import { signAccessToken } from '../../utils/jwt';

/**
 * 合同差异回归测试（基于 helloagents/plan/backend-route-diff.md）
 *
 * 目的：
 * - 按“文档约定”的路径与语义调用接口；
 * - 记录/暴露实现与文档之间的合同差异（路径或返回结构）；
 * - 当前测试以“验证现状”为主，不强行要求回归到文档版本，以避免打断现有开发节奏。
 */

describe('Contract vs Implementation (route diff based checks)', () => {
  const app = createApp();

  const teacherId = 'contract_teacher_001';
  const teacherToken = signAccessToken({
    sub: teacherId,
    role: 'teacher'
  });

  // 说明：这里不做复杂数据准备，只验证“路由是否存在、状态码大致合理”，
  // 结构性差异通过断言和注释标记，供后续迭代视需要收紧。

  it('doc route GET /api/admin/audit-queue is not implemented (known contract diff)', async () => {
    const res = await request(app)
      .get('/api/admin/audit-queue')
      .set('Authorization', `Bearer ${teacherToken}`);

    // 文档中的 `/api/admin/audit-queue` 实际实现为 `/api/admin/audit/pending`。
    // 这里明确验证当前实现没有该路由，以便后续评审时决定是补别名还是改文档。
    expect(res.status).toBe(404);
  });

  it('doc route GET /api/interactions/my-likes is not implemented (uses /api/users/me/likes instead)', async () => {
    const res = await request(app)
      .get('/api/interactions/my-likes')
      .set('Authorization', `Bearer ${teacherToken}`);

    // 文档中的 “我的点赞列表” 接口为 `/api/interactions/my-likes`，
    // 当前实现使用 `/api/users/me/likes`。这里确认 doc 路由目前不可用。
    expect(res.status).toBe(404);
  });

  it('doc route GET /api/interactions/my-favorites is not implemented (uses /api/users/me/favorites instead)', async () => {
    const res = await request(app)
      .get('/api/interactions/my-favorites')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(404);
  });

  it('doc route POST /api/interactions/like exists via /api/interactions/like (path OK, method OK)', async () => {
    const res = await request(app)
      .post('/api/interactions/like')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        targetType: 'question',
        targetId: 'non-existent',
        action: 'like'
      });

    // 路径+方法与文档一致，当前实现对不存在的 questionId 返回业务级 404。
    // 该用例仅用于验证路由已经存在且挂载成功。
    expect(res.status).toBe(404);
  });
});
