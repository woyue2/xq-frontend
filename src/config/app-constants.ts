/**
 * [POS] src/config/app-constants.ts
 *   所属：config 层 | 角色：应用级常量（难度标签、学科映射、业务阈值等）
 *   兄弟：ui-config.ts / ai-text.ts / feature-flags.ts / taxonomy.ts
 *
 * [INPUT]
 *   （无外部依赖）
 *
 * [OUTPUT]
 *   - DIFFICULTY_LABELS / SUBJECT_LABELS 等常量对象
 *   - ROUTES（应用路由常量，消除硬编码字符串）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/config/CLAUDE.md 的文件清单
 */
export const DIFFICULTY_LABELS = {
  easy: { label: '简单', className: 'bg-green-100 text-green-700' },
  medium: { label: '中等', className: 'bg-yellow-100 text-yellow-700' },
  hard: { label: '难题', className: 'bg-red-100 text-red-700' },
} as const;

export const BADGE_LABELS = {
  goodQuestion: '好问题',
  pinned: '置顶',
} as const;

export const TOAST_MESSAGES = {
  onlyTeacherCanPin: '只有老师可以置顶问题',
  pinned: '已置顶',
  unpinned: '已取消置顶',
  liked: '点赞成功',
  unliked: '已取消点赞',
  favorited: '收藏成功',
  unfavorited: '已取消收藏',
} as const;

export const TIME_LABELS = {
  minutesAgo: '分钟前',
  hoursAgo: '小时前',
  daysAgo: '天前',
} as const;

// ─── 路由常量（消除全局硬编码路由字符串）─────────────────────────────────────
export const ROUTES = {
  home: '/',
  login: '/login',
  profile: '/profile',
  create: '/create',
  audit: '/audit',
  admin: '/admin',
  diagnostic: '/diagnostic',
  goodQuestions: '/good-questions',
  myQuestions: '/my-questions',
  myQuestionsStatus: (status: string) => `/my-questions/status/${status}`,
  myAnswers: '/my-answers',
  myLikes: '/my-likes',
  myFavorites: '/my-favorites',
  notifications: '/notifications',
  parentQuestions: '/parent/questions',
  // 动态路由（函数形式，参数显式传入）
  question: (id: string) => `/question/${id}`,
  answer: (id: string) => `/answer/${id}`,
  editQuestion: (id: string) => `/edit/${id}`,
  studentHistory: (userId: string) => `/student/${userId}/questions`,
  parentChild: (childId: string) => `/parent/questions/${childId}`,
  questionWithAnswer: (id: string, answerId: string) =>
    `/question/${id}?answerId=${encodeURIComponent(answerId)}`,
  homeWithSearch: (q: string) => `/?search=${encodeURIComponent(q)}`,
} as const;
