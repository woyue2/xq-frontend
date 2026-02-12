import { Options } from 'swagger-jsdoc';

export const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'kpqa API 文档',
      version: '1.0.0',
      description: `
# 知识问答系统后端 API 接口文档

## 通用说明

### 响应格式
所有接口返回 JSON 格式数据，结构如下：
\`\`\`json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1710000000000
}
\`\`\`

### 认证方式
除标注"公开"的接口外，所有接口需要在 Header 中携带 Token：
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

### 错误码说明
- \`200\` - 成功
- \`201\` - 创建成功
- \`400\` - 请求参数错误
- \`401\` - 未登录或 Token 失效
- \`403\` - 无权限
- \`404\` - 资源不存在
- \`500\` - 服务器内部错误
      `,
      contact: {
        name: 'API Support',
        email: 'support@kpqa.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:4000/api',
        description: '本地开发服务器'
      }
    ],
    tags: [
      { name: 'Auth', description: '认证模块' },
      { name: 'Question', description: '问题模块' },
      { name: 'User', description: '用户模块' },
      { name: 'Answer', description: '回答模块' },
      { name: 'Comment', description: '评论模块' },
      { name: 'Interaction', description: '互动模块' },
      { name: 'Behavior', description: '行为日志' },
      { name: 'Notification', description: '通知模块' },
      { name: 'ClassHours', description: '课时模块' },
      { name: 'Parent', description: '亲子绑定' },
      { name: 'Admin', description: '管理模块' },
      { name: 'Upload', description: '文件上传' },
      { name: 'Config', description: '配置信息' },
      { name: 'Health', description: '健康检查' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Token 认证'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: '用户ID' },
            phone: { type: 'string', description: '手机号' },
            name: { type: 'string', description: '真实姓名' },
            nickname: { type: 'string', description: '昵称' },
            avatar: { type: 'string', description: '头像URL' },
            role: { type: 'string', enum: ['student', 'teacher', 'parent', 'admin'], description: '角色' },
            grade: { type: 'string', description: '年级' },
            age: { type: 'number', description: '年龄' },
            school: { type: 'string', description: '学校' },
            expiresAt: { type: 'string', format: 'date-time', description: '账号有效期' },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间' },
            updatedAt: { type: 'string', format: 'date-time', description: '更新时间' }
          }
        },
        Question: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: '问题ID' },
            title: { type: 'string', description: '问题标题' },
            content: { type: 'string', description: '问题内容' },
            images: { type: 'array', items: { type: 'string' }, description: '图片列表' },
            tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'], description: '难度' },
            subject: { type: 'string', description: '学科' },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'], description: '审核状态' },
            authorId: { type: 'string', description: '作者ID' },
            authorName: { type: 'string', description: '作者名称' },
            isGoodQuestion: { type: 'boolean', description: '是否精华' },
            likes: { type: 'number', description: '点赞数' },
            favorites: { type: 'number', description: '收藏数' },
            comments: { type: 'number', description: '评论数' },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间' }
          }
        },
        Answer: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: '回答ID' },
            questionId: { type: 'string', format: 'uuid', description: '问题ID' },
            content: { type: 'string', description: '回答内容' },
            images: { type: 'array', items: { type: 'string' }, description: '图片列表' },
            audioUrl: { type: 'string', description: '音频URL' },
            audioUrls: { type: 'array', items: { type: 'string' }, description: '音频列表' },
            authorId: { type: 'string', description: '作者ID' },
            authorName: { type: 'string', description: '作者名称' },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'], description: '审核状态' },
            likes: { type: 'number', description: '点赞数' },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间' }
          }
        },
        Comment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: '评论ID' },
            questionId: { type: 'string', format: 'uuid', description: '问题ID' },
            authorId: { type: 'string', description: '作者ID' },
            content: { type: 'string', description: '评论内容' },
            image: { type: 'string', description: '评论图片' },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'], description: '审核状态' },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间' }
          }
        },
        ClassHours: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: '用户ID' },
            remainingHours: { type: 'number', description: '剩余课时' },
            usedHours: { type: 'number', description: '已用课时' },
            totalHours: { type: 'number', description: '总课时' },
            status: { type: 'string', enum: ['active', 'expired', 'expiring_soon'], description: '状态' },
            validUntil: { type: 'string', format: 'date-time', description: '有效期至' },
            remainingDays: { type: 'number', description: '剩余天数' }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: '通知ID' },
            userId: { type: 'string', description: '接收用户ID' },
            type: { type: 'string', description: '通知类型' },
            title: { type: 'string', description: '通知标题' },
            content: { type: 'string', description: '通知内容' },
            readAt: { type: 'string', format: 'date-time', description: '阅读时间' },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间' }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            list: { type: 'array', description: '数据列表' },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number', description: '当前页码' },
                pageSize: { type: 'number', description: '每页数量' },
                total: { type: 'number', description: '总数量' },
                totalPages: { type: 'number', description: '总页数' }
              }
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            code: { type: 'number', description: '状态码' },
            message: { type: 'string', description: '提示信息' },
            data: { type: 'object', description: '响应数据' },
            timestamp: { type: 'number', description: '时间戳' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            code: { type: 'number', description: '错误码' },
            message: { type: 'string', description: '错误信息' },
            details: { type: 'object', description: '错误详情' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.ts']
};
