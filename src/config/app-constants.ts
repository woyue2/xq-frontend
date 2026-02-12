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
