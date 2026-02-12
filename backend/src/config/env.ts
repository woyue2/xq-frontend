import dotenv from 'dotenv';
import { z } from 'zod';

// 优先从 BACKEND_ENV_PATH 指定的文件加载，否则使用 backend 目录下的 .env
dotenv.config({ path: process.env.BACKEND_ENV_PATH ?? '.env' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  // CORS 白名单，允许的来源域名（支持多个，用逗号分隔）
  // 生产环境必须配置，禁止使用 *（通配符）
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
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
  BACKEND_URL: z.string().url().default('http://localhost:4000'),
  // 本地音频文件基础目录（可配置为 /data/audio 或相对路径，如 static/audio）
  AUDIO_BASE_DIR: z.string().default('static/audio'),
  OSS_UPLOAD_BASE_URL: z.string().url().optional(),
  OSS_UPLOAD_TOKEN: z.string().optional()
});

export const env = envSchema.parse(process.env);
