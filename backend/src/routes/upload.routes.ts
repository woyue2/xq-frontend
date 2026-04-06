/**
 * [POS] backend/src/routes/upload.routes.ts
 *   所属：路由层 | 角色：上传路由（图片代理上传 + 音频本地存储 + OSS 签名）
 *
 * [INPUT]
 *   - express                        → Router / Response / NextFunction
 *   - ../middlewares/auth.middleware  → authMiddleware / AuthenticatedRequest
 *   - ../errors/AppError             → AppError
 *   - ../config/env                  → env
 *   - multer                         → memoryStorage（图片）/ diskStorage（音频）
 *   - fs / path                      → 音频目录创建
 *
 * [OUTPUT]
 *   - uploadRouter（Express Router）
 *     POST /image     → 代理上传图片到 OSS（imgurl.org），返回 { imageUrl }
 *     POST /audio     → 上传音频到本地 static/audio，返回 { audioUrl }
 *     GET  /signature → 返回 OSS 上传签名凭证（预签名模式，已废弃直传）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/routes/CLAUDE.md 的文件清单
 */
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import {
  authMiddleware,
  type AuthenticatedRequest
} from '../middlewares/auth.middleware';
import { AppError } from '../errors/AppError';
import { env } from '../config/env';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

export const uploadRouter = Router();

const resolveUploadUrl = () => {
  const base = env.OSS_UPLOAD_BASE_URL;
  const token = env.OSS_UPLOAD_TOKEN;

  if (!base) {
    return 'https://oss.example.com/upload';
  }

  if (!token) {
    return base;
  }

  const hasQuery = base.includes('?');
  const sep = hasQuery ? '&' : '?';
  return `${base}${sep}token=${token}`;
};

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const baseDir = env.AUDIO_BASE_DIR;
    const dir = path.isAbsolute(baseDir)
      ? baseDir
      : path.join(process.cwd(), baseDir);

    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const ext = ALLOWED_AUDIO_EXTENSIONS.includes(rawExt) ? rawExt : '.webm';
    const filename = `answer-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}${ext}`;
    cb(null, filename);
  }
});

const MAX_AUDIO_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError(400, 'INVALID_FILE_TYPE', '仅支持图片文件上传'));
    }
    cb(null, true);
  }
});

const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.webm', '.ogg', '.aac'];

const audioUpload = multer({
  storage: audioStorage,
  limits: {
    fileSize: MAX_AUDIO_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!file.mimetype || !file.mimetype.startsWith('audio/')) {
      return cb(
        new AppError(
          400,
          'INVALID_FILE_TYPE',
          '仅支持音频文件上传'
        )
      );
    }
    if (!ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
      return cb(
        new AppError(
          400,
          'INVALID_FILE_EXTENSION',
          `不支持的音频格式: ${ext}`
        )
      );
    }
    cb(null, true);
  }
});

// 代理上传图片到 OSS（imgurl.org），前端只需 POST /upload/image
uploadRouter.post(
  '/image',
  authMiddleware,
  imageUpload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', '未登录');

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) throw new AppError(400, 'NO_FILE', '未找到上传的图片文件');

      const uploadUrl = env.OSS_UPLOAD_BASE_URL;
      const token = env.OSS_UPLOAD_TOKEN;
      if (!uploadUrl) throw new AppError(500, 'OSS_NOT_CONFIGURED', '图床服务未配置');

      const formData = new FormData();
      const ab = file.buffer.buffer.slice(file.buffer.byteOffset, file.buffer.byteOffset + file.buffer.byteLength) as ArrayBuffer;
      formData.append('file', new Blob([ab], { type: file.mimetype }), file.originalname);
      if (token) formData.append('token', token);

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(uploadUrl, { method: 'POST', body: formData, headers });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.error('[upload/image] OSS error:', response.status, text.slice(0, 200));
        throw new AppError(502, 'OSS_UPLOAD_FAILED', `图床上传失败: ${response.status} ${text.slice(0, 100)}`);
      }

      const json = await response.json() as Record<string, unknown>;
      // imgurl.org v3 返回格式: { code: 200, data: { url: '...' } }
      // 检查业务码
      if (typeof json.code === 'number' && json.code !== 200) {
        throw new AppError(502, 'OSS_UPLOAD_FAILED', `图床拒绝上传: ${json.msg ?? json.message ?? json.code}`);
      }
      const url =
        (json.data as any)?.url ||
        (json as any)?.url ||
        (json.data as any)?.src ||
        (json as any)?.src;

      if (!url) throw new AppError(502, 'OSS_NO_URL', '图床未返回图片 URL');

      return res.json({ code: 200, message: 'success', data: { imageUrl: url }, timestamp: Date.now() });
    } catch (err) {
      next(err);
    }
  }
);

// 获取上传签名（图片/音频）
uploadRouter.get(
  '/signature',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      const typeRaw = String(req.query.type ?? 'image').toLowerCase();

      if (typeRaw !== 'image' && typeRaw !== 'audio') {
        throw new AppError(
          400,
          'INVALID_UPLOAD_TYPE',
          '不支持的上传类型',
          undefined,
          2001
        );
      }

      if (typeRaw === 'audio' && req.user.role !== 'teacher' && req.user.role !== 'admin') {
        throw new AppError(
          403,
          'PERMISSION_DENIED',
          '只有教师可以上传音频'
        );
      }

      const now = Date.now();
      const expireAt = now + 5 * 60 * 1000;

      const ext = typeRaw === 'image' ? 'jpg' : 'mp3';
      const key = `${typeRaw}/${req.user.id}/${now}.${ext}`;

      const uploadUrl = resolveUploadUrl();
      const policy = Buffer.from(
        JSON.stringify({
          expiration: new Date(expireAt).toISOString(),
          type: typeRaw
        })
      ).toString('base64');
      const signature = Buffer.from(`signature:${key}`).toString('base64');

      return res.json({
        code: 200,
        message: 'success',
        data: {
          uploadUrl,
          key,
          policy,
          signature,
          expireAt
        },
        timestamp: now
      });
    } catch (err) {
      next(err);
    }
  }
);

// 直接上传音频到本地后端存储，并返回可播放的 /static/audio URL
uploadRouter.post(
  '/audio',
  authMiddleware,
  audioUpload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
        throw new AppError(
          403,
          'PERMISSION_DENIED',
          '只有教师可以上传音频'
        );
      }

      const file = (req as any).file as Express.Multer.File | undefined;

      if (!file) {
        throw new AppError(400, 'NO_FILE', '未找到上传的音频文件');
      }

      const filename = path.basename(file.filename);
      const audioUrl = `/static/audio/${filename}`;

      return res.json({
        code: 200,
        message: 'success',
        data: {
          audioUrl
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);
