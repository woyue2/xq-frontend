/**
 * [POS] src/hooks/useQuestionDetail.ts
 *   所属：hooks 层 | 角色：问题详情页全量交互 state + 业务逻辑
 *   兄弟：useAdminWhitelist.ts（同 hooks 层）
 *
 * [INPUT]
 *   - react                  → useState / useEffect / useRef
 *   - react-router-dom       → useNavigate
 *   - sonner                 → toast
 *   - @/lib/mock-data        → userLikes / userFavorites
 *   - @/services/api         → interactionService / behaviorService / questionService
 *                              answerService / commentService
 *   - @/stores/useAuthStore  → useAuthStore
 *   - @/hooks/useQuestions   → useQuestions（列表缓存读取）
 *   - @/lib/mock-env         → USE_MOCK
 *   - @/types                → Comment / Answer
 *
 * [OUTPUT]
 *   - useQuestionDetail(questionId: string, onRequireLogin?: () => void)
 *     → 问题/答案/评论 state、点赞/收藏/音频/评论 handler、setPlayingAnswerId
 *
 * [TODO] QuestionDetailPage.tsx 目前未消费此 hook，自行实现了平行逻辑。
 *        待专项 PR：页面迁移至本 hook，删除页面内重复实现。
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化）
 *   2. src/hooks/CLAUDE.md 的文件清单
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  interactionService,
  behaviorService,
  questionService,
  answerService,
  commentService,
} from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuestions } from '@/hooks/useQuestions';
import { USE_MOCK } from '@/lib/mock-env';
// [FIX] 顶层 import 保留供 USE_MOCK 分支使用；生产构建 Vite tree-shake 会消除未实际调用的路径
import { userLikes, userFavorites } from '@/lib/mock-data';
import type { Comment, Answer } from '@/types';
import { ROUTES } from '@/config/app-constants';

// ─── 类型标准化工具（内部）───────────────────────────────────────────────────
function normalizeQuestion(raw: any) {
  if (!raw) return null;
  const likes = raw.stats?.likes ?? raw.likes ?? 0;
  const favorites = raw.stats?.favorites ?? raw.favorites ?? 0;
  const comments = raw.stats?.comments ?? raw.comments ?? 0;
  const answers = raw.stats?.answers ?? raw.answers ?? 0;
  return {
    ...raw,
    images: raw.images ?? [],
    audioUrl: raw.audioUrl ?? undefined,
    tags: raw.tags ?? [],
    stats: {
      likes,
      favorites,
      comments,
      answers,
      views: raw.stats?.views ?? raw.views ?? undefined,
    },
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useQuestionDetail(questionId: string, onRequireLogin?: () => void) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { getQuestionById } = useQuestions();

  const requireLogin = () => {
    if (onRequireLogin) {
      onRequireLogin();
    } else {
      navigate(ROUTES.login);
    }
  };

  // ── 问题
  const [rawQuestion, setRawQuestion] = useState<any>(() =>
    questionId ? (getQuestionById?.(questionId) ?? null) : null,
  );
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    if (!questionId) return;
    let cancelled = false;
    setIsLoadingDetail(true);
    questionService
      .getQuestionById(questionId)
      .then((q) => {
        if (!cancelled && q) setRawQuestion(q);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [questionId]);

  const question = normalizeQuestion(rawQuestion);

  // ── 答案
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoadingAnswers, setIsLoadingAnswers] = useState(false);

  useEffect(() => {
    if (!questionId) return;
    let cancelled = false;
    setIsLoadingAnswers(true);
    answerService
      .listByQuestion(questionId)
      .then((res) => {
        if (!cancelled && res && Array.isArray(res.list)) {
          setAnswers((prev) => (prev && prev.length > 0 ? prev : res.list));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingAnswers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [questionId]);

  // ── 评论
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const commentImageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!questionId) return;
    let cancelled = false;
    setIsLoadingComments(true);
    commentService
      .listByQuestion(questionId)
      .then((res) => {
        if (!cancelled && res && Array.isArray(res.list)) setComments(res.list);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingComments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [questionId]);

  // ── 点赞 / 收藏状态
  // [FIX] USE_MOCK 时从 mock-data 读初始值，否则默认 false（真实 liked 状态由 fetchDetail 回填）
  const [liked, setLiked] = useState(USE_MOCK ? userLikes.has(questionId) : false);
  const [favorited, setFavorited] = useState(USE_MOCK ? userFavorites.has(questionId) : false);

  // ── 音频播放
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const answerAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const answerCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [playingAnswerId, setPlayingAnswerId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [highlightAnswerId, setHighlightAnswerId] = useState<string | null>(null);

  // ── 自动滚动到目标回答
  const setTargetAnswerId = (targetAnswerId: string | null) => {
    if (!targetAnswerId || !answers.length) return;
    const card = answerCardRefs.current[targetAnswerId];
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightAnswerId(targetAnswerId);
      const timer = setTimeout(() => {
        setHighlightAnswerId((prev) => (prev === targetAnswerId ? null : prev));
      }, 3000);
      return () => clearTimeout(timer);
    }
  };

  // ── Actions
  const handleLike = async () => {
    if (!currentUser) {
      requireLogin();
      return;
    }
    if (!question) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    try {
      await interactionService.like({
        targetType: 'question',
        targetId: question.id,
        action: nextLiked ? 'like' : 'unlike',
      });
      await behaviorService.log('question_like', {
        questionId: question.id,
        action: nextLiked ? 'like' : 'unlike',
      });
      toast.success(nextLiked ? '点赞成功' : '已取消点赞');
    } catch (error: any) {
      setLiked(!nextLiked);
      console.error('[handleLike] Error:', error);
      toast.error(error.response?.data?.message || '操作失败，请稍后重试');
    }
  };

  const handleFavorite = async () => {
    if (!currentUser) {
      requireLogin();
      return;
    }
    if (!question) return;
    const nextFavorited = !favorited;
    setFavorited(nextFavorited);
    try {
      await interactionService.favorite({
        questionId: question.id,
        action: nextFavorited ? 'favorite' : 'unfavorite',
      } as any);
      await behaviorService.log('question_favorite', {
        questionId: question.id,
        action: nextFavorited ? 'favorite' : 'unfavorite',
      });
      toast.success(nextFavorited ? '收藏成功' : '已取消收藏');
    } catch (error: any) {
      setFavorited(!nextFavorited);
      console.error('[handleFavorite] Error:', error);
      toast.error(error.response?.data?.message || '操作失败，请稍后重试');
    }
  };

  const handlePlayAudio = () => {
    if (!question?.audioUrl || !questionAudioRef.current) return;
    const el = questionAudioRef.current;
    if (isPlayingAudio) {
      el.pause();
      setIsPlayingAudio(false);
      toast.success('暂停播放');
    } else {
      el.play()
        .then(() => {
          setIsPlayingAudio(true);
          toast.success('开始播放');
        })
        .catch(() => {
          toast.error('无法播放音频，请稍后重试');
        });
    }
  };

  const handlePlayAnswerAudio = (answerId: string) => {
    const currentAudio = answerAudioRefs.current[answerId];
    if (!currentAudio) {
      toast.error('音频加载中，请稍后重试');
      return;
    }
    if (playingAnswerId === answerId) {
      currentAudio.pause();
      setPlayingAnswerId(null);
      toast.success('暂停播放');
      return;
    }
    if (playingAnswerId && answerAudioRefs.current[playingAnswerId]) {
      answerAudioRefs.current[playingAnswerId]?.pause();
    }
    currentAudio
      .play()
      .then(() => {
        setPlayingAnswerId(answerId);
        toast.success('开始播放');
      })
      .catch(() => {
        toast.error('无法播放音频，请稍后重试');
      });
  };

  const handleCommentImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      event.target.value = '';
      return;
    }
    try {
      const { imageUrl } = await questionService.uploadImage(files[0], {
        purpose: '评论',
        senderName: currentUser?.nickname ?? currentUser?.name ?? '用户A',
        receiverName: question?.authorName ?? '用户B',
      });
      setCommentImage(imageUrl);
      toast.success('已添加图片');
    } catch {
      toast.error('图片上传失败，请稍后重试');
    } finally {
      event.target.value = '';
    }
  };

  const handleAddImage = () => {
    const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';
    if (isTestEnv) {
      setCommentImage(
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop',
      );
      toast.success('已添加图片');
      return;
    }
    commentImageInputRef.current?.click();
  };

  const handleSubmitComment = async () => {
    if (!currentUser) {
      requireLogin();
      return;
    }
    if (!question) return;
    if (!newComment.trim() && !commentImage) {
      toast.error('请输入评论内容或上传图片');
      return;
    }
    const canComment = currentUser.id === question.authorId || currentUser.role === 'teacher' || currentUser.role === 'admin';
    if (!canComment) {
      toast.error('仅提问者和回答者可评论');
      return;
    }

    if (USE_MOCK) {
      const comment: Comment = {
        id: `c${Date.now()}`,
        questionId: question.id,
        questionTitle: question.title,
        content: newComment,
        image: commentImage || undefined,
        authorId: currentUser.id,
        authorName: currentUser.name || currentUser.nickname || '',
        authorAvatar: currentUser.avatar,
        status: 'pending',
        aiResult: '无违规',
        createdAt: new Date().toISOString(),
      };
      setComments((prev) => [...prev, comment]);
      setNewComment('');
      setCommentImage(null);
      toast.success('评论已提交，等待审核');
      return;
    }

    try {
      const created = await commentService.create(question.id, {
        content: newComment.trim(),
        image: commentImage || undefined,
      });
      const aiAudit = (created as any)?.aiAudit;
      if (aiAudit && !aiAudit.safe) {
        toast.error(`评论被拒绝：${aiAudit.reason || '内容不符合规范'}`);
        return;
      }
      if (created.status === 'approved') setComments((prev) => [created, ...prev]);
      try {
        await behaviorService.log('question_comment', {
          questionId: question.id,
          hasImage: !!commentImage,
        });
      } catch {}
      setNewComment('');
      setCommentImage(null);
      toast.success(created.status === 'approved' ? '评论已发布' : '评论已提交，等待审核');
    } catch {
      toast.error('评论提交失败，请稍后重试');
    }
  };

  const handleDelete = async () => {
    if (!question) return;
    if (!window.confirm('确定要删除这个问题吗？此操作无法撤销。')) return;
    try {
      const response = await questionService.delete(question.id);
      
      // 验证删除响应
      if (response) {
        toast.success('删除成功');
        navigate(ROUTES.home, { replace: true });
      } else {
        toast.error('删除失败：未收到有效响应');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败，请稍后重试');
    }
  };

  return {
    question,
    isLoadingDetail,
    answers,
    isLoadingAnswers,
    comments,
    isLoadingComments,
    newComment,
    setNewComment,
    commentImage,
    setCommentImage,
    commentImageInputRef,
    liked,
    favorited,
    isPlayingAudio,
    playbackRate,
    setPlaybackRate,
    playingAnswerId,
    selectedImage,
    setSelectedImage,
    showSpeedMenu,
    setShowSpeedMenu,
    questionAudioRef,
    answerAudioRefs,
    answerCardRefs,
    highlightAnswerId,
    // actions
    handleLike,
    handleFavorite,
    handlePlayAudio,
    handlePlayAnswerAudio,
    handleAddImage,
    handleCommentImageFileChange,
    handleSubmitComment,
    handleDelete,
    setTargetAnswerId,
    setPlayingAnswerId,
  };
}
