/**
 * [POS] src/lib/permissions.ts
 *   所属：lib 层 | 角色：权限标识常量 + 角色权限判断工具函数
 *   兄弟：utils.ts / mock-data.ts / share.ts 等
 *
 * [INPUT]
 *   - @/types  → User
 *
 * [OUTPUT]
 *   - PERMISSIONS（权限标识常量对象）
 *   - isMemberActive / getUserPermissions / Permission 等工具函数/类型
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/lib/CLAUDE.md 的文件清单
 */
import { User } from '@/types';

// 权限标识常量
export const PERMISSIONS = {
  // 问题相关
  QUESTION_CREATE: 'question:create',
  QUESTION_DELETE: 'question:delete',
  QUESTION_PIN: 'question:pin',

  // 回答/评论相关
  ANSWER_CREATE: 'answer:create',
  COMMENT_CREATE: 'comment:create',

  // 审核/管理相关
  AUDIT_READ: 'audit:read',
  AUDIT_APPROVE: 'audit:approve',
  USER_MANAGE: 'user:manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * 检查用户是否在有效期内
 *
 * 约定：
 * - 老师（teacher）：永远视为有效会员，用于解锁管理与审核能力；
 * - 学生（student）：根据 expiresAt 判断是否在有效期内；
 * - 家长（parent）：当前产品形态下仅支持「查看」，不参与课时计费，统一视为非有效会员。
 */
export function isMemberActive(user?: User | null): boolean {
  if (!user) return false;
  if (user.role === 'teacher') return true;
  if (user.role === 'parent') return false;
  if (!user.expiresAt) return false; // 如果没设置有效期，视为无效（严格模式）

  const now = new Date();
  const expiry = new Date(user.expiresAt);
  return expiry > now;
}

/**
 * 获取用户拥有的所有权限列表
 */
export function getUserPermissions(user?: User | null): Permission[] {
  if (!user) return [];

  const isActive = isMemberActive(user);
  const perms: Permission[] = [];

  // 1. 老师权限 (上帝模式)
  if (user.role === 'teacher') {
    return Object.values(PERMISSIONS);
  }

  // 2. 学生权限
  if (user.role === 'student') {
    // 基础权限 (浏览等默认有)

    // 有效期内的高级权限
    if (isActive) {
      perms.push(PERMISSIONS.QUESTION_CREATE);
      perms.push(PERMISSIONS.COMMENT_CREATE);
    }
  }

  // 3. 家长权限
  if (user.role === 'parent') {
    // 家长主要是只读，或者以后加“代充值”
    // 目前没有特殊写权限
  }

  return perms;
}

/**
 * 检查用户是否有特定权限
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  const userPerms = getUserPermissions(user);
  return userPerms.includes(permission);
}
