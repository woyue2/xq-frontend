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
import { aiAuditService } from '../services/ai-audit.service';
import { coreLogger } from '../middlewares/logger.middleware';

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

const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.webm', '.ogg', '.aac'];
const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const IMAGE_PROXY_TIMEOUT_MS = 8000;

const getImageProxyAllowedHosts = () => {
  const hosts = new Set<string>([
    // 修改原因：当前线上已观察到该图床域名在前端直连时偶发 HTTP2 协议错误，需支持代理兜底。
    's3.bmp.ovh',
    // 修改原因：保留 ImgURL 主域名以兼容后续可能的返回地址变化。
    'imgurl.org',
    'www.imgurl.org'
  ]);

  if (env.OSS_UPLOAD_BASE_URL) {
    try {
      hosts.add(new URL(env.OSS_UPLOAD_BASE_URL).hostname.toLowerCase());
    } catch {
      // ⚠️ 不确定因素：若 OSS_UPLOAD_BASE_URL 非法，当前仅忽略该动态域名，不影响默认白名单生效。
    }
  }

  return hosts;
};

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'static', 'image');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const ext = ALLOWED_IMAGE_EXTENSIONS.includes(rawExt) ? rawExt : '.jpg';
    const filename = `image-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, filename);
  }
});

const imageUploadLocal = multer({
  storage: imageStorage,
  limits: {
    fileSize: MAX_IMAGE_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(
        new AppError(400, 'INVALID_FILE_TYPE', '仅支持图片文件上传')
      );
    }
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      return cb(
        new AppError(400, 'INVALID_FILE_EXTENSION', `不支持的图片格式: ${ext}`)
      );
    }
    cb(null, true);
  }
});

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

const toBearerToken = (token: string) =>
  token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;

const deleteUploadedImage = async (imageUrl: string): Promise<boolean> => {
  try {
    const parsed = new URL(imageUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    const headers: Record<string, string> = {};
    if (env.OSS_UPLOAD_TOKEN) {
      headers.Authorization = toBearerToken(env.OSS_UPLOAD_TOKEN);
    }

    // 修改原因：上传后审核不通过时立即删除图片，避免违规图片继续留在图床。
    // ⚠️ 不确定因素：不同图床的删除协议不统一，当前按“对图片 URL 发 DELETE”实现；
    // 若第三方图床不支持该语义，需按其官方删除 API 再做适配。
    const response = await fetch(imageUrl, {
      method: 'DELETE',
      headers: Object.keys(headers).length > 0 ? headers : undefined
    });

    return response.ok || response.status === 404;
  } catch (error) {
    coreLogger.error(
      { feature: 'upload-delete-image', imageUrl, error },
      'Failed to delete uploaded image'
    );
    return false;
  }
};

/**
 * @swagger
 * /upload/signature:
 *   get:
 *     summary: 获取上传签名
 *     description: 获取图片或音频上传签名
 *     tags:
 *       - Upload
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, audio]
 *         description: 上传类型
 *     responses:
 *       200:
 *         description: 获取成功
 */
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

      if (typeRaw === 'audio' && req.user.role !== 'teacher') {
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

/**
 * @swagger
 * /upload/audio:
 *   post:
 *     summary: 上传音频文件
 *     description: 直接上传音频到本地后端存储并返回播放地址
 *     tags:
 *       - Upload
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: 上传成功
 */
uploadRouter.post(
  '/audio',
  authMiddleware,
  // 修改原因：统一前后端上传契约时保留兼容路径，避免历史客户端使用 audio 字段导致服务端取不到文件。
  audioUpload.fields([{ name: 'file', maxCount: 1 }, { name: 'audio', maxCount: 1 }]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      if (req.user.role !== 'teacher') {
        throw new AppError(
          403,
          'PERMISSION_DENIED',
          '只有教师可以上传音频'
        );
      }

      const files = (req as any).files as
        | Record<string, Express.Multer.File[]>
        | undefined;
      const file = files?.file?.[0] ?? files?.audio?.[0];
      // ⚠️ 不确定因素：若第三方客户端使用了其他字段名（既非 file 也非 audio），仍会命中 NO_FILE。

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

uploadRouter.post(
  '/image-local',
  authMiddleware,
  imageUploadLocal.single('file'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        throw new AppError(400, 'NO_FILE', '未找到上传的图片文件');
      }

      const filename = path.basename(file.filename);
      // 修改原因：图床上传失败时返回本地静态 URL，前端可无感回退显示。
      const imageUrl = `/static/image/${filename}`;

      return res.json({
        code: 200,
        message: 'success',
        data: {
          imageUrl
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

uploadRouter.get(
  '/image-proxy',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const targetUrl = String(req.query.url ?? '').trim();
      if (!targetUrl) {
        throw new AppError(400, 'VALIDATION_ERROR', 'url 不能为空');
      }

      let parsed: URL;
      try {
        parsed = new URL(targetUrl);
      } catch {
        throw new AppError(400, 'VALIDATION_ERROR', 'url 格式不合法');
      }

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new AppError(400, 'VALIDATION_ERROR', '仅支持 http/https 协议');
      }

      const allowedHosts = getImageProxyAllowedHosts();
      if (!allowedHosts.has(parsed.hostname.toLowerCase())) {
        throw new AppError(403, 'PROXY_HOST_NOT_ALLOWED', '图片来源域名不在白名单内');
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), IMAGE_PROXY_TIMEOUT_MS);

      let upstream: globalThis.Response;
      try {
        upstream = await fetch(parsed.toString(), {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!upstream.ok) {
        throw new AppError(502, 'UPSTREAM_IMAGE_FETCH_FAILED', '上游图片读取失败');
      }

      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      if (!contentType.toLowerCase().startsWith('image/')) {
        throw new AppError(502, 'UPSTREAM_INVALID_CONTENT_TYPE', '上游返回非图片资源');
      }

      const cacheControl = upstream.headers.get('cache-control') || 'public, max-age=600';
      const payload = Buffer.from(await upstream.arrayBuffer());

      // 修改原因：通过后端转发图片，降低浏览器直连第三方图床时的 HTTP2 协议抖动影响。
      // ⚠️ 不确定因素：代理会增加后端带宽压力，后续可按访问量再补缓存层。
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', cacheControl);
      return res.status(200).send(payload);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return next(new AppError(504, 'UPSTREAM_TIMEOUT', '上游图片读取超时'));
      }
      next(err);
    }
  }
);

uploadRouter.post(
  '/audit-image',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      const { imageUrl } = req.body as { imageUrl?: string };
      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new AppError(400, 'VALIDATION_ERROR', 'imageUrl 不能为空');
      }

      const result = await aiAuditService.auditImage(imageUrl);
      return res.json({
        code: 200,
        message: 'success',
        data: {
          safe: result.safe,
          reason: result.reason,
          category: result.category,
          requiresManualReview: result.requiresManualReview === true
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

uploadRouter.post(
  '/delete-image',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', '未登录');
      }

      const { imageUrl } = req.body as { imageUrl?: string };
      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new AppError(400, 'VALIDATION_ERROR', 'imageUrl 不能为空');
      }

      const removed = await deleteUploadedImage(imageUrl);
      return res.json({
        code: 200,
        message: removed ? '图片已删除' : '图片删除失败',
        data: {
          removed
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);
