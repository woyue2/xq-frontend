export const DIFFICULTY_LABELS = {
  easy: '简单',
  medium: '中等',
  hard: '难题',
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
