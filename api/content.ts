/**
 * [POS] api/content.ts
 *   所属：API 路由层 | 角色：内容管理统一入口（questions + answers + comments）
 *   兄弟：core.ts / auth.ts / social.ts
 *
 * [INPUT]
 *   - module参数：'questions' | 'answers' | 'comments'
 *   - 各模块原始请求参数
 *
 * [OUTPUT]
 *   - 统一路由到 questions/answers/comments 处理器
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. api/CLAUDE.md 的文件清单
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// 导入原始模块处理器
import questionsHandler from './questions/index';
import answersHandler from './answers/index';
import commentsHandler from './comments/index';

// 模块映射
const handlers: Record<string, Function> = {
  questions: questionsHandler,
  answers: answersHandler,
  comments: commentsHandler,
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
    console.error('[Content API Error]', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown'
    });
  }
}
