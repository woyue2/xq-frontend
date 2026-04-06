/**
 * [POS] api/core.ts
 *   所属：API 路由层 | 角色：核心功能统一入口（health + subjects）
 *   兄弟：auth.ts / content.ts / social.ts
 *
 * [INPUT]
 *   - module参数：'health' | 'subjects'
 *   - 各模块原始请求参数
 *
 * [OUTPUT]
 *   - 统一路由到 health 或 subjects 处理器
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. api/CLAUDE.md 的文件清单
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Health Handler
async function healthHandler(req: VercelRequest, res: VercelResponse) {
  try {
    return res.json({
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime()
    });
  } catch (error) {
    return res.status(500).json({ error: 'Health check failed' });
  }
}

// Subjects Handler
async function subjectsHandler(req: VercelRequest, res: VercelResponse) {
  try {
    // 返回科目配置
    const subjects = [
      { id: 'math', name: '数学', icon: '📐' },
      { id: 'chinese', name: '语文', icon: '📚' },
      { id: 'english', name: '英语', icon: '🔤' },
      { id: 'physics', name: '物理', icon: '⚡' },
      { id: 'chemistry', name: '化学', icon: '🧪' },
      { id: 'biology', name: '生物', icon: '🧬' },
      { id: 'history', name: '历史', icon: '📜' },
      { id: 'geography', name: '地理', icon: '🌍' },
      { id: 'politics', name: '政治', icon: '🏛️' }
    ];

    return res.json({
      code: 200,
      data: subjects,
      message: 'Subjects loaded successfully',
      timestamp: Date.now()
    });
  } catch (error) {
    return res.status(500).json({ error: 'Subjects API error' });
  }
}

// 模块映射
const handlers: Record<string, Function> = {
  health: healthHandler,
  subjects: subjectsHandler,
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
    console.error('[Core API Error]', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown'
    });
  }
}
