/**
 * [POS] api/upload/index.ts
 *   所属：API 路由�?| 角色：文件上�?
 *
 * [METHODS]
 *   - POST �?上传文件�?imgurl.org OSS
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import jwt from 'jsonwebtoken'

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
      return res.status(401).json({ code: 401, message: '未登录或token已过�?, timestamp: Date.now() })
    }
    return handler(req, res)
  }
}

// OSS 图床配置 (imgurl.org)
const OSS_UPLOAD_BASE_URL = process.env.OSS_UPLOAD_BASE_URL!
const OSS_UPLOAD_TOKEN = process.env.OSS_UPLOAD_TOKEN!

// Supabase Storage 配置
const SUPABASE_URL = process.env.SUPABASE_URL?.trim()
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY?.trim()

// 解析 multipart form-data
async function parseMultipart(req: VercelRequest): Promise<{ file: Buffer; fileName: string; fileType: string } | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const buffer = Buffer.concat(chunks)
      const contentType = req.headers['content-type'] || ''
      
      if (!contentType.includes('multipart/form-data')) {
        return resolve(null)
      }
      
      const boundary = contentType.split('boundary=')[1]
      if (!boundary) return resolve(null)
      
      const parts = buffer.toString().split(`--${boundary}`)
      
      for (const part of parts) {
        if (part.includes('Content-Disposition') && part.includes('filename=')) {
          const filenameMatch = part.match(/filename="([^"]+)"/)
          const typeMatch = part.match(/Content-Type: ([^\r\n]+)/)
          
          if (filenameMatch) {
            const fileName = filenameMatch[1]
            const fileType = typeMatch ? typeMatch[1].trim() : 'application/octet-stream'
            
            const contentStart = part.indexOf('\r\n\r\n') + 4
            const contentEnd = part.lastIndexOf('\r\n')
            const fileContent = part.slice(contentStart, contentEnd)
            
            return resolve({
              file: Buffer.from(fileContent),
              fileName,
              fileType
            })
          }
        }
      }
      
      resolve(null)
    })
    
    req.on('error', reject)
  })
}

async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ code: 405, message: '方法不允�?, timestamp: Date.now() })
  }

  // 鉴权检查（POST 请求必须�?
  const user = await getCurrentUser(req)
  if (!user) {
    return res.status(401).json({ code: 401, message: '未登录或token已过�?, timestamp: Date.now() })
  }

  try {
    const contentType = req.headers['content-type'] || ''
    
    // 判断�?multipart（音频）还是 JSON Base64（图片）
    if (contentType.includes('multipart/form-data')) {
      // ========== 处理音频上传（到 Supabase�?=========
      const parsed = await parseMultipart(req)
      
      if (!parsed) {
        return res.status(400).json({ code: 400, message: '无法解析文件', timestamp: Date.now() })
      }
      
      const { file, fileName, fileType } = parsed
      
      // 验证音频类型
      const allowedAudio = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg']
      if (!allowedAudio.some(type => fileType.includes(type))) {
        return res.status(400).json({ code: 400, message: '不支持的音频格式', timestamp: Date.now() })
      }
      
      // 验证大小�?0MB�?
      if (file.length > 50 * 1024 * 1024) {
        return res.status(400).json({ code: 400, message: '音频文件超过50MB限制', timestamp: Date.now() })
      }
      
      // 检�?Supabase 配置
      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return res.status(500).json({ code: 500, message: 'Supabase 未配�?, timestamp: Date.now() })
      }
      
      // 上传�?Supabase Storage
      const timestamp = Date.now()
      const ext = fileName.split('.').pop() || 'webm'
      const uniqueName = `audio/${timestamp}-${Math.random().toString(36).substring(2, 8)}.${ext}`
      
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/uploads/${uniqueName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': fileType,
          'x-upsert': 'true'
        },
        body: new Uint8Array(file)
      })
      
      if (!uploadRes.ok) {
        const error = await uploadRes.text()
        console.error('[Supabase Upload Error]', error)
        return res.status(500).json({ code: 500, message: '音频上传失败', timestamp: Date.now() })
      }
      
      const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/uploads/${uniqueName}`
      
      return res.status(201).json({
        code: 201,
        data: { audioUrl, url: audioUrl, size: file.length, type: fileType },
        message: '音频上传成功',
        timestamp: Date.now()
      })
      
    } else {
      // ========== 处理图片上传（到 OSS�?=========
      const { file, fileName, fileType } = req.body
      
      if (!file || !fileName) {
        return res.status(400).json({ code: 400, message: '缺少文件数据', timestamp: Date.now() })
      }
      
      const allowedImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedImage.includes(fileType)) {
        return res.status(400).json({ code: 400, message: '只支持图片格�?, timestamp: Date.now() })
      }
      
      // Base64 处理
      const base64Data = file.replace(/^data:image\/\w+;base64,/, '')
      const sizeInBytes = Math.ceil(base64Data.length * 0.75)
      
      if (sizeInBytes > 10 * 1024 * 1024) {
        return res.status(400).json({ code: 400, message: '图片超过10MB限制', timestamp: Date.now() })
      }
      
      // 上传�?OSS
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
        console.error('[OSS Upload Error]', error)
        return res.status(500).json({ code: 500, message: '图片上传失败', timestamp: Date.now() })
      }
      
      const result = await uploadRes.json()
      const imageUrl = result.data?.url || result.url
      
      return res.status(201).json({
        code: 201,
        data: { imageUrl, url: imageUrl, size: sizeInBytes, type: fileType },
        message: '图片上传成功',
        timestamp: Date.now()
      })
    }
    
  } catch (error: any) {
    console.error('[API /upload]', error)
    return res.status(500).json({
      code: 500,
      message: '上传失败: ' + (error.message || 'Unknown'),
      timestamp: Date.now()
    })
  }
}

export default handler
