/**
 * Test helper to expose uploadToOSS function for testing
 * This mirrors the implementation from api/upload.ts
 */

const OSS_UPLOAD_BASE_URL = process.env.OSS_UPLOAD_BASE_URL || 'https://www.imgurl.org/api/v3/upload'
const OSS_UPLOAD_TOKEN = process.env.OSS_UPLOAD_TOKEN || 'sk-GZqa0eF4eTDzZiuze194MyApMF8JmZk6GXoImZInczAsFASxquqmBQgtxEKai'

/**
 * Upload image to imgurl.org OSS
 * This is a copy of the uploadToOSS function from api/upload.ts for testing purposes
 */
export async function uploadToOSS(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  // Use dynamic import for form-data to avoid issues in test environment
  const FormData = (await import('form-data')).default
  const formData = new FormData()
  
  formData.append('file', fileBuffer, {
    filename: fileName,
    contentType: mimeType
  })

  const response = await fetch(OSS_UPLOAD_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OSS_UPLOAD_TOKEN}`,
      ...formData.getHeaders()
    },
    body: formData as any
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OSS upload failed: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  
  // imgurl.org V3 API 返回格式: { code: 200, data: { url: "..." } }
  if (result.code === 200 && result.data?.url) {
    return result.data.url
  }
  
  throw new Error('OSS upload failed: Invalid response format')
}
