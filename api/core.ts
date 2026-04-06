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
    // 返回科目配置 - 使用前端期望的格式
    const subjects = [
      { 
        key: 'subject_math', 
        name: '数学', 
        order: 1,
        topics: [
          { value: 'math_algebra', label: '代数', order: 10 },
          { value: 'math_geometry', label: '几何', order: 20 },
          { value: 'math_statistics', label: '统计', order: 30 }
        ]
      },
      { 
        key: 'subject_chinese', 
        name: '语文', 
        order: 2,
        topics: [
          { value: 'chinese_reading', label: '阅读', order: 10 },
          { value: 'chinese_writing', label: '写作', order: 20 },
          { value: 'chinese_classical', label: '古文', order: 30 }
        ]
      },
      { 
        key: 'subject_english', 
        name: '英语', 
        order: 3,
        topics: [
          { value: 'english_reading', label: '阅读', order: 10 },
          { value: 'english_writing', label: '写作', order: 20 },
          { value: 'english_grammar', label: '语法', order: 30 }
        ]
      },
      { 
        key: 'subject_physics', 
        name: '物理', 
        order: 4,
        topics: [
          { value: 'physics_mechanics', label: '力学', order: 10 },
          { value: 'physics_electromagnetism', label: '电磁学', order: 20 },
          { value: 'physics_optics', label: '光学', order: 30 }
        ]
      },
      { 
        key: 'subject_chemistry', 
        name: '化学', 
        order: 5,
        topics: [
          { value: 'chemistry_organic', label: '有机化学', order: 10 },
          { value: 'chemistry_inorganic', label: '无机化学', order: 20 },
          { value: 'chemistry_physical', label: '物理化学', order: 30 }
        ]
      }
    ];

    // 使用前端期望的格式
    return res.json({
      subjects: subjects
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
