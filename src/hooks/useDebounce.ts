/**
 * [POS] src/hooks/useDebounce.ts
 *   所属：hooks 层 | 角色：通用防抖 hook
 *   兄弟：useQuestions.ts / useAdminWhitelist.ts / useQuestionDetail.ts
 *
 * [INPUT]
 *   - react  → useEffect / useState
 *
 * [OUTPUT]
 *   - useDebounce<T>(value, delay): T（泛型防抖值）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/hooks/CLAUDE.md 的文件清单
 */
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
