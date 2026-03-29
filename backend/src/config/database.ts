/**
 * [POS] backend/src/config/database.ts
 *   所属：配置层 | 角色：Prisma Client 单例，全局共享数据库连接
 *
 * [INPUT]
 *   - @prisma/client → PrismaClient
 *
 * [OUTPUT]
 *   - prisma（PrismaClient 单例）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 */
import { PrismaClient } from '@prisma/client';

// Prisma 客户端单例
export const prisma = new PrismaClient();
