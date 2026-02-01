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

  addLog: (log) => set((state) => ({ logs: [...state.logs, `[${new Date().toLocaleTimeString()}] ${log}`] })),
  
  updateResult: (id, result) => set((state) => ({
    results: state.results.map((r) => (r.id === id ? { ...r, ...result } : r)),
  })),

  startTests: () => set({ isRunning: true, progress: 0, logs: [] }),
  
  completeTests: () => set({ isRunning: false, progress: 100 }),
  
  reset: () => set({ results: [], isRunning: false, progress: 0, logs: [] }),
}));
