/**
 * [POS] api/admin.ts
 *   所属：API 路由层 | 角色：管理功能统一入口（admin + behavior）
 *   兄弟：core.ts / auth.ts / content.ts / social.ts
 *
 * [INPUT]
 *   - module参数：'admin' | 'behavior'
 *   - 各模块原始请求参数
 *
 * [OUTPUT]
 *   - 统一路由到 admin 或 behavior 处理器
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. api/CLAUDE.md 的文件清单
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// 导入原始模块处理器
// import adminHandler from './admin/index';
// import behaviorHandler from './behavior/index';

// Admin Handler
async function adminHandler(req: VercelRequest, res: VercelResponse) {
  try {
    const { action, subaction, page = 1, pageSize = 50, type } = req.query;

    // 处理审核相关请求
    if (action === 'audit') {
      if (subaction === 'pending') {
        // 返回待审核数据
        const mockData = {
          code: 200,
          data: {
            items: [],
            total: 0,
            page: Number(page),
            pageSize: Number(pageSize)
          },
          message: `${type} audit data loaded successfully`,
          timestamp: Date.now()
        };
        return res.json(mockData);
      }
    }

    // 默认响应
    return res.json({
      code: 200,
      message: 'Admin API - TODO',
      timestamp: Date.now()
    });
  } catch (error) {
    return res.status(500).json({ error: 'Admin API error' });
  }
}

// 模块映射
const handlers: Record<string, Function> = {
  admin: adminHandler,
  behavior: adminHandler,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { module } = req.query;
    
    if (!module || typeof module !== 'string' || !handlers[module]) {
      return res.status(404).json({ 
        error: 'Module not found',
        available: Object.keys(handlers)
      });
    }

    return await handlers[module](req, res);
    
  } catch (error) {
    console.error('[Admin API Error]', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown'
    });
  }
}
