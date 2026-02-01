# 知识星球问答小程序 - 埋点分析 API 设计文档

> **版本**: v1.0  
> **更新日期**: 2026-02-02  
> **负责人**: 后端开发  
> **状态**: 待实现

---

## 1. 概述

### 1.1 背景
埋点分析系统用于采集用户行为数据，支持产品分析、用户画像、运营决策等场景。本文档定义了前后端埋点数据交互的 API 规范。

### 1.2 设计目标
- **高性能**: 异步处理，不影响主业务接口响应时间
- **高可用**: 支持离线缓存和批量上报
- **隐私合规**: PII 数据脱敏处理
- **可扩展**: 事件类型可动态扩展

### 1.3 技术栈
| 技术 | 说明 |
|-----|------|
| Node.js 18+ | 运行时 |
| Express.js | Web 框架 |
| Prisma | ORM |
| PostgreSQL | 主数据库 |
| Redis | 消息队列/缓存 |
| Zod | 参数验证 |

---

## 2. 数据库设计

### 2.1 行为日志表 (behavior_logs)

```sql
CREATE TABLE behavior_logs (
  id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      VARCHAR(36),                    -- 可为空（未登录用户）
  session_id   VARCHAR(100),                   -- 会话标识
  event_type   VARCHAR(100) NOT NULL,          -- 事件类型
  metadata     JSONB,                          -- 自定义属性（JSONB 支持索引）
  path         VARCHAR(500),                   -- 页面路径
  referrer     VARCHAR(500),                   -- 来源页面
  user_agent   VARCHAR(500),                   -- 客户端信息
  ip_address   VARCHAR(50),                    -- IP地址（仅保留前三段）
  client_time  TIMESTAMP,                      -- 客户端时间戳
  created_at   TIMESTAMP DEFAULT NOW(),        -- 服务端接收时间
  
  -- 索引优化
  INDEX idx_user (user_id),
  INDEX idx_event_type (event_type),
  INDEX idx_created (created_at),
  INDEX idx_path (path),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 分区表（按月分区，提高查询性能）
-- 建议生产环境使用分区
```

### 2.2 Prisma Schema

```prisma
model BehaviorLog {
  id          String   @id @default(uuid())
  userId      String?  @map("user_id")
  sessionId   String?  @map("session_id")
  eventType   String   @map("event_type")
  metadata    Json?
  path        String?
  referrer    String?
  userAgent   String?  @map("user_agent")
  ipAddress   String?  @map("ip_address")
  clientTime  DateTime? @map("client_time")
  createdAt   DateTime @default(now()) @map("created_at")

  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([eventType])
  @@index([createdAt])
  @@index([path])
  @@map("behavior_logs")
}
```

---

## 3. API 接口定义

### 3.1 单条日志上报

```
POST /api/behavior/log
```

#### 请求头
| Header | 必填 | 说明 |
|--------|-----|------|
| `Authorization` | 否 | `Bearer {token}`，未登录可不传 |
| `Content-Type` | 是 | `application/json` |
| `X-Session-ID` | 否 | 会话标识，前端生成的 UUID |
| `X-Client-Version` | 否 | 客户端版本号 |

#### 请求体 (Request Body)

```typescript
interface BehaviorLogRequest {
  type: string;           // 必填，事件类型
  timestamp: number;      // 必填，客户端时间戳 (毫秒)
  metadata?: {            // 可选，自定义属性
    questionId?: string;
    source?: string;
    path?: string;
    referrer?: string;
    duration?: number;
    query?: string;
    resultCount?: number;
    isLike?: boolean;
    isFavorite?: boolean;
    subject?: string;
    [key: string]: any;   // 允许扩展
  };
}
```

#### 请求示例

```json
{
  "type": "question_like",
  "timestamp": 1738425600000,
  "metadata": {
    "questionId": "q_12345",
    "isLike": true,
    "source": "detail_page"
  }
}
```

#### 响应体 (Response Body)

```typescript
// 成功 (200)
{
  "code": 200,
  "message": "success",
  "data": {
    "logId": "log_abc123"
  }
}

// 验证失败 (400)
{
  "code": 400,
  "message": "Invalid event type",
  "data": null
}
```

---

### 3.2 批量日志上报

```
POST /api/behavior/batch-log
```

用于离线缓存的批量上报，或曝光类事件的聚合上报。

#### 请求体

```typescript
interface BatchBehaviorLogRequest {
  events: BehaviorLogRequest[];  // 最多 50 条
}
```

#### 请求示例

```json
{
  "events": [
    {
      "type": "page_view",
      "timestamp": 1738425600000,
      "metadata": { "path": "/home", "referrer": "" }
    },
    {
      "type": "question_like",
      "timestamp": 1738425605000,
      "metadata": { "questionId": "q_123", "isLike": true }
    }
  ]
}
```

#### 响应体

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "received": 2,
    "processed": 2,
    "failed": 0
  }
}
```

#### 限制
- 单次请求最多 **50 条**事件
- 单个事件 metadata 最大 **4KB**
- 频率限制: 每分钟最多 **60 次**请求

---

## 4. 事件类型规范

### 4.1 核心事件表

| 事件ID | 名称 | 触发时机 | 必填属性 | 可选属性 |
|-------|------|---------|---------|---------|
| `page_view` | 页面访问 | 路由切换完成 | `path` | `referrer` |
| `good_question_click` | 好问题点击 | 点击好问题徽章 | `questionId` | `source` |
| `question_like` | 问题点赞 | 点赞/取消点赞 | `questionId`, `isLike` | - |
| `question_favorite` | 问题收藏 | 收藏/取消收藏 | `questionId`, `isFavorite` | - |
| `question_view` | 问题浏览 | 进入问题详情页 | `questionId` | `source`, `duration` |
| `question_create_submit` | 提交问题 | 表单提交成功 | `questionId` | `subject`, `hasImage` |
| `audio_play` | 音频播放 | 开始播放音频 | `questionId` | `duration`, `progress` |
| `audio_complete` | 音频播完 | 播放完成 | `questionId` | `duration` |
| `search` | 搜索 | 执行搜索 | `query` | `resultCount` |
| `share` | 分享 | 点击分享按钮 | `questionId` | `platform` |
| `login` | 登录 | 登录成功 | - | `method` |
| `register` | 注册 | 注册成功 | - | `role` |

### 4.2 事件命名规范

采用 `Object_Action` 或 `Object_Action_Phase` 格式：
- **Object**: 操作对象 (question, audio, page, button)
- **Action**: 动作 (click, view, play, submit)
- **Phase**: 阶段 (可选, start, complete, success, fail)

示例:
- ✅ `question_like`
- ✅ `audio_play`
- ✅ `question_create_submit`
- ❌ `likeQuestion` (错误：驼峰命名)
- ❌ `click-like` (错误：连字符)

---

## 5. 后端实现参考

### 5.1 Zod 验证 Schema

```typescript
// src/validators/behavior.validator.ts
import { z } from 'zod';

// 单条日志请求验证
export const behaviorLogSchema = z.object({
  type: z.string().min(1).max(100),
  timestamp: z.number().int().positive(),
  metadata: z.record(z.any()).optional(),
});

// 批量日志请求验证
export const batchBehaviorLogSchema = z.object({
  events: z.array(behaviorLogSchema).min(1).max(50),
});

// 允许的事件类型（可配置化）
export const ALLOWED_EVENT_TYPES = [
  'page_view',
  'good_question_click',
  'question_like',
  'question_favorite',
  'question_view',
  'question_create_submit',
  'audio_play',
  'audio_complete',
  'search',
  'share',
  'login',
  'register',
] as const;
```

### 5.2 Controller 实现

```typescript
// src/controllers/behavior.controller.ts
import { Request, Response, NextFunction } from 'express';
import { behaviorLogSchema, batchBehaviorLogSchema } from '../validators/behavior.validator';
import { BehaviorService } from '../services/behavior.service';

export class BehaviorController {
  private behaviorService: BehaviorService;

  constructor() {
    this.behaviorService = new BehaviorService();
  }

  /**
   * POST /api/behavior/log
   * 单条日志上报
   */
  async logEvent(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. 验证请求体
      const validatedData = behaviorLogSchema.parse(req.body);

      // 2. 提取上下文信息
      const context = {
        userId: req.user?.id || null,  // 从 JWT 解析
        sessionId: req.headers['x-session-id'] as string || null,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: this.anonymizeIP(req.ip),  // IP 脱敏
      };

      // 3. 异步写入（不阻塞响应）
      const logId = await this.behaviorService.createLog(validatedData, context);

      res.json({
        code: 200,
        message: 'success',
        data: { logId },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/behavior/batch-log
   * 批量日志上报
   */
  async batchLogEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { events } = batchBehaviorLogSchema.parse(req.body);

      const context = {
        userId: req.user?.id || null,
        sessionId: req.headers['x-session-id'] as string || null,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: this.anonymizeIP(req.ip),
      };

      const result = await this.behaviorService.createBatchLogs(events, context);

      res.json({
        code: 200,
        message: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * IP 脱敏：只保留前三段
   * 192.168.1.100 -> 192.168.1.xxx
   */
  private anonymizeIP(ip: string | undefined): string | null {
    if (!ip) return null;
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
    return null;
  }
}
```

### 5.3 Service 实现

```typescript
// src/services/behavior.service.ts
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

interface LogContext {
  userId: string | null;
  sessionId: string | null;
  userAgent: string | null;
  ipAddress: string | null;
}

interface LogData {
  type: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class BehaviorService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * 创建单条日志
   */
  async createLog(data: LogData, context: LogContext): Promise<string> {
    const log = await this.prisma.behaviorLog.create({
      data: {
        userId: context.userId,
        sessionId: context.sessionId,
        eventType: data.type,
        metadata: data.metadata || {},
        path: data.metadata?.path || null,
        referrer: data.metadata?.referrer || null,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        clientTime: new Date(data.timestamp),
      },
    });

    logger.info('Behavior log created', { logId: log.id, eventType: data.type });
    return log.id;
  }

  /**
   * 批量创建日志（使用事务）
   */
  async createBatchLogs(
    events: LogData[],
    context: LogContext
  ): Promise<{ received: number; processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const event of events) {
        try {
          await tx.behaviorLog.create({
            data: {
              userId: context.userId,
              sessionId: context.sessionId,
              eventType: event.type,
              metadata: event.metadata || {},
              path: event.metadata?.path || null,
              referrer: event.metadata?.referrer || null,
              userAgent: context.userAgent,
              ipAddress: context.ipAddress,
              clientTime: new Date(event.timestamp),
            },
          });
          processed++;
        } catch (error) {
          logger.error('Failed to log event', { event, error });
          failed++;
        }
      }
    });

    return {
      received: events.length,
      processed,
      failed,
    };
  }
}
```

### 5.4 路由配置

```typescript
// src/routes/behavior.routes.ts
import { Router } from 'express';
import { BehaviorController } from '../controllers/behavior.controller';
import { optionalAuth } from '../middlewares/auth.middleware';
import { rateLimiter } from '../middlewares/rate-limiter.middleware';

const router = Router();
const controller = new BehaviorController();

// 埋点接口使用可选认证（未登录也可上报）
// 限流：每分钟 60 次
router.post(
  '/log',
  optionalAuth,
  rateLimiter({ windowMs: 60000, max: 60 }),
  controller.logEvent.bind(controller)
);

router.post(
  '/batch-log',
  optionalAuth,
  rateLimiter({ windowMs: 60000, max: 60 }),
  controller.batchLogEvents.bind(controller)
);

export default router;
```

---

## 6. 高性能优化方案

### 6.1 异步写入（推荐）

使用 Redis 消息队列 + Worker 异步处理：

```
┌────────┐     ┌──────────────┐     ┌─────────┐     ┌────────────┐
│ 前端   │ --> │ API 接口     │ --> │ Redis   │ --> │ Worker     │ --> DB
│        │     │ (立即返回)   │     │ Queue   │     │ (批量写入) │
└────────┘     └──────────────┘     └─────────┘     └────────────┘
```

```typescript
// 使用 BullMQ 队列
import { Queue, Worker } from 'bullmq';

// 生产者（API 层）
const behaviorQueue = new Queue('behavior-logs', { connection: redis });

async function logEvent(data: LogData, context: LogContext) {
  await behaviorQueue.add('log', { data, context });
  return 'queued';
}

// 消费者（Worker 层）
const worker = new Worker('behavior-logs', async (job) => {
  const { data, context } = job.data;
  await behaviorService.createLog(data, context);
}, { connection: redis });
```

### 6.2 批量插入优化

```typescript
// 使用 Prisma createMany 批量插入
await prisma.behaviorLog.createMany({
  data: events.map(event => ({
    userId: context.userId,
    eventType: event.type,
    metadata: event.metadata,
    clientTime: new Date(event.timestamp),
    // ...
  })),
  skipDuplicates: true,
});
```

### 6.3 数据库分区

按月分区，提高查询和归档效率：

```sql
-- PostgreSQL 分区表
CREATE TABLE behavior_logs (
  id VARCHAR(36),
  event_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  -- ...
) PARTITION BY RANGE (created_at);

-- 每月创建分区
CREATE TABLE behavior_logs_2026_02 PARTITION OF behavior_logs
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

---

## 7. 隐私与安全

### 7.1 数据脱敏

| 字段 | 脱敏规则 |
|-----|---------|
| `ip_address` | 保留前三段: `192.168.1.xxx` |
| `user_id` | 未登录用户置空 |
| `phone` | **禁止采集**手机号明文 |

### 7.2 数据保留策略

| 数据类型 | 保留周期 | 处理方式 |
|---------|---------|---------|
| 原始日志 | 90 天 | 定时归档后删除 |
| 聚合统计 | 永久 | 转存到分析表 |

### 7.3 接口安全

- ✅ 可选 JWT 认证（支持未登录用户）
- ✅ 请求频率限制（60 次/分钟）
- ✅ 请求体大小限制（100KB）
- ✅ 事件类型白名单校验

---

## 8. 前端对接指南

### 8.1 SDK 封装示例

```typescript
// src/lib/analytics.ts
import axios from 'axios';

interface AnalyticsEvent {
  type: string;
  metadata?: Record<string, any>;
}

class Analytics {
  private sessionId: string;
  private queue: AnalyticsEvent[] = [];
  private flushInterval = 10000; // 10秒批量上报

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startAutoFlush();
  }

  // 上报事件
  track(type: string, metadata?: Record<string, any>) {
    this.queue.push({
      type,
      metadata: {
        ...metadata,
        path: window.location.pathname,
        referrer: document.referrer,
      },
    });

    // 关键事件立即上报
    if (['login', 'register', 'question_create_submit'].includes(type)) {
      this.flush();
    }
  }

  // 批量上报
  private async flush() {
    if (this.queue.length === 0) return;

    const events = this.queue.map(e => ({
      ...e,
      timestamp: Date.now(),
    }));
    this.queue = [];

    try {
      await axios.post('/api/behavior/batch-log', { events }, {
        headers: { 'X-Session-ID': this.sessionId },
      });
    } catch (error) {
      // 失败时存入 localStorage，下次重试
      this.saveToLocalStorage(events);
    }
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  private startAutoFlush() {
    setInterval(() => this.flush(), this.flushInterval);
    window.addEventListener('beforeunload', () => this.flush());
  }

  private saveToLocalStorage(events: any[]) {
    const saved = JSON.parse(localStorage.getItem('_analytics_retry') || '[]');
    saved.push(...events);
    localStorage.setItem('_analytics_retry', JSON.stringify(saved.slice(-100)));
  }
}

export const analytics = new Analytics();
```

### 8.2 使用示例

```typescript
import { analytics } from '@/lib/analytics';

// 页面访问
useEffect(() => {
  analytics.track('page_view');
}, [pathname]);

// 点赞
const handleLike = () => {
  setLiked(!liked);
  analytics.track('question_like', {
    questionId: question.id,
    isLike: !liked,
  });
};

// 搜索
const handleSearch = (query: string, results: Question[]) => {
  analytics.track('search', {
    query,
    resultCount: results.length,
  });
};
```

---

## 9. 测试用例

### 9.1 单元测试

```typescript
describe('BehaviorController', () => {
  it('should log single event successfully', async () => {
    const res = await request(app)
      .post('/api/behavior/log')
      .send({
        type: 'page_view',
        timestamp: Date.now(),
        metadata: { path: '/home' },
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.logId).toBeDefined();
  });

  it('should reject invalid event type', async () => {
    const res = await request(app)
      .post('/api/behavior/log')
      .send({
        type: '',  // 空字符串
        timestamp: Date.now(),
      });

    expect(res.status).toBe(400);
  });

  it('should handle batch logs', async () => {
    const res = await request(app)
      .post('/api/behavior/batch-log')
      .send({
        events: [
          { type: 'page_view', timestamp: Date.now(), metadata: {} },
          { type: 'question_like', timestamp: Date.now(), metadata: { questionId: '1' } },
        ],
      });

    expect(res.body.data.processed).toBe(2);
  });

  it('should respect rate limit', async () => {
    // 发送 61 次请求
    for (let i = 0; i < 61; i++) {
      const res = await request(app)
        .post('/api/behavior/log')
        .send({ type: 'test', timestamp: Date.now() });
      
      if (i === 60) {
        expect(res.status).toBe(429); // Too Many Requests
      }
    }
  });
});
```

---

## 10. 附录

### 10.1 错误码

| Code | 说明 |
|------|------|
| 200 | 成功 |
| 400 | 参数验证失败 |
| 429 | 请求频率超限 |
| 500 | 服务器内部错误 |

### 10.2 相关文档
- [FRONTEND_REQUIREMENTS.md](./FRONTEND_REQUIREMENTS.md) - 前端埋点需求
- [BACKEND-CODING_STANDARDS.md](./BACKEND-CODING_STANDARDS.md) - 后端编码规范

### 10.3 版本历史

| 版本 | 日期 | 变更 |
|-----|------|------|
| v1.0 | 2026-02-02 | 初始版本 |

---

**文档维护者**: 后端开发团队  
**最后更新**: 2026-02-02
