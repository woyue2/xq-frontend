/**
 * [POS] src/lib/swr-config.ts
 *   所属：lib 层 | 角色：SWR 配置和 fetcher 函数
 *
 * [INPUT]
 *   - swr → SWRConfiguration
 *
 * [OUTPUT]
 *   - swrConfig: SWR 全局配置
 *   - fetcher: 通用 fetcher 函数
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/lib/CLAUDE.md 的文件清单
 */

import type { SWRConfiguration } from 'swr';

/**
 * 通用 fetcher 函数
 * 用于 SWR 的数据获取
 */
export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = new Error('API request failed');
    throw error;
  }
  
  const data = await response.json();
  
  // 处理 API 响应格式 { code, data, timestamp }
  if (data.code === 200) {
    return data.data;
  }
  
  throw new Error(data.message || 'API error');
}

/**
 * SWR 全局配置
 */
export const swrConfig: SWRConfiguration = {
  // 重新验证配置
  revalidateOnFocus: false, // 窗口聚焦时不重新验证（避免频繁请求）
  revalidateOnReconnect: true, // 网络重连时重新验证
  
  // 缓存配置
  dedupingInterval: 5000, // 5 秒内相同请求去重
  
  // 错误重试配置
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 1000, // 1 秒后重试
  
  // 使用通用 fetcher
  fetcher,
};
