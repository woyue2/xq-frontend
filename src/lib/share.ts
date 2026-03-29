/**
 * [POS] src/lib/share.ts
 *   所属：lib 层 | 角色：分享 URL 构建 + 剪贴板写入工具函数
 *   兄弟：utils.ts / mock-env.ts
 *
 * [INPUT]
 *   （无外部依赖）
 *
 * [OUTPUT]
 *   - getShareBaseUrl / buildQuestionShareUrl / copyToClipboardSafe
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/lib/CLAUDE.md 的文件清单
 */
export const getShareBaseUrl = (): string | null => {
  try {
    // 1) 优先使用系统配置中心写入的覆盖值（本地存储）
    if (typeof window !== 'undefined') {
      try {
        const overrideRaw = window.localStorage.getItem('share-base-url');
        const override = overrideRaw?.trim();
        if (override) {
          return override.replace(/\/+$/, '');
        }
      } catch {
        // 本地存储读取失败时忽略，退化为使用环境变量或 origin
      }
    }

    // 2) 退化为使用环境变量 VITE_SHARE_BASE_URL
    const anyImportMeta = import.meta as any;
    const env = anyImportMeta?.env as Record<string, unknown> | undefined;
    const rawEnv = (env?.VITE_SHARE_BASE_URL as string | undefined)?.trim();

    if (rawEnv) {
      // 过滤掉常见的占位/示例配置，避免复制无效链接
      if (
        rawEnv.includes('基础域名') ||
        rawEnv.includes('example.com') ||
        rawEnv.startsWith('http://your-domain') ||
        rawEnv.startsWith('https://your-domain')
      ) {
        // 占位值视为未配置，继续尝试其他来源
      } else {
        return rawEnv.replace(/\/+$/, '');
      }
    }

    // 3) 最后退化为使用运行时 origin（仅浏览器环境可用）
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin.replace(/\/+$/, '');
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * 构造“问题详情”分享链接
 * - 优先使用系统配置中心/本地覆盖值
 * - 再退化到 VITE_SHARE_BASE_URL
 * - 再退化到 window.location.origin
 * - 在无浏览器环境下返回 null
 */
export const buildQuestionShareUrl = (questionId: string): string | null => {
  const base = getShareBaseUrl();
  if (!base) return null;
  return `${base}/question/${questionId}`;
};

/**
 * 尝试写入剪贴板
 * - 成功返回 true
 * - 不支持或失败返回 false，不抛异常
 */
export const copyToClipboardSafe = async (text: string): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
