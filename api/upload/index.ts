/**
 * [POS] api/upload/index.ts
 *   所属：API 路由层 | 角色：文件上传
 *
 * [METHODS]
 *   - POST → 上传文件到 imgurl.org OSS
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as jwt from 'jsonwebtoken'

// === 内联 Auth 工具 ===
const JWT_SECRET = process.env.JWT_SECRET!

interface AuthUser {
  id: string
  phone: string
  role: string
  nickname: string
}

async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded
  } catch {
    return null
  }
}

async function getCurrentUser(req: any): Promise<AuthUser | null> {
  const authHeader = req.headers?.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  return verifyToken(authHeader.slice(7))
}

function requireAuth(handler: Function) {
  return async (req: any, res: any) => {
    const user = await getCurrentUser(req)
    if (!user) {
      return res.status(401).json({ code: 401, message: '未登录或token已过期', timestamp: Date.now() })
    }
    return handler(req, res)
  }
}

// OSS 图床配置 (imgurl.org)
const OSS_UPLOAD_BASE_URL = process.env.OSS_UPLOAD_BASE_URL!
const OSS_UPLOAD_TOKEN = process.env.OSS_UPLOAD_TOKEN!

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
    const { file, fileName, fileType } = req.body

    if (!file || !fileName) {
      return res.status(400).json({
        code: 400,
        message: '文件内容和文件名为必填项',
        timestamp: Date.now()
      })
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({
        code: 400,
        message: '只支持图片格式：jpg, png, gif, webp',
        timestamp: Date.now()
      })
    }

    // Base64 处理
    const base64Data = file.replace(/^data:image\/\w+;base64,/, '')
    
    // 验证文件大小 (10MB)
    const sizeInBytes = Math.ceil(base64Data.length * 0.75)
    if (sizeInBytes > 10 * 1024 * 1024) {
      return res.status(400).json({
        code: 400,
        message: '文件大小超过10MB限制',
        timestamp: Date.now()
      })
    }

    // 上传到 imgurl.org
    const formData = new URLSearchParams()
    formData.append('file', base64Data)

    const uploadRes = await fetch(OSS_UPLOAD_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OSS_UPLOAD_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
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

    const result = await uploadRes.json()

    if (result.code !== 200) {
      console.error('[Upload API Error]', result)
      return res.status(500).json({
        code: 500,
        message: result.msg || '上传失败',
        timestamp: Date.now()
      })
    }

    return res.status(201).json({
      code: 201,
      data: {
        url: result.data?.url || result.url,
        size: sizeInBytes,
        type: fileType
      },
      message: '上传成功',
      timestamp: Date.now()
    })

  } catch (error: any) {
    console.error('[API /upload]', error)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误: ' + (error.message || 'Unknown'),
      timestamp: Date.now()
    })
  }
}

export default requireAuth(handler)
