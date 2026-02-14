import { test, expect } from '@playwright/test';

const BACKEND_BASE =
  process.env.BACKEND_BASE_URL || 'http://localhost:3000';

async function getRoleToken(role: 'student' | 'teacher' | 'parent') {
  const apiContext = await test.request.newContext({
    baseURL: BACKEND_BASE
  });

  const res = await apiContext.post('/api/internal/test-token', {
    data: { role }
  });

  expect(res.ok(), `获取 ${role} 测试 token 失败`).toBeTruthy();
  const body = (await res.json()) as {
    code: number;
    data: { token: string; user: { id: string } };
  };

  expect(body.code).toBe(200);
  return body.data;
}

test.describe('Admin Whitelist API Bridge（WL-API 系列真实后端链路）', () => {
  test('WL-API-004 + WL-API-001: 教师添加白名单用户后可在列表中检索到', async ({
    request
  }) => {
    const teacher = await getRoleToken('teacher');

    const phone = `13${Date.now().toString().slice(-9)}`;

    const payload = {
      phone,
      name: 'E2E 白名单学生',
      role: 'student',
      validUntil: '2027-12-31T23:59:59.999Z',
      notes: 'E2E-ADMIN-WL'
    };

    const createRes = await request.post(`${BACKEND_BASE}/api/admin/whitelist`, {
      headers: {
        Authorization: `Bearer ${teacher.token}`,
        'Content-Type': 'application/json'
      },
      data: payload
    });

    expect(createRes.status(), '创建白名单记录应返回 201').toBe(201);
    const createdBody = (await createRes.json()) as any;
    expect(createdBody.code).toBe(201);
    expect(createdBody.data.phone).toBe(phone);
    expect(createdBody.data.name).toBe(payload.name);

    const listRes = await request.get(
      `${BACKEND_BASE}/api/admin/whitelist?page=1&pageSize=20&role=student&status=pending`,
      {
        headers: {
          Authorization: `Bearer ${teacher.token}`
        }
      }
    );

    expect(listRes.ok(), '查询白名单列表应成功').toBeTruthy();
    const listBody = (await listRes.json()) as any;
    expect(listBody.code).toBe(200);
    const phones: string[] = listBody.data.list.map((u: any) => u.phone);
    expect(phones).toContain(phone);
  });

  test('WL-API-005: 重复手机号添加返回 PHONE_EXISTS', async ({ request }) => {
    const teacher = await getRoleToken('teacher');
    const phone = `15${Date.now().toString().slice(-9)}`;

    const firstRes = await request.post(`${BACKEND_BASE}/api/admin/whitelist`, {
      headers: {
        Authorization: `Bearer ${teacher.token}`,
        'Content-Type': 'application/json'
      },
      data: {
        phone,
        name: '已有白名单用户',
        role: 'student',
        validUntil: '2026-12-31T23:59:59.999Z'
      }
    });
    expect(firstRes.status(), '首次添加应成功').toBe(201);

    const dupRes = await request.post(`${BACKEND_BASE}/api/admin/whitelist`, {
      headers: {
        Authorization: `Bearer ${teacher.token}`,
        'Content-Type': 'application/json'
      },
      data: {
        phone,
        name: '重复用户',
        role: 'student'
      }
    });

    expect(dupRes.status(), '重复手机号应返回 409').toBe(409);
    const dupBody = (await dupRes.json()) as any;
    expect(dupBody.error).toBe('PHONE_EXISTS');
  });

  test('WL-API-006: 非法参数返回 VALIDATION_ERROR', async ({ request }) => {
    const teacher = await getRoleToken('teacher');

    const res = await request.post(`${BACKEND_BASE}/api/admin/whitelist`, {
      headers: {
        Authorization: `Bearer ${teacher.token}`,
        'Content-Type': 'application/json'
      },
      data: {
        phone: '138001380', // 长度不够
        name: '',
        role: 'invalid_role'
      }
    });

    expect(res.status()).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  test('WL-API-002: 非教师角色访问 /api/admin/whitelist 被拒绝', async ({
    request
  }) => {
    const student = await getRoleToken('student');
    const parent = await getRoleToken('parent');

    const studentRes = await request.get(`${BACKEND_BASE}/api/admin/whitelist`, {
      headers: {
        Authorization: `Bearer ${student.token}`
      }
    });
    expect(studentRes.status()).toBe(403);
    const studentBody = (await studentRes.json()) as any;
    expect(studentBody.error).toBe('PERMISSION_DENIED');

    const parentRes = await request.get(`${BACKEND_BASE}/api/admin/whitelist`, {
      headers: {
        Authorization: `Bearer ${parent.token}`
      }
    });
    expect(parentRes.status()).toBe(403);
    const parentBody = (await parentRes.json()) as any;
    expect(parentBody.error).toBe('PERMISSION_DENIED');
  });

  test('WL-API-007/008: 更新课时有效期与不存在 ID 的 404 行为', async ({
    request
  }) => {
    const teacher = await getRoleToken('teacher');
    const phone = `17${Date.now().toString().slice(-9)}`;

    const createRes = await request.post(`${BACKEND_BASE}/api/admin/whitelist`, {
      headers: {
        Authorization: `Bearer ${teacher.token}`,
        'Content-Type': 'application/json'
      },
      data: {
        phone,
        name: '课时测试用户',
        role: 'student',
        validUntil: '2026-06-30T23:59:59.999Z'
      }
    });
    expect(createRes.status()).toBe(201);
    const createdBody = (await createRes.json()) as any;
    const whitelistId = createdBody.data.id as string;

    const patchRes = await request.patch(
      `${BACKEND_BASE}/api/admin/whitelist/${whitelistId}`,
      {
        headers: {
          Authorization: `Bearer ${teacher.token}`,
          'Content-Type': 'application/json'
        },
        data: {
          validUntil: '2027-12-31T23:59:59.999Z'
        }
      }
    );

    expect(patchRes.status()).toBe(200);
    const patchBody = (await patchRes.json()) as any;
    expect(patchBody.code).toBe(200);
    expect(patchBody.message).toBe('更新成功');
    expect(patchBody.data.validUntil).toBeDefined();

    const notFoundRes = await request.patch(
      `${BACKEND_BASE}/api/admin/whitelist/non-exist-id`,
      {
        headers: {
          Authorization: `Bearer ${teacher.token}`,
          'Content-Type': 'application/json'
        },
        data: {
          validUntil: '2027-12-31T23:59:59.999Z'
        }
      }
    );
    expect(notFoundRes.status()).toBe(404);
    const notFoundBody = (await notFoundRes.json()) as any;
    expect(notFoundBody.error).toBe('WHITELIST_NOT_FOUND');
  });

  test('WL-API-009: 删除待注册白名单用户返回 200', async ({ request }) => {
    const teacher = await getRoleToken('teacher');
    const phone = `18${Date.now().toString().slice(-9)}`;

    const createRes = await request.post(`${BACKEND_BASE}/api/admin/whitelist`, {
      headers: {
        Authorization: `Bearer ${teacher.token}`,
        'Content-Type': 'application/json'
      },
      data: {
        phone,
        name: '待删除白名单用户',
        role: 'student'
      }
    });
    expect(createRes.status()).toBe(201);
    const createdBody = (await createRes.json()) as any;
    const whitelistId = createdBody.data.id as string;

    const deleteRes = await request.delete(
      `${BACKEND_BASE}/api/admin/whitelist/${whitelistId}`,
      {
        headers: {
          Authorization: `Bearer ${teacher.token}`
        }
      }
    );

    expect(deleteRes.status()).toBe(200);
    const deleteBody = (await deleteRes.json()) as any;
    expect(deleteBody.message).toBe('删除成功');
  });
});
