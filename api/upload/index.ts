/**
 * [POS] api/upload/index.ts
 *   所属：API 路由层 | 角色：文件上传
 *
 * [METHODS]
 *   - POST → 上传文件到 Supabase Storage
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth } from '../_lib/auth'

// Supabase Storage 配置
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!

async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      code: 405,
      message: '方法不允许',
      timestamp: Date.now()
    })
  }

  try {
    const { file, fileName, fileType, folder = 'general' } = req.body

    if (!file || !fileName) {
      return res.status(400).json({
        code: 400,
        message: '文件内容和文件名为必填项',
        timestamp: Date.now()
      })
    }

    // 验证文件类型
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4']
    const allowedTypes = [...allowedImageTypes, ...allowedAudioTypes]

    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({
        code: 400,
        message: '不支持的文件类型',
        timestamp: Date.now()
      })
    }

    // 验证文件大小 (Base64 解码后)
    const fileBuffer = Buffer.from(file, 'base64')
    const maxImageSize = 10 * 1024 * 1024 // 10MB
    const maxAudioSize = 50 * 1024 * 1024 // 50MB
    const maxSize = allowedImageTypes.includes(fileType) ? maxImageSize : maxAudioSize

    if (fileBuffer.length > maxSize) {
      return res.status(400).json({
        code: 400,
        message: `文件大小超过限制，最大允许 ${maxSize / 1024 / 1024}MB`,
        timestamp: Date.now()
      })
    }

    // 生成唯一文件名
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const ext = fileName.split('.').pop() || 'bin'
    const uniqueFileName = `${folder}/${timestamp}-${randomStr}.${ext}`

    // 上传到 Supabase Storage
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/uploads/${uniqueFileName}`
    
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': fileType,
        'x-upsert': 'true'
      },
      body: fileBuffer
    })

    if (!uploadRes.ok) {
      const error = await uploadRes.text()
      console.error('[Upload Error]', error)
      return res.status(500).json({
        code: 500,
        message: '文件上传失败',
        timestamp: Date.now()
      })
    }

    // 获取公开访问 URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/uploads/${uniqueFileName}`

    return res.status(201).json({
      code: 201,
      data: {
        url: publicUrl,
        path: uniqueFileName,
        size: fileBuffer.length,
        type: fileType
      },
      message: '上传成功',
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[API /upload]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      timestamp: Date.now()
    })
  }
}

export default requireAuth(handler)
