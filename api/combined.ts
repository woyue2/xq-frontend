/**
 * [POS] api/combined.ts
 *   所属：API 路由层 | 角色：合并API解决Vercel限制（免费方案）
 *   兄弟：health.ts / subjects.ts / questions.ts
 *
 * [INPUT]
 *   - 所有API请求通过action参数路由
 *
 * [OUTPUT]
 *   - 统一处理多个模块，减少函数数量
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. api/CLAUDE.md 的文件清单
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// 导入各个模块的处理器
import authHandler from './auth/index';
import usersHandler from './users/index';
import interactionsHandler from './interactions/index';
import adminHandler from './admin/index';
import answersHandler from './answers/index';

// 模块映射
const moduleHandlers: Record<string, any> = {
  auth: authHandler,
  users: usersHandler,
  interactions: interactionsHandler,
  admin: adminHandler,
  answers: answersHandler,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 添加CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action } = req.query;
    
    if (!action || typeof action !== 'string' || !moduleHandlers[action]) {
      return res.status(404).json({ error: 'API module not found' });
    }

    // 获取对应的处理器
    const handler = moduleHandlers[action];
    
    if (!handler || typeof handler !== 'function') {
      return res.status(500).json({ error: 'Invalid module handler' });
    }

    // 调用对应的处理器
    return await handler(req, res);
    
  } catch (error) {
    console.error('Combined API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
