/**
 * [POS] api/_helpers.ts
 *   所属：API 辅助层 | 角色：Serverless Functions 共享工具（Prisma Client 单例、JWT 验证、错误类、AI 审核）
 *   兄弟：所有 API 文件的依赖基础
 *
 * [INPUT]
 *   - @prisma/client        → PrismaClient
 *   - jsonwebtoken          → jwt
 *   - @vercel/node          → VercelRequest
 *   - process.env           → JWT_SECRET
 *
 * [OUTPUT]
 *   - prisma（Prisma Client 单例，全局复用）
 *   - JWT_SECRET（JWT 密钥）
 *   - AuthUser（认证用户接口）
 *   - getUserFromToken()（从请求中提取用户）
 *   - authenticateToken()（验证 JWT token）
 *   - AppError（统一错误类）
 *   - aiAuditService（AI 内容审核服务）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. api/CLAUDE.md 的文件清单
 *   3. 所有依赖此文件的 API（auth, questions, answers, comments, subjects）
 *
 * [CRITICAL] Prisma Client 单例模式：
 *   - 所有 API 文件必须从此处 import prisma，不得重复初始化
 *   - 违反会导致连接池耗尽（Vercel Serverless 限制）
 */
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import type { VercelRequest } from '@vercel/node';

// Prisma Client Singleton with optimized connection pooling for Serverless
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Ensure singleton in development (hot reload)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// JWT - with fallback for local development
export const JWT_SECRET = process.env.JWT_SECRET || 'A67TvMwv+d70aF6qrfW1FJ6GJ4C9INU63b+VX46Mm5E=';

// Warn if JWT_SECRET is not set in production
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('CRITICAL: JWT_SECRET is not set in production environment!');
}

export interface AuthUser {
  id: string;
  phone: string;
  role: string;
  nickname: string;
}

export function getUserFromToken(req: VercelRequest): AuthUser | null {
  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export function authenticateToken(authHeader: string): AuthUser | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
    public errorCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Mock AI Audit Service (simplified for serverless)
export const aiAuditService = {
  async auditContent(content: string, type: string) {
    // Simple keyword-based check
    const unsafe = ['违规', '不当', '敏感'];
    const hasUnsafe = unsafe.some(word => content.includes(word));
    
    // Check if content is too short/unclear
    const isClear = content.trim().length > 10;
    
    return {
      safe: !hasUnsafe,
      reason: hasUnsafe ? '内容包含不当信息' : undefined,
      category: hasUnsafe ? 'inappropriate' : undefined,
      quality: {
        clear: isClear,
        suggestion: !isClear ? '建议补充具体的题目内容，这样老师才能更好地帮助你哦～' : undefined
      }
    };
  },
  
  async auditImages(images: string[]) {
    // Simplified - always pass for now
    return images.map(() => ({ safe: true }));
  }
};
