/**
 * [POS] src/stores/useDiagnosticStore.ts
 *   所属：stores 层 | 角色：诊断页面测试结果的全局状态（dev 模式）
 *   兄弟：useAuthStore.ts
 *
 * [INPUT]
 *   - zustand  → create
 *
 * [OUTPUT]
 *   - DiagnosticResult（interface）
 *   - DiagnosticStore（interface）
 *   - useDiagnosticStore（Zustand store）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/stores/CLAUDE.md 的文件清单
 */
import { create } from 'zustand';

export interface DiagnosticResult {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'failure';
  message?: string;
  duration?: number;
  timestamp?: number;
}

export interface DiagnosticStore {
  results: DiagnosticResult[];
  isRunning: boolean;
  progress: number;
  logs: string[];

  // Actions
  addLog: (log: string) => void;
  updateResult: (id: string, result: Partial<DiagnosticResult>) => void;
  startTests: () => void;
  completeTests: () => void;
  reset: () => void;
}

export const useDiagnosticStore = create<DiagnosticStore>((set) => ({
  results: [],
  isRunning: false,
  progress: 0,
  logs: [],

  addLog: (log) =>
    set((state) => ({ logs: [...state.logs, `[${new Date().toLocaleTimeString()}] ${log}`] })),

  updateResult: (id, result) =>
    set((state) => ({
      results: state.results.map((r) => (r.id === id ? { ...r, ...result } : r)),
    })),

  startTests: () => set({ isRunning: true, progress: 0, logs: [] }),

  completeTests: () => set({ isRunning: false, progress: 100 }),

  reset: () => set({ results: [], isRunning: false, progress: 0, logs: [] }),
}));
