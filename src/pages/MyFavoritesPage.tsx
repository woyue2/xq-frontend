/**
 * [POS] src/pages/MyFavoritesPage.tsx
 *   所属：pages 层 | 角色：我的收藏列表页，路由 `/my-favorites`，已登录可见
 *   兄弟：MyLikesPage.tsx / MyQuestionsPage.tsx / MyAnswersPage.tsx
 *
 * [INPUT]
 *   - lucide-react        → MessageSquare / Heart / Star / ChevronRight
 *   - @/components/ui/*  → Badge
 *   - react-router-dom   → useNavigate
 *
 * [OUTPUT]
 *   - MyFavoritesPage（页面组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/pages/CLAUDE.md 的文件清单
 */
import { MessageSquare, Heart, Star, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import type { MyFavoritedQuestion } from '@/types/api';
import { profileService } from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import { ROUTES } from '@/config/app-constants';

export function MyFavoritesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [myFavorites, setMyFavorites] = useState<MyFavoritedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 未登录用户访问时统一重定向到登录页，保持与 Profile 等个人中心页面一致的保护策略
  useEffect(() => {
    if (!user) {
      navigate(ROUTES.login);
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    profileService
      .getMyFavorites({ page: 1, pageSize: 50 })
      .then((data) => {
        setMyFavorites(data.list);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('加载我的收藏失败', err);
        toast.error('加载我的收藏列表失败，请稍后重试');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user]);

  if (!user) {
    return null;
  }

  const getDifficultyBadge = (difficulty?: string) => {
    const difficultyMap: Record<string, { label: string; className: string }> = {
      easy: { label: '简单', className: 'bg-green-100 text-green-700' },
      medium: { label: '中等', className: 'bg-yellow-100 text-yellow-700' },
      hard: { label: '困难', className: 'bg-red-100 text-red-700' },
    };
    return difficulty ? difficultyMap[difficulty] : null;
  };

  return (
    <div className="flex flex-col pb-10">
      {/* 统计信息 */}
      <div className="bg-white rounded-3xl p-6 mb-4 shadow-sm">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Star className="w-8 h-8 text-yellow-500" />
            <div className="text-3xl font-bold text-gray-800">{myFavorites.length}</div>
          </div>
          <div className="text-sm text-gray-500">收藏的问题</div>
        </div>
      </div>

      {/* 问题列表 */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
          <div className="animate-pulse text-gray-400">加载中...</div>
        </div>
      ) : myFavorites.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
          <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400">还没有收藏任何问题</p>
          <button
            onClick={() => navigate(ROUTES.home)}
            className="mt-6 px-6 py-2 bg-morandi-5 text-white rounded-full hover:bg-morandi-5/90 transition"
          >
            去首页看看
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {myFavorites.map((question) => {
            const difficultyBadge = getDifficultyBadge(undefined);

            return (
              <div
                key={question.id}
                onClick={() => navigate(ROUTES.question(question.id))}
                className="bg-white rounded-3xl p-5 shadow-sm hover:shadow-md transition cursor-pointer"
              >
                {/* 标签 */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {/* 是否好问题/置顶目前后端列表未返回，必要时可后续扩展 */}
                  {difficultyBadge && (
                    <Badge
                      className={`${difficultyBadge.className} border-0 px-3 py-0.5 rounded-full text-xs`}
                    >
                      {difficultyBadge.label}
                    </Badge>
                  )}
                </div>

                {/* 标题 */}
                <h3 className="font-medium text-gray-800 mb-2 line-clamp-2">{question.title}</h3>

                {/* 内容预览 */}
                {question.content && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{question.content}</p>
                )}

                {/* 标签 */}
                {/* 作者信息 */}
                <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                  <span>{question.authorName}</span>
                  <span>•</span>
                  <span>{new Date(question.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>

                {/* 底部统计 */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      <span>{question.likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span>{question.favorites}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>{question.answers}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
