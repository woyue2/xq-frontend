# Upload API Documentation

## Overview

The upload API (`api/upload.ts`) handles image uploads to Supabase Storage with validation for file format and size.

## Endpoint

**POST** `/api/upload`

## Authentication

Requires a valid JWT token in the `Authorization` header:
```
Authorization: Bearer <token>
```

## Request Format

- **Content-Type**: `multipart/form-data`
- **Field Name**: `file`

## Validation Rules

### File Format
Supported formats:
- jpg
- jpeg
- png
- gif
- webp

### File Size
Maximum size: **5MB** (5,242,880 bytes)

## Response Format

### Success (200)
```json
{
  "url": "https://fyqlmovtfkfwmklfpvnc.supabase.co/storage/v1/object/public/images/1234567890-abc123.jpg"
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "code": 401,
  "message": "需要登录",
  "timestamp": 1234567890
}
```

#### 400 Bad Request - No File
```json
{
  "code": 400,
  "message": "未提供文件",
  "timestamp": 1234567890
}
```

#### 400 Bad Request - Invalid Format
```json
{
  "code": 400,
  "message": "不支持的图片格式,仅支持 jpg, jpeg, png, gif, webp",
  "timestamp": 1234567890
}
```

#### 400 Bad Request - File Too Large
```json
{
  "code": 400,
  "message": "图片大小不能超过 5MB",
  "timestamp": 1234567890
}
```

#### 405 Method Not Allowed
```json
{
  "code": 405,
  "message": "方法不允许",
  "timestamp": 1234567890
}
```

#### 500 Internal Server Error
```json
{
  "code": 500,
  "message": "服务器内部错误",
  "timestamp": 1234567890
}
```

## Environment Variables

Required environment variables:

```env
# Supabase Configuration
SUPABASE_URL=https://fyqlmovtfkfwmklfpvnc.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The service key is used to bypass Row Level Security (RLS) policies for file uploads.

## Supabase Storage Setup

### Bucket Configuration

1. Create a bucket named `images` in Supabase Storage
2. Set the bucket to **public** to allow public URL access
3. Configure CORS if needed for direct browser uploads

### Storage Policies

The API uses the service key to bypass RLS, but you can optionally set up policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Allow public read access
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');
```

## Implementation Details

### File Processing Flow

1. **Authentication Check**: Verify JWT token
2. **Parse Multipart Data**: Extract file from request using `formidable`
3. **Format Validation**: Check file extension
4. **Size Validation**: Check file size ≤ 5MB
5. **Generate Unique Filename**: `{timestamp}-{random}.{ext}`
6. **Upload to Supabase**: Store in `images/` folder
7. **Get Public URL**: Return accessible URL
8. **Cleanup**: Remove temporary file

### File Naming Convention

Files are stored with unique names to prevent collisions:
```
images/{timestamp}-{random}.{extension}
```

Example: `images/1704067200000-abc123.jpg`

## Testing

Unit tests are located in `src/test/upload.test.ts`:

```bash
npm test -- src/test/upload.test.ts
```

Tests cover:
- Authentication validation
- HTTP method validation
- File format validation
- File size validation
- OPTIONS preflight handling

## Usage Example

### JavaScript/TypeScript

```typescript
const formData = new FormData()
formData.append('file', fileInput.files[0])

const response = await fetch('/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})

const data = await response.json()
console.log('Uploaded URL:', data.url)
```

### cURL

```bash
curl -X POST https://your-domain.com/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **6.1**: File format validation (jpg/jpeg/png/gif/webp)
- **6.2**: File size validation (≤5MB)
- **6.3**: Return public access URL
- **6.4**: Save URL to entities (Question, Answer, Comment)

## Notes

- The API automatically cleans up temporary files after upload
- File uploads are logged with request IDs for debugging
- The service uses Supabase's service key for server-side uploads
- Public URLs are immediately accessible after upload
