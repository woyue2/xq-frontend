# 知识星球问答小程序 - 后端编码规范 v1.0

> **核心原则**：分层架构、类型安全、统一错误处理、API契约优先

---

## 一、技术栈规范（已确定）

### 1.1 核心技术栈

| 层级 | 技术选型 | 说明 |
|-----|---------|------|
| **运行时** | Node.js 18+ | ES Modules 模式 |
| **框架** | Express.js | 轻量灵活，生态成熟 |
| **语言** | TypeScript | 类型安全 |
| **ORM** | Prisma | 现代化 ORM，类型安全 |
| **数据库** | PostgreSQL 14+ | 主数据库 |
| **缓存** | Redis 7+ | 会话、热点数据缓存 |
| **验证** | Zod | 运行时类型验证 |
| **日志** | Pino | 高性能结构化日志 |
| **测试** | Jest | 单元测试 + 集成测试 |

### 1.2 与前端技术栈对应

```
┌─────────────────────────────────────────────────────────┐
│                    前端 (已实现)                          │
│  React 18 + Vite + React Router + Zustand + TanStack    │
│  Radix UI + TailwindCSS + Axios                         │
└─────────────────────────────────────────────────────────┘
                           ↕ REST API
┌─────────────────────────────────────────────────────────┐
│                    后端 (待实现)                          │
│  Node.js + Express + TypeScript + Prisma + PostgreSQL   │
│  Redis + Zod + JWT + Pino                               │
└─────────────────────────────────────────────────────────┘
```

### 1.2 环境配置

```bash
# .env 文件规范
NODE_ENV=development|staging|production
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
SMS_PROVIDER=aliyun|tencent
OSS_BUCKET=your-bucket
AI_AUDIT_API_KEY=xxx
```

> **安全要求**: 敏感配置必须使用环境变量，禁止硬编码

---

## 二、项目结构规范

### 2.1 目录结构

```
src/
├── app.ts                 # 应用入口
├── config/                # 配置管理
│   ├── database.ts
│   ├── redis.ts
│   └── env.ts             # 环境变量验证 (Zod)
├── controllers/           # 控制器层 (处理HTTP请求)
│   ├── auth.controller.ts
│   ├── question.controller.ts
│   └── ...
├── services/              # 服务层 (业务逻辑)
│   ├── auth.service.ts
│   ├── question.service.ts
│   └── ...
├── repositories/          # 数据访问层 (可选)
│   └── question.repository.ts
├── middlewares/           # 中间件
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   ├── rateLimit.middleware.ts
│   └── logger.middleware.ts
├── validators/            # 请求验证 (Zod Schemas)
│   ├── auth.schema.ts
│   └── question.schema.ts
├── types/                 # 类型定义
│   ├── entities.ts        # 实体类型
│   ├── requests.ts        # 请求类型
│   └── responses.ts       # 响应类型
├── utils/                 # 工具函数
│   ├── jwt.ts
│   ├── sms.ts
│   ├── oss.ts
│   └── ai-audit.ts
├── errors/                # 自定义错误
│   └── AppError.ts
├── prisma/                # Prisma Schema & Migrations
│   ├── schema.prisma
│   └── migrations/
└── tests/                 # 测试文件
    ├── unit/
    └── integration/
```

### 2.2 命名规范

| 类型 | 规范 | 示例 |
|-----|------|------|
| 文件名 | kebab-case | `auth.controller.ts` |
| 类名 | PascalCase | `AuthController` |
| 函数名 | camelCase | `createQuestion` |
| 常量 | UPPER_SNAKE_CASE | `MAX_UPLOAD_SIZE` |
| 数据库表 | snake_case | `user_whitelist` |
| API路由 | kebab-case | `/api/my-questions` |

---

## 三、分层架构规范

### 3.1 Controller 层

**职责**: 处理 HTTP 请求/响应，参数验证，调用 Service

```typescript
// ✅ 正确示例
export class QuestionController {
  constructor(private questionService: QuestionService) {}

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. 验证输入
      const data = createQuestionSchema.parse(req.body);
      
      // 2. 调用 Service
      const question = await this.questionService.create(data, req.user.id);
      
      // 3. 返回响应
      res.json({ code: 200, message: 'Success', data: question });
    } catch (err) {
      next(err);
    }
  }
}

// ❌ 禁止在 Controller 写业务逻辑
async create(req, res) {
  // 直接操作数据库
  const question = await prisma.question.create({ ... });
}
```

### 3.2 Service 层

**职责**: 核心业务逻辑，数据库操作，事务管理

```typescript
// ✅ 正确示例
export class QuestionService {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateQuestionInput, userId: string) {
    // 1. 权限检查
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!this.canCreateQuestion(user)) {
      throw new AppError(403, '无提问权限');
    }

    // 2. AI审核
    const aiResult = await this.aiAudit(data.content);

    // 3. 创建问题
    return this.prisma.question.create({
      data: {
        ...data,
        authorId: userId,
        status: 'pending',
        aiResult: JSON.stringify(aiResult)
      }
    });
  }

  private canCreateQuestion(user: User): boolean {
    if (user.role === 'teacher') return true;
    if (user.role === 'parent') return false;
    // 学生需检查有效期
    return user.validUntil && new Date(user.validUntil) > new Date();
  }
}
```

### 3.3 Middleware 层

**职责**: 认证、授权、日志、限流、错误处理

```typescript
// 认证中间件
export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new AppError(401, '未登录');
    
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await userService.findById(payload.userId);
    next();
  } catch (err) {
    next(new AppError(401, '认证失败'));
  }
};

// 角色权限中间件
export const requireRole = (...roles: Role[]) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, '无权限'));
    }
    next();
  };
};
```

---

## 四、错误处理规范

### 4.1 统一错误类

```typescript
// src/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public errors?: any[]
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// 预定义错误
export const Errors = {
  NOT_FOUND: (resource: string) => new AppError(404, `${resource}不存在`, 'NOT_FOUND'),
  FORBIDDEN: (action: string) => new AppError(403, `无${action}权限`, 'FORBIDDEN'),
  UNAUTHORIZED: () => new AppError(401, '请先登录', 'UNAUTHORIZED'),
  VALIDATION: (errors: any[]) => new AppError(400, '参数验证失败', 'VALIDATION_ERROR', errors),
  WHITELIST_NOT_FOUND: () => new AppError(403, '手机号未在白名单中', 'WHITELIST_NOT_FOUND'),
  EXPIRED: () => new AppError(403, '课时已过期', 'MEMBERSHIP_EXPIRED'),
};
```

### 4.2 全局错误处理中间件

```typescript
// src/middlewares/error.middleware.ts
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // 记录日志
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  // Zod 验证错误
  if (err instanceof ZodError) {
    return res.status(400).json({
      code: 400,
      message: '参数验证失败',
      errors: err.errors
    });
  }

  // 自定义应用错误
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      code: err.statusCode,
      message: err.message,
      errors: err.errors
    });
  }

  // 未知错误
  res.status(500).json({
    code: 500,
    message: process.env.NODE_ENV === 'production' ? '服务器错误' : err.message
  });
};
```

---

## 五、API 设计规范

### 5.1 RESTful 路由设计

```
# 资源命名使用复数
GET    /api/questions          # 列表
POST   /api/questions          # 创建
GET    /api/questions/:id      # 详情
PUT    /api/questions/:id      # 全量更新
PATCH  /api/questions/:id      # 部分更新
DELETE /api/questions/:id      # 删除

# 子资源
GET    /api/questions/:id/comments
POST   /api/questions/:id/comments

# 动作类接口使用动词
POST   /api/questions/:id/pin        # 置顶
POST   /api/interactions/like        # 点赞
POST   /api/audit/approve            # 审核通过
```

### 5.2 统一响应格式

```typescript
// 成功响应
interface SuccessResponse<T> {
  code: 200;
  message: string;
  data: T;
}

// 列表响应
interface ListResponse<T> {
  code: 200;
  message: string;
  data: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// 错误响应
interface ErrorResponse {
  code: number;      // HTTP状态码
  message: string;   // 错误描述
  errors?: any[];    // 详细错误（验证失败时）
}
```

### 5.3 分页与筛选

```typescript
// 请求参数
interface PaginationParams {
  page?: number;      // 默认 1
  limit?: number;     // 默认 20, 最大 100
  sort?: string;      // 如 'createdAt:desc'
  search?: string;    // 搜索关键词
  [key: string]: any; // 其他筛选条件
}

// 服务层实现
async findAll(params: PaginationParams) {
  const { page = 1, limit = 20, sort, search, ...filters } = params;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    this.prisma.question.findMany({
      where: this.buildWhere(filters, search),
      orderBy: this.parseSort(sort),
      skip,
      take: Math.min(limit, 100)
    }),
    this.prisma.question.count({ where: this.buildWhere(filters, search) })
  ]);

  return {
    items,
    total,
    page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit)
  };
}
```

---

## 六、数据验证规范

### 6.1 使用 Zod Schema

```typescript
// src/validators/question.schema.ts
import { z } from 'zod';

export const createQuestionSchema = z.object({
  title: z.string()
    .min(1, '标题不能为空')
    .max(100, '标题最多100字'),
  content: z.string()
    .max(500, '内容最多500字')
    .optional(),
  images: z.array(z.string().url())
    .max(3, '最多上传3张图片')
    .default([]),
  tags: z.array(z.string()).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  subject: z.enum(['math', 'physics', 'chemistry']).optional()
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
```

### 6.2 验证手机号

```typescript
export const phoneSchema = z.string()
  .regex(/^1[3-9]\d{9}$/, '手机号格式错误');

export const loginSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, '验证码为6位数字')
});
```

---

## 七、安全规范

### 7.1 认证与授权

```typescript
// JWT 配置
const jwtConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: '7d',
  algorithm: 'HS256'
};

// Token 生成
function generateToken(user: User): string {
  return jwt.sign(
    { userId: user.id, role: user.role },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );
}
```

### 7.2 接口限流

```typescript
import rateLimit from 'express-rate-limit';

// 通用限流
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100,
  message: { code: 429, message: '请求过于频繁' }
});

// 验证码限流
export const smsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 1,
  keyGenerator: (req) => req.body.phone
});
```

### 7.3 文件上传安全

```typescript
// 文件类型限制
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/m4a'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5MB
const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB

// Multer 配置
const upload = multer({
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new AppError(400, '不支持的文件类型'));
    }
    cb(null, true);
  }
});
```

---

## 八、数据库规范

### 8.1 Prisma Schema 规范

```prisma
// 模型命名使用 PascalCase
model User {
  id        String   @id @default(uuid())
  phone     String   @unique
  nickname  String
  role      Role     @default(STUDENT)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  questions Question[]
  
  @@map("users") // 表名使用 snake_case
}

// 枚举定义
enum Role {
  STUDENT
  PARENT
  TEACHER
}
```

### 8.2 查询优化

```typescript
// ✅ 使用 select 只查需要的字段
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, nickname: true, avatar: true }
});

// ✅ 使用 include 关联查询
const question = await prisma.question.findUnique({
  where: { id },
  include: {
    author: { select: { id: true, nickname: true, avatar: true } },
    _count: { select: { answers: true, comments: true } }
  }
});

// ✅ 事务处理
await prisma.$transaction(async (tx) => {
  await tx.question.update({ where: { id }, data: { likesCount: { increment: 1 } } });
  await tx.like.create({ data: { userId, questionId: id } });
});
```

---

## 九、日志规范

### 9.1 日志级别

| 级别 | 用途 |
|-----|------|
| `error` | 错误，需要立即处理 |
| `warn` | 警告，潜在问题 |
| `info` | 重要业务事件（用户登录、审核操作等）|
| `debug` | 开发调试信息 |

### 9.2 日志格式

```typescript
// 使用 Pino 结构化日志
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  }
});

// 请求日志
logger.info({
  type: 'request',
  method: req.method,
  path: req.path,
  userId: req.user?.id,
  duration: Date.now() - start
});

// 业务日志
logger.info({
  type: 'audit',
  action: 'approve',
  targetType: 'question',
  targetId: questionId,
  operatorId: userId
});
```

---

## 十、测试规范

### 10.1 单元测试

```typescript
// src/services/__tests__/question.service.test.ts
describe('QuestionService', () => {
  describe('create', () => {
    it('should create question for valid student', async () => {
      // Arrange
      const mockUser = { id: '1', role: 'student', validUntil: futureDate };
      const input = { title: 'Test Question' };

      // Act
      const result = await service.create(input, mockUser.id);

      // Assert
      expect(result.status).toBe('pending');
      expect(result.authorId).toBe(mockUser.id);
    });

    it('should throw error for expired student', async () => {
      const mockUser = { id: '1', role: 'student', validUntil: pastDate };
      
      await expect(service.create(input, mockUser.id))
        .rejects.toThrow('课时已过期');
    });
  });
});
```

### 10.2 集成测试

```typescript
describe('POST /api/questions', () => {
  it('should create question with valid token', async () => {
    const response = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: 'Test Question' });

    expect(response.status).toBe(200);
    expect(response.body.code).toBe(200);
    expect(response.body.data.id).toBeDefined();
  });

  it('should return 401 without token', async () => {
    const response = await request(app)
      .post('/api/questions')
      .send({ title: 'Test Question' });

    expect(response.status).toBe(401);
  });
});
```

---

## 十一、部署规范

### 11.1 健康检查端点

```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});

app.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({ status: 'ready' });
  } catch (err) {
    res.status(503).json({ status: 'not ready' });
  }
});
```

### 11.2 优雅关闭

```typescript
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  
  // 停止接收新请求
  server.close();
  
  // 关闭数据库连接
  await prisma.$disconnect();
  await redis.quit();
  
  process.exit(0);
});
```

---

**版本**: 1.0  
**日期**: 2026-02-02  
**图例**: ✅=必须遵循 ⚠️=建议遵循 ❌=禁止
