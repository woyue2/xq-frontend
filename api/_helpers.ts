/**
 * Shared helper functions for Vercel serverless functions
 */
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import type { VercelRequest } from '@vercel/node';

// Prisma Client Singleton
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// JWT
export const JWT_SECRET = process.env.JWT_SECRET!;

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
    public details?: any,
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
