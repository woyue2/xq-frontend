/**
 * [POS] backend/src/config/env.ts
 *   所属：配置层 | 角色：环境变量校验与导出（zod），启动时 fail-fast
 *
 * [INPUT]
 *   - dotenv  → 加载 .env 文件
 *   - zod     → 环境变量 schema 校验
 *
 * [OUTPUT]
 *   - env（校验后的环境变量对象）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 */
import dotenv from 'dotenv';
import { z } from 'zod';

// 优先从 BACKEND_ENV_PATH 指定的文件加载，否则使用 backend 目录下的 .env
dotenv.config({ path: process.env.BACKEND_ENV_PATH ?? '.env' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  // 可选：AI 审核服务配置（用于自定义基于 base_url 的外部审核逻辑）
  AI_AUDIT_BASE_URL: z.string().url().optional(),
  AI_AUDIT_API_KEY: z.string().optional(),
  AI_AUDIT_PROVIDER_NAME: z.string().optional(),
  // 内部 AI 回调接口的访问令牌（可选，配置后将强制校验 X-Internal-Token）
  AI_INTERNAL_TOKEN: z.string().optional(),
  // 后端服务地址，用于构建 AI 审核回调 URL
  BACKEND_URL: z.string().url().default('http://localhost:3000'),
  // 本地音频文件基础目录（可配置为 /data/audio 或相对路径，如 static/audio）
  AUDIO_BASE_DIR: z.string().default('static/audio'),
  OSS_UPLOAD_BASE_URL: z.string().url().optional(),
  OSS_UPLOAD_TOKEN: z.string().optional(),
  // 开发/测试环境固定验证码（生产环境必须为空，CI 强制断言）
  DEV_FIXED_CODE: z.string().optional().refine(
    (val) => {
      if (process.env.NODE_ENV === 'production' && val) return false;
      return true;
    },
    { message: 'DEV_FIXED_CODE must not be set in production' }
  )
});

export const env = envSchema.parse(process.env);
