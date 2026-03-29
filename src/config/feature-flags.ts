/**
 * [POS] src/config/feature-flags.ts
 *   所属：config 层 | 角色：功能开关配置（控制新功能灰度发布）
 *   兄弟：app-constants.ts / ui-config.ts / ai-text.ts / taxonomy.ts
 *
 * [INPUT]
 *   （无外部依赖）
 *
 * [OUTPUT]
 *   - FEATURE_FLAGS（功能开关常量对象）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/config/CLAUDE.md 的文件清单
 */
/**
 * Feature Flags Configuration
 * Used to control the visibility of new features during development and rollout.
 */

export const featureFlags = {
  // Enable "Good Question" badge interactivity (click to view list)
  ENABLE_GOOD_QUESTION_INTERACTION: true,
};

export const useFeatureFlag = (flag: keyof typeof featureFlags) => {
  return featureFlags[flag];
};
