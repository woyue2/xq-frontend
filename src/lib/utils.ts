/**
 * [POS] src/lib/utils.ts
 *   所属：lib 层 | 角色：通用工具函数（classnames 合并等）
 *   兄弟：permissions.ts / share.ts / mock-env.ts
 *
 * [INPUT]
 *   - clsx        → ClassValue / clsx
 *   - tailwind-merge → twMerge
 *
 * [OUTPUT]
 *   - cn(...inputs): string（Tailwind classnames 合并）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/lib/CLAUDE.md 的文件清单
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
