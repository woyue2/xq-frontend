/**
 * [POS] src/types/parent.ts
 *   所属：types 层 | 角色：家长端专用类型定义
 *   兄弟：index.ts（核心领域类型）/ api.ts（DTO 类型）
 *
 * [INPUT]
 *   （无外部依赖）
 *
 * [OUTPUT]
 *   - ChildInfo（interface）
 *   - BindChildPayload（interface）
 *   - BindChildResponse（interface）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/types/CLAUDE.md 的文件清单
 */
export interface ChildInfo {
  id: string;
  name: string;
  grade: string;
  age: number;
  school?: string;
  avatar?: string;
  boundAt: string;
  lastActiveAt?: string;
  parentId: string; // Added parentId field
}

export interface BindChildPayload {
  childName: string;
  phone: string;
  code: string;
  school?: string;
}

export interface BindChildResponse {
  child: ChildInfo;
}
