# API Reference - Vercel Serverless Functions

All APIs are deployed as Vercel serverless functions in the `/api` folder.

## Base URL
- **Local**: `http://localhost:3000/api` (via `vercel dev`)
- **Production**: `https://your-domain.vercel.app/api`

---

## Authentication

All protected endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## API Endpoints

### 1. Authentication (`/api/auth`)

#### POST `/api/auth?action=login`
Login with phone and password
```json
{
  "phone": "13800138000",
  "password": "password123"
}
```

#### POST `/api/auth?action=register`
Register new user (requires whitelist)
```json
{
  "phone": "13800138000",
  "password": "password123",
  "code": "123456",
  "nickname": "张三"
}
```

#### POST `/api/auth?action=send-code`
Send verification code
```json
{
  "phone": "13800138000"
}
```

#### POST `/api/auth?action=set-password`
Set/reset password
```json
{
  "phone": "13800138000",
  "code": "123456",
  "newPassword": "newpass123"
}
```

---

### 2. Core Configuration (`/api/core`)

#### GET `/api/core?action=health`
Health check

#### GET `/api/core?action=subjects`
Get all subjects and topics

---

### 3. Social (`/api/social`)

#### POST `/api/social?action=like&id=<questionId>`
Like/unlike a question

#### POST `/api/social?action=favorite&id=<questionId>`
Favorite/unfavorite a question

---

### 4. Content (`/api/content`)

#### Questions

**GET** `/api/content?action=questions-list&page=1&pageSize=20`
- Query params: `subject`, `status`, `search`, `tags`, `authorId`

**POST** `/api/content?action=questions-create`
```json
{
  "title": "问题标题",
  "content": "问题内容",
  "subject": "math",
  "tags": ["代数"],
  "difficulty": "medium",
  "images": ["url1", "url2"]
}
```

**GET** `/api/content?action=questions-get&id=<questionId>`

**PUT** `/api/content?action=questions-update&id=<questionId>`

**DELETE** `/api/content?action=questions-delete&id=<questionId>`

**POST** `/api/content?action=questions-understanding&id=<questionId>`
```json
{
  "status": "understood" // or "not_understood"
}
```

#### Answers

**GET** `/api/content?action=answers-list&id=<questionId>`

**POST** `/api/content?action=answers-create&id=<questionId>`
```json
{
  "content": "回答内容",
  "images": ["url1"],
  "audioUrls": ["url1", "url2"]
}
```

**DELETE** `/api/content?action=answers-delete&id=<answerId>`

#### Comments

**GET** `/api/content?action=comments-list&id=<questionId>`

**POST** `/api/content?action=comments-create&id=<questionId>`
```json
{
  "content": "评论内容",
  "image": "url"
}
```

**DELETE** `/api/content?action=comments-delete&id=<commentId>`

---

### 5. Admin (`/api/admin`)

**Requires**: Teacher or Admin role

#### Whitelist

**GET** `/api/admin?action=whitelist-list&page=1&pageSize=20`
- Query params: `role`, `status`, `search`, `searchField`

**POST** `/api/admin?action=whitelist-create`
```json
{
  "phone": "13800138000",
  "name": "张三",
  "role": "student",
  "validUntil": "2026-12-31",
  "notes": "备注"
}
```

**PATCH** `/api/admin?action=whitelist-update&id=<whitelistId>`
```json
{
  "validUntil": "2027-12-31"
}
```

**DELETE** `/api/admin?action=whitelist-delete&id=<whitelistId>`

#### Audit

**GET** `/api/admin?action=audit-pending&type=question&page=1`
- Types: `question`, `comment`

**POST** `/api/admin?action=audit-approve&id=<contentId>`
```json
{
  "type": "question",
  "isGoodQuestion": true,
  "score": 95,
  "tags": ["代数"],
  "difficulty": "hard"
}
```

**POST** `/api/admin?action=audit-reject&id=<contentId>`
```json
{
  "type": "question",
  "reason": "内容不清晰"
}
```

**POST** `/api/admin?action=audit-ban&id=<contentId>`
```json
{
  "type": "comment",
  "reason": "违规内容"
}
```

**POST** `/api/admin?action=audit-pin&id=<questionId>`
Toggle pin/unpin question

---

### 6. Upload (`/api/upload`)

#### POST `/api/upload?action=image`
Upload image (base64)
```json
{
  "imageData": "data:image/png;base64,iVBORw0KG...",
  "filename": "image.png"
}
```

#### GET `/api/upload?action=signature`
Get upload signature for direct client upload

---

## Response Format

### Success
```json
{
  "code": 200,
  "message": "success",
  "data": { ... },
  "timestamp": 1234567890
}
```

### Error
```json
{
  "code": 400,
  "error": "ERROR_CODE",
  "message": "Error message",
  "errorCode": 1001
}
```

---

## Common Error Codes

- `401` - Unauthorized (not logged in)
- `403` - Permission denied
- `404` - Resource not found
- `409` - Conflict (e.g., phone already exists)
- `400` - Validation error
- `500` - Internal server error

---

## Testing

Use `vercel dev` to test locally:
```bash
vercel dev
```

Then access APIs at `http://localhost:3000/api/*`
