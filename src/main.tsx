/**
 * [POS] src/main.tsx
 *   所属：入口层 | 角色：React 应用挂载入口
 *   兄弟：App.tsx
 *
 * [INPUT]
 *   - react-dom/client  → createRoot
 *   - ./App.tsx          → App
 *   - ./styles/index.css
 *
 * [OUTPUT]
 *   （无导出，仅挂载 DOM）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/CLAUDE.md
 */

import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(<App />);
