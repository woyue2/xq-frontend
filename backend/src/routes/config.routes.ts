/**
 * [POS] backend/src/routes/config.routes.ts
 *   所属：路由层 | 角色：前端配置路由（题目维度、科目/考点等公开配置查询）
 *
 * [INPUT]
 *   - express                                  → Router / Request / Response / NextFunction
 *   - ../services/question-dimension.service   → questionDimensionService
 *   - ../services/subject.service              → subjectService
 *
 * [OUTPUT]
 *   - configRouter（Express Router）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. backend/src/routes/CLAUDE.md 的文件清单
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { questionDimensionService } from '../services/question-dimension.service';
import { subjectService } from '../services/subject.service';

export const configRouter = Router();

// 面向前端：获取题目维度配置（当前主要用于解题方法/办法维度）
configRouter.get(
  '/question-dimensions',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dimensions = await questionDimensionService.getPublicDimensions();

      return res.json({
        code: 200,
        message: 'success',
        data: {
          dimensions: dimensions.map((dim) => ({
            key: dim.key,
            name: dim.name,
            enabled: dim.enabled,
            multiSelect: dim.multiSelect,
            options: dim.options.map((opt) => ({
              id: opt.id,
              value: opt.value,
              label: opt.label,
              order: opt.order
            }))
          }))
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

// 面向前端：获取启用的科目及考点配置
configRouter.get(
  '/subjects',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subjects = await subjectService.getPublicSubjects();

      return res.json({
        code: 200,
        message: 'success',
        data: {
          subjects: subjects.map((s) => ({
            key: s.key,
            name: s.name,
            order: s.order,
            topics: s.topics.map((t) => ({
              value: t.value,
              label: t.label,
              order: t.order
            }))
          }))
        },
        timestamp: Date.now()
      });
    } catch (err) {
      next(err);
    }
  }
);

