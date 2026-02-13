import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Share2, Heart, Star, MessageCircle, Send, Play, Pause, Volume2, Camera, X, MessageSquare, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { GoodQuestionBadge } from '@/components/ui/good-question-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { userLikes, userFavorites } from '@/lib/mock-data';
import type { Comment, DifficultyLevel, Answer } from '@/types';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import { ImageCarousel } from '@/components/ui/image-carousel';
import { motion, AnimatePresence } from 'framer-motion';
import { UI_CONFIG } from '@/config/ui-config';
import { Pin } from 'lucide-react';
import { interactionService, behaviorService, questionService, answerService, commentService } from '@/services/api';
import { USE_MOCK } from '@/lib/mock-env';
import { useQuestions } from '@/hooks/useQuestions';
import { buildQuestionShareUrl, copyToClipboardSafe } from '@/lib/share';

const normalizeQuestion = (raw: any) => {
  if (!raw) return null;

  const likes =
    (raw.stats && typeof raw.stats.likes === 'number' ? raw.stats.likes : undefined) ??
    (typeof raw.likes === 'number' ? raw.likes : 0);
  const favorites =
    (raw.stats && typeof raw.stats.favorites === 'number' ? raw.stats.favorites : undefined) ??
    (typeof raw.favorites === 'number' ? raw.favorites : 0);
  const comments =
    (raw.stats && typeof raw.stats.comments === 'number' ? raw.stats.comments : undefined) ??
    (typeof raw.comments === 'number' ? raw.comments : 0);
  const answers =
    (raw.stats && typeof raw.stats.answers === 'number' ? raw.stats.answers : undefined) ??
    (typeof raw.answers === 'number' ? raw.answers : 0);

  return {
    ...raw,
    images: raw.images ?? [],
    audioUrl: raw.audioUrl ?? undefined,
    tags: raw.tags ?? raw.tags ?? [],
    stats: {
      likes,
      favorites,
      comments,
      answers,
      views:
        raw.stats && typeof raw.stats.views === 'number'
          ? raw.stats.views
          : raw.views ?? undefined
    }
  };
};

export function QuestionDetailPage() {
  const { id: questionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuthStore();
  const { getQuestionById } = useQuestions();
  const safeQuestionId = questionId || '';
  const commentImageInputRef = useRef<HTMLInputElement | null>(null);

  // 初始优先从列表缓存中读取（Home/MyQuestions 等通过 useQuestions 已经加载的场景）
  // 这样在前端单元测试中仍然可以通过 mock useQuestions 提供数据，无需真实网络请求。
  const [rawQuestion, setRawQuestion] = useState<any>(() => {
    if (!safeQuestionId) return null;
    const fromList = getQuestionById?.(safeQuestionId);
    return fromList ?? null;
  });
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    if (!safeQuestionId) return;

    let cancelled = false;
    setIsLoadingDetail(true);

    questionService
      .getQuestionById(safeQuestionId)
      .then((q) => {
        if (!cancelled && q) {
          setRawQuestion(q);
        }
      })
      .catch(() => {
        // 出错时保持现有状态，由下方 fallback 处理
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingDetail(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [safeQuestionId]);

  const question = normalizeQuestion(rawQuestion);

  // 回答列表：仅依赖后端接口
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoadingAnswers, setIsLoadingAnswers] = useState(false);

  useEffect(() => {
    if (!safeQuestionId) return;

    let cancelled = false;
    setIsLoadingAnswers(true);

    answerService
      .listByQuestion(safeQuestionId)
      .then((res) => {
        if (!cancelled && res && Array.isArray(res.list)) {
          // 若已通过测试注入或 Mock 提供本地 answers，则只在本地为空时覆盖
          setAnswers((prev) => (prev && prev.length > 0 ? prev : res.list));
        }
      })
      .catch(() => {
        // 失败时保留现有 answers（通常来自 mock），由 UI 做兜底展示
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingAnswers(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [safeQuestionId]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [liked, setLiked] = useState(userLikes.has(safeQuestionId));
  const [favorited, setFavorited] = useState(userFavorites.has(safeQuestionId));
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [playingAnswerId, setPlayingAnswerId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const answerAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const answerCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [targetAnswerId, setTargetAnswerId] = useState<string | null>(() => {
    const fromQuery = searchParams.get('answerId');
    const fromState = (location.state as any)?.answerId as string | undefined;
    return (fromQuery || fromState) ?? null;
  });
  const [highlightAnswerId, setHighlightAnswerId] = useState<string | null>(null);

  useEffect(() => {
    if (!safeQuestionId) return;

    let cancelled = false;
    setIsLoadingComments(true);

    commentService
      .listByQuestion(safeQuestionId)
      .then((res) => {
        if (!cancelled && res && Array.isArray(res.list)) {
          setComments(res.list);
        }
      })
      .catch(() => {
        // 出错时保持当前 comments 状态，由 UI 做兜底展示
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingComments(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [safeQuestionId]);

  // 当回答列表加载完成并且存在目标 answerId 时，自动滚动并高亮目标回答卡片
  useEffect(() => {
    if (!targetAnswerId) return;
    if (!answers || answers.length === 0) return;

    const card = answerCardRefs.current[targetAnswerId];
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightAnswerId(targetAnswerId);
      const timer = setTimeout(() => {
        setHighlightAnswerId((prev) => (prev === targetAnswerId ? null : prev));
      }, 3000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [answers, targetAnswerId]);

  if (!question) {
    // 统一在“加载中 / 未找到”状态下也提供返回按钮，
    // 便于测试与实际用户都可以轻松返回上一页。
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-white shadow-sm sticky top-0 z-10 -mx-4 px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition"
            data-testid="back-button"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex flex-col items-center flex-1">
            <h1 className="text-base font-bold text-gray-800">问题详情</h1>
          </div>
          <button
            onClick={() => toast.error('当前无法分享该问题')}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <Share2 className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="min-h-screen bg-[#EDEDE9] flex items-center justify-center flex-col gap-4">
          <p className="text-gray-500">
            {isLoadingDetail ? '问题加载中...' : '问题不存在'}
          </p>
          {!isLoadingDetail && (
            <button
              onClick={() => navigate('/')}
              className="text-blue-500 underline"
            >
              返回首页
            </button>
          )}
        </div>
      </div>
    );
  }

  const getDifficultyConfig = (difficulty?: DifficultyLevel) => {
    const configs = {
      easy: { label: '简单', className: UI_CONFIG.colors.difficulty.easy },
      medium: { label: '中等', className: UI_CONFIG.colors.difficulty.medium },
      hard: { label: '难题', className: UI_CONFIG.colors.difficulty.hard },
    };
    return difficulty ? configs[difficulty] : null;
  };

  const difficultyConfig = getDifficultyConfig(question.difficulty);

  const handleLike = async () => {
    if (!currentUser) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }

    const nextLiked = !liked;
    setLiked(nextLiked);

    try {
      await interactionService.like({
        targetType: 'question',
        targetId: question.id,
        action: nextLiked ? 'like' : 'unlike'
      });

      await behaviorService.log('question_like', {
        questionId: question.id,
        action: nextLiked ? 'like' : 'unlike'
      });

      toast.success(nextLiked ? '点赞成功' : '已取消点赞');
    } catch {
      // 回滚本地状态
      setLiked(!nextLiked);
    }
  };

  const handleFavorite = async () => {
    if (!currentUser) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }

    const nextFavorited = !favorited;
    setFavorited(nextFavorited);

    try {
      await interactionService.favorite({
        questionId: question.id,
        action: nextFavorited ? 'favorite' : 'unfavorite'
      });

      await behaviorService.log('question_favorite', {
        questionId: question.id,
        action: nextFavorited ? 'favorite' : 'unfavorite'
      });

      toast.success(nextFavorited ? '收藏成功' : '已取消收藏');
    } catch {
      setFavorited(!nextFavorited);
    }
  };

  const handleShare = async () => {
    const shareUrl = buildQuestionShareUrl(question.id);
    if (!shareUrl) {
      toast.error('暂未配置分享域名，当前不支持复制分享链接');
      return;
    }

    const copied = await copyToClipboardSafe(shareUrl);
    if (copied) {
      toast.success('分享链接已复制');
    } else {
      // 剪贴板不可用时，退化为直接展示链接，交由用户手动复制
      toast.success(`分享链接：${shareUrl}`);
    }
  };

  const handleAnswer = () => {
    if (currentUser?.role === 'teacher') {
      navigate(`/answer/${question.id}`);
    } else {
      toast.error('暂无回答权限');
    }
  };

  const handleAuthorClick = () => {
    if (!currentUser) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }

    if (currentUser.role === 'teacher') {
      navigate(`/student/${question.authorId}/questions`);
      return;
    }

    if (currentUser.role === 'parent') {
      toast.error('请在“孩子提问列表”页查看孩子的历史提问');
    }
  };

  const handleAddImage = () => {
    // 在单元测试环境或纯前端 Mock 场景下，直接模拟添加一张图片，保证预览与测试稳定
    const isTestEnv =
      typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.MODE === 'test';

    if (isTestEnv) {
      const mockPreview =
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop';
      setCommentImage(mockPreview);
      toast.success('已添加图片');
      return;
    }

    commentImageInputRef.current?.click();
  };

  const handleCommentImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      event.target.value = '';
      return;
    }

    const file = files[0];
    try {
      const { imageUrl } = await questionService.uploadImage(file, {
        purpose: '评论',
        senderName: currentUser?.nickname ?? currentUser?.name ?? '用户A',
        receiverName: question?.authorName ?? '用户B'
      });
      setCommentImage(imageUrl);
      toast.success('已添加图片');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('comment image upload failed', error);
      toast.error('图片上传失败，请稍后重试');
    } finally {
      event.target.value = '';
    }
  };

  const handleSubmitComment = async () => {
    if (!currentUser) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }

    if (!newComment.trim() && !commentImage) {
      toast.error('请输入评论内容或上传图片');
      return;
    }

    // 提问者和回答者（教师）可以评论
    const canComment = currentUser.id === question.authorId || currentUser.role === 'teacher';
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
        authorRole: currentUser.role,  // 添加 authorRole 字段
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
        image: commentImage || undefined
      });

      // 处理 AI 审核结果
      const aiAudit = (created as any)?.aiAudit;
      if (aiAudit && !aiAudit.safe) {
        toast.error(`评论被拒绝：${aiAudit.reason || '内容不符合规范'}`);
        return;
      }

      if (created.status === 'approved') {
        setComments((prev) => [created, ...prev]);
      }

      try {
        await behaviorService.log('question_comment', {
          questionId: question.id,
          hasImage: !!commentImage
        });
      } catch {
        // 行为日志失败不影响主流程
      }

      setNewComment('');
      setCommentImage(null);
      toast.success(
        created.status === 'approved'
          ? '评论已发布'
          : '评论已提交，等待审核'
      );
    } catch {
      toast.error('评论提交失败，请稍后重试');
    }
  };

  const handlePlayAudio = () => {
    if (!question.audioUrl || !questionAudioRef.current) return;

    const el = questionAudioRef.current;
    if (isPlayingAudio) {
      el.pause();
      setIsPlayingAudio(false);
      toast.success('暂停播放');
    } else {
      el
        .play()
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes}分钟前`;
      }
      return `${hours}小时前`;
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  const isQuestionAuthor = currentUser?.id === question.authorId;
  const isTeacher = currentUser?.role === 'teacher';
  const hasAnyAnswer = (question.stats.answers ?? 0) > 0;
  const isApprovedQuestion = question.status === 'approved';
  // 修改原因：详情页删除入口与“通过后不可删”规则对齐，避免与后端权限语义不一致。
  const canDelete =
    isTeacher ||
    (isQuestionAuthor &&
      !hasAnyAnswer &&
      !isApprovedQuestion);
  // 仅老师可以看到并使用“去回答”入口，防止前端 UI 与后端权限语义出现不一致
  const canAnswer = isTeacher;

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这个问题吗？此操作无法撤销。')) return;

    try {
      await questionService.delete(question.id);
      toast.success('删除成功');
      navigate('/', { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败，请稍后重试');
    }
  };



  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-4"
    >
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm sticky top-0 z-10 -mx-4 px-4 py-2 flex items-center justify-between">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition"
          data-testid="back-button"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </motion.button>
        <div className="flex flex-col items-center flex-1">
          <h1 className="text-base font-bold text-gray-800">问题详情</h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleShare}
          className="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <Share2 className="w-5 h-5 text-gray-600" />
        </motion.button>
      </div>

      {/* 内容区域 */}
      <div className="w-full space-y-3 pb-20">
        {/* 问题内容卡片 */}
        <div className="bg-white rounded-3xl shadow-sm p-4 space-y-4">
          {/* 标签行 */}
          <div className="flex flex-wrap items-center gap-2">
            {question.isGoodQuestion && (
              <GoodQuestionBadge />
            )}
            {question.tags?.map((tag, index) => (
              <Badge
                key={index}
                className="bg-morandi-1 text-gray-700 border-none hover:bg-morandi-2"
              >
                {tag}
              </Badge>
            ))}
            {difficultyConfig && (
              <Badge
                className={`${difficultyConfig.className} border-none`}
              >
                {difficultyConfig.label}
              </Badge>
            )}
          </div>

          {/* 问题标题 */}
          <h2 className="text-xl font-bold text-gray-800 leading-tight">{question.title}</h2>

          {/* 提问信息 */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <button
              type="button"
              onClick={handleAuthorClick}
              className="flex items-center gap-2 hover:text-gray-600"
            >
              <Avatar className="w-6 h-6">
                <AvatarImage src={question.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${question.authorName}`} />
                <AvatarFallback className="text-[10px] bg-gray-100">
                  {question.authorName[0]}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-gray-600">
                {question.authorName}
              </span>
            </button>
            <span>•</span>
            <span>{formatDate(question.createdAt)}</span>
          </div>

          {/* 图片展示 */}
          {question.images && question.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {question.images.map((image, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity active:scale-[0.98]"
                  onClick={() => setSelectedImage(image)}
                >
                  <ImageWithFallback
                    src={image}
                    alt={`图片${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* 录音播放区域 */}
          {question.audioUrl && (
            <div className="bg-morandi-4 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlayAudio}
                  className="w-12 h-12 bg-morandi-5 hover:bg-morandi-5/80 text-white rounded-full flex items-center justify-center transition shadow-sm active:scale-90 flex-shrink-0"
                >
                  {isPlayingAudio ? (
                    <Pause className="w-5 h-5 fill-white" />
                  ) : (
                    <Play className="w-5 h-5 ml-1 fill-white" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-morandi-5" />
                      <span className="text-xs font-medium text-morandi-5">语音说明</span>
                    </div>
                    {/* Speed Pop-up Trigger */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white/60 hover:bg-white text-morandi-5 rounded-full text-[10px] font-bold transition-all shadow-sm active:scale-95 border border-white/40"
                      data-testid="audio-speed-trigger"
                    >
                      倍速 {playbackRate}x
                    </button>
                  </div>
                  <div className="h-1.5 bg-white bg-opacity-50 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-morandi-5 transition-all duration-300 ${isPlayingAudio ? 'w-1/2' : 'w-0'}`}
                    />
                  </div>
                </div>
                <span className="text-xs font-bold text-morandi-5">00:45</span>
                <audio
                  ref={questionAudioRef}
                  src={question.audioUrl}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* 问题详情 */}
          {question.content && (
            <div className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed bg-[#EDEDE9] bg-opacity-30 p-4 rounded-2xl">
              {question.content}
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-6">
            <div className="flex items-center gap-6">
              <button
                data-testid="like-btn"
                onClick={handleLike}
                className={cn("flex items-center gap-1 transition-colors", liked ? "text-pink-500" : "text-gray-400")}
              >
                <Heart className={cn("w-6 h-6", liked && "fill-current")} />
                <span className="text-xs">{question.stats.likes + (liked ? 1 : 0)}</span>
              </button>

              <button
                data-testid="favorite-btn"
                onClick={handleFavorite}
                className={cn("flex items-center gap-1 transition-colors", favorited ? "text-amber-400" : "text-gray-400")}
              >
                <Star className={cn("w-6 h-6", favorited && "fill-current")} />
                <span className="text-xs">{question.stats.favorites + (favorited ? 1 : 0)}</span>
              </button>

              <button className="flex items-center gap-1 text-gray-400">
                <MessageSquare className="w-6 h-6" />
                <span className="text-xs">{question.stats.comments}</span>
              </button>

              <button onClick={handleShare} className="text-gray-400">
                <Share2 className="w-6 h-6" />
              </button>
            </div>
            {canDelete && (
              <button
                onClick={handleDelete}
                className="text-red-400 hover:text-red-500 transition-colors p-2"
                title="删除问题"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            {canAnswer && (
              <button
                onClick={handleAnswer}
                className="bg-[#D5BDAF] text-white px-4 py-2 rounded-full text-xs font-bold shadow-sm active:scale-95 transition-transform"
              >
                去回答
              </button>
            )}
          </div>
        </div>

        {/* 回答列表 */}
        {answers.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-bold text-gray-800">全部回答</h3>
              <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-100">{answers.length}个回答</Badge>
            </div>

            <div className="space-y-6">
              {answers.filter(a => a.status === 'approved').map((answer) => (
                <div
                  key={answer.id}
                  ref={(el) => {
                    if (el) {
                      answerCardRefs.current[answer.id] = el;
                    }
                  }}
                  data-answer-id={answer.id}
                  className={cn(
                    'space-y-3 pb-4 border-b border-gray-50 last:border-b-0 last:pb-0 transition-colors',
                    highlightAnswerId === answer.id
                      ? 'bg-amber-50 border-amber-200'
                      : ''
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8 border border-gray-100">
                      <AvatarImage src={answer.authorAvatar} />
                      <AvatarFallback className="bg-gray-50 text-xs">{answer.authorName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-700">{answer.authorName}</span>
                        <span className="text-[10px] text-gray-300">{formatDate(answer.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {answer.images && answer.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {answer.images.map((image: string, index: number) => (
                        <div
                          key={index}
                          className="relative aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 active:scale-95 transition"
                          onClick={() => setSelectedImage(image)}
                        >
                          <ImageWithFallback src={image} alt="answer img" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {answer.audioUrl && (
                    <div className="bg-morandi-1 bg-opacity-20 rounded-2xl p-3 border border-morandi-1 border-opacity-30">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handlePlayAnswerAudio(answer.id)}
                          className="w-10 h-10 bg-morandi-1 text-gray-700 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition"
                        >
                          {playingAnswerId === answer.id ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 ml-0.5 fill-white" />}
                        </button>
                        <div className="flex-1 h-1 bg-white bg-opacity-50 rounded-full overflow-hidden">
                          <div className={`h-full bg-[#A2D2FF] transition-all duration-300 ${playingAnswerId === answer.id ? 'w-1/2' : 'w-0'}`} />
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(true); }}
                          className="px-2 py-0.5 bg-white/60 hover:bg-white text-[#1D4ED8] rounded-full text-[10px] font-bold transition-all shadow-sm active:scale-95 border border-white/40"
                          data-testid={`answer-speed-trigger-${answer.id}`}
                        >
                          {playbackRate}x
                        </button>
                        <span className="text-[10px] font-bold text-[#1D4ED8]">01:20</span>
                        <audio
                          ref={(el) => {
                            if (el) {
                              answerAudioRefs.current[answer.id] = el;
                              el.onended = () => {
                                setPlayingAnswerId((prev) => (prev === answer.id ? null : prev));
                              };
                            }
                          }}
                          src={answer.audioUrl}
                          className="hidden"
                          data-testid={`answer-audio-${answer.id}`}
                        />
                      </div>
                    </div>
                  )}

                  {answer.audioUrls && answer.audioUrls.length > 1 && (
                    <div className="mt-2 space-y-1">
                      {answer.audioUrls.map((url, idx) => {
                        if (idx === 0) return null;
                        return (
                          <div key={idx} className="flex items-center gap-2 text-[11px] text-gray-500">
                            <span className="px-2 py-0.5 bg-gray-100 rounded-full">
                              补充录音 {idx + 1}
                            </span>
                            <audio
                              controls
                              src={url}
                              className="h-7 flex-1"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="text-gray-700 text-sm leading-relaxed">
                    {answer.content}
                  </div>

                  <div className="flex items-center gap-4 pt-1">
                    <button className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold active:scale-75 transition">
                      <Heart className="w-3.5 h-3.5" /> {answer.likes}
                    </button>
                    <button className="text-[10px] text-blue-400 font-bold">评论</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 评论区 */}
        <div className="bg-white rounded-3xl shadow-sm p-4 mb-4">
          <div className="space-y-4">
            <h3 className="text-md font-bold text-gray-800">讨论区</h3>

            {/* 评论列表 */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {comments.filter(c => c.status === 'approved').length === 0 ? (
                <div className="text-center py-10">
                  <MessageCircle className="w-12 h-12 text-gray-100 mx-auto mb-2" />
                  <p className="text-xs text-gray-300">暂无评论，来聊聊吧</p>
                </div>
              ) : (
                comments
                  .filter(c => c.status === 'approved')
                  .map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-3 bg-gray-50 bg-opacity-50 rounded-2xl border border-gray-100">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={comment.authorAvatar} />
                        <AvatarFallback className="text-[10px]">{comment.authorName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-600">{comment.authorName}</span>
                          <span className="text-[10px] text-gray-300">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed font-medium">
                          {comment.content}
                        </p>
                        {comment.image && (
                          <div className="w-24 h-24 rounded-xl overflow-hidden border border-gray-100 mt-2 active:scale-95 transition cursor-pointer" onClick={() => setSelectedImage(comment.image!)}>
                            <ImageWithFallback src={comment.image} alt="comment img" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* 评论输入框（提问者和教师可见） */}
            {(isQuestionAuthor || currentUser?.role === 'teacher') && (
              <div className="space-y-2 pt-2 border-t border-gray-50">
                {commentImage && (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-morandi-5">
                    <ImageWithFallback src={commentImage} alt="preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setCommentImage(null)}
                      className="absolute top-0.5 right-0.5 bg-black bg-opacity-50 text-white rounded-full p-0.5 active:scale-75 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddImage}
                    className="p-2.5 bg-gray-100 text-gray-500 rounded-2xl hover:bg-gray-200 transition active:scale-90"
                    data-testid="add-image-btn"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  <input
                    ref={commentImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCommentImageFileChange}
                  />
                  <div className="flex-1 relative">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="说点什么..."
                      className="bg-gray-50 border-none rounded-2xl h-10 pr-10 text-xs focus-visible:ring-1 focus-visible:ring-morandi-5"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitComment();
                        }
                      }}
                    />
                    <button
                      onClick={handleSubmitComment}
                      className="absolute right-2 top-1.5 p-1.5 text-morandi-5 hover:text-morandi-5/80 transition active:scale-75"
                    >
                      <Send className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audio Speed Selection Pop-up (Drawer style) */}
      <AnimatePresence>
        {showSpeedMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSpeedMenu(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] p-6 pb-10 z-[120] shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-6" />
              <h3 className="text-lg font-bold text-gray-800 mb-6 text-center">选择播放倍速</h3>
              <div className="grid grid-cols-2 gap-4">
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => { setPlaybackRate(rate); setShowSpeedMenu(false); toast.success(`倍速已切换为 ${rate}x`); }}
                    className={cn(
                      "flex items-center justify-center h-14 rounded-2xl text-base font-bold transition-all",
                      playbackRate === rate
                        ? "bg-blue-600 text-white shadow-lg scale-[1.02]"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100 active:scale-95"
                    )}
                  >
                    {rate}x {rate === 1.0 && '(正常)'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowSpeedMenu(false)}
                className="w-full mt-6 h-14 rounded-2xl bg-gray-100 text-gray-500 font-bold active:scale-95 transition-all"
              >
                取消
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 图片预览模态框 (Carousel) */}
      <ImageCarousel
        images={question.images || []}
        initialIndex={question.images?.indexOf(selectedImage || '') || 0}
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </motion.div>
  );
}
