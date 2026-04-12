/**
 * [POS] api/upload.ts
 *   所属：API 路由层 | 角色：图片上传到 imgurl.org OSS
 *
 * [INPUT]
 *   - multipart/form-data，字段名 'file'
 *
 * [OUTPUT]
 *   - 成功: { url: string }
 *   - 错误: { code: number, message: string, timestamp: number }
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. api/CLAUDE.md 的文件清单
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import formidable from 'formidable'
import fs from 'fs'
import { extractAndVerifyToken } from './auth.js'
import FormData from 'form-data'
import axios from 'axios'

// imgurl.org OSS 配置
const OSS_UPLOAD_BASE_URL = process.env.OSS_UPLOAD_BASE_URL || 'https://www.imgurl.org/api/v3/upload'
const OSS_UPLOAD_TOKEN = process.env.OSS_UPLOAD_TOKEN || 'sk-GZqa0eF4eTDzZiuze194MyApMF8JmZk6GXoImZInczAsFASxquqmBQgtxEKai'

// 支持的图片格式
const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const MAX_FILE_SIZE = 3 * 1024 * 1024 // 3MB (imgurl.org API limit)

// 禁用 Vercel 的默认 body parser
export const config = {
  api: {
    bodyParser: false
  }
}

/**
 * 解析 multipart/form-data
 */
function parseForm(req: VercelRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true
    })

    form.parse(req, (err, fields, files) => {
      if (err) reject(err)
      else resolve({ fields, files })
    })
  })
}

/**
 * 获取文件扩展名
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

/**
 * 上传图片到 imgurl.org OSS
 */
async function uploadToOSS(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  // 使用 form-data 库构建 multipart/form-data
  const formData = new FormData()
  
  // 添加文件字段
  formData.append('file', fileBuffer, {
    filename: fileName,
    contentType: mimeType
  })

  // 添加 params 参数：启用压缩以适应 imgurl.org 3MB 限制
  const params = {
    compress: true,  // 启用压缩
    dedup: true      // 启用去重
  }
  formData.append('params', JSON.stringify(params))

  // 使用 axios 发送请求（axios 正确处理 form-data）
  const response = await axios.post(OSS_UPLOAD_BASE_URL, formData, {
    headers: {
      'Authorization': `Bearer ${OSS_UPLOAD_TOKEN}`,
      ...formData.getHeaders()
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity
  })

  const result = response.data
  
  // imgurl.org V3 API 返回格式: { code: 200, data: { url: "..." } }
  if (result.code === 200 && result.data?.url) {
    return result.data.url
  }
  
  throw new Error(`OSS upload failed: Invalid response format - ${JSON.stringify(result)}`)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = Math.random().toString(36).substring(7)
  const startTime = Date.now()

  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // 只允许 POST 方法
  if (req.method !== 'POST') {
    return res.status(405).json({
      code: 405,
      message: '方法不允许',
      timestamp: Date.now()
    })
  }

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Upload:${requestId}] Request received`);
    }

    // 验证用户登录
    const user = extractAndVerifyToken(req)
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '需要登录',
        timestamp: Date.now()
      })
    }

    // 解析表单数据
    let files: formidable.Files
    
    try {
      const parsed = await parseForm(req)
      files = parsed.files
    } catch (parseError: unknown) {
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error'
      const errorCode = parseError && typeof parseError === 'object' && 'code' in parseError 
        ? (parseError as { code: string }).code 
        : undefined
      console.error(`[Upload:${requestId}] Parse error:`, errorMessage)
      
      if (errorCode === 'LIMIT_FILE_SIZE' || errorMessage.includes('maxFileSize')) {
        return res.status(400).json({
          code: 400,
          message: '图片大小不能超过 3MB',
          timestamp: Date.now()
        })
      }
      
      return res.status(400).json({
        code: 400,
        message: '文件解析失败',
        timestamp: Date.now()
      })
    }

    // 获取上传的文件
    const fileArray = files.file
    if (!fileArray || (Array.isArray(fileArray) && fileArray.length === 0)) {
      return res.status(400).json({
        code: 400,
        message: '未提供文件',
        timestamp: Date.now()
      })
    }

    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Upload:${requestId}] File received:`, {
        originalFilename: file.originalFilename,
        size: file.size,
        mimetype: file.mimetype
      });
    }

    // 验证文件格式
    const ext = getFileExtension(file.originalFilename || '')
    if (!ALLOWED_FORMATS.includes(ext)) {
      return res.status(400).json({
        code: 400,
        message: `不支持的图片格式，仅支持 ${ALLOWED_FORMATS.join(', ')}`,
        timestamp: Date.now()
      })
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        code: 400,
        message: '图片大小不能超过 3MB',
        timestamp: Date.now()
      })
    }

    // 生成唯一文件名
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const fileName = `${timestamp}-${randomStr}.${ext}`

    // 读取文件内容
    const fileBuffer = fs.readFileSync(file.filepath)

    // 上传到 imgurl.org OSS
    let publicUrl: string
    try {
      publicUrl = await uploadToOSS(fileBuffer, fileName, file.mimetype || `image/${ext}`)
    } catch (uploadError: unknown) {
      const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown upload error'
      console.error(`[Upload:${requestId}] OSS upload error:`, errorMessage)
      return res.status(500).json({
        code: 500,
        message: '图片上传失败',
        timestamp: Date.now()
      })
    }

    // 清理临时文件
    try {
      fs.unlinkSync(file.filepath)
    } catch (cleanupError) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Upload:${requestId}] Failed to cleanup temp file:`, cleanupError);
      }
    }

    const duration = Date.now() - startTime
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Upload:${requestId}] Success:`, {
        url: publicUrl,
        duration: `${duration}ms`
      });
    }

    return res.json({
      url: publicUrl
    })

  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error(`[Upload:${requestId}] ERROR:`, {
      message: errorMessage,
      stack: errorStack,
      duration: `${duration}ms`
    })
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}
