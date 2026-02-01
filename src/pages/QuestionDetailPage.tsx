import { useState } from 'react';
import { ArrowLeft, Share2, Heart, Star, MessageCircle, Send, Play, Pause, Volume2, Camera, X } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';
import { mockQuestions, mockComments, mockAnswers, userLikes, userFavorites } from '@/lib/mock-data';
import type { Comment, DifficultyLevel } from '@/types';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';

export function QuestionDetailPage() {
  const { id: questionId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const question = mockQuestions.find((q) => q.id === questionId);
  // Safe fallbacks if questionId is undefined
  const safeQuestionId = questionId || '';
  const answers = mockAnswers[safeQuestionId] || [];
  const [comments, setComments] = useState<Comment[]>(mockComments[safeQuestionId] || []);
  const [newComment, setNewComment] = useState('');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [liked, setLiked] = useState(userLikes.has(safeQuestionId));
  const [favorited, setFavorited] = useState(userFavorites.has(safeQuestionId));
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [playingAnswerId, setPlayingAnswerId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!question) {
    return (
      <div className="min-h-screen bg-[#EDEDE9] flex items-center justify-center flex-col gap-4">
        <p className="text-gray-500">问题不存在</p>
        <button onClick={() => navigate('/')} className="text-blue-500 underline">返回首页</button>
      </div>
    );
  }

  const getDifficultyConfig = (difficulty?: DifficultyLevel) => {
    const configs = {
      easy: { label: '简单', className: 'bg-[#BDE0FE] text-blue-700' },
      medium: { label: '中等', className: 'bg-[#FFC8DD] text-pink-700' },
      hard: { label: '难题', className: 'bg-[#FFAFCC] text-red-700' },
    };
    return difficulty ? configs[difficulty] : null;
  };

  const difficultyConfig = getDifficultyConfig(question.difficulty);

  const handleLike = () => {
    setLiked(!liked);
    toast.success(liked ? '已取消点赞' : '点赞成功');
  };

  const handleFavorite = () => {
    setFavorited(!favorited);
    toast.success(favorited ? '已取消收藏' : '收藏成功');
  };

  const handleShare = () => {
    toast.success('分享链接已复制');
  };

  const handleAnswer = () => {
    if (currentUser?.role === 'teacher') {
      // Future: Navigate to answer page
      toast.info('Answer page implementation pending');
    } else {
      toast.error('暂无回答权限');
    }
  };

  const handleAddImage = () => {
    // 模拟选择图片
    const mockImages = [
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1454165833767-027508492021?w=400&h=300&fit=crop'
    ];
    const randomImg = mockImages[Math.floor(Math.random() * mockImages.length)];
    setCommentImage(randomImg);
    toast.success('已添加图片');
  };

  const handleSubmitComment = () => {
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

    const comment: Comment = {
      id: `c${Date.now()}`,
      questionId: question.id,
      questionTitle: question.title,
      content: newComment,
      image: commentImage || undefined,
      authorId: currentUser.id,
      authorName: currentUser.nickname,
      authorAvatar: currentUser.avatar,
      status: 'pending',
      aiResult: '无违规',
      createdAt: new Date().toISOString(),
    };

    setComments([...comments, comment]);
    setNewComment('');
    setCommentImage(null);
    toast.success('评论已提交，等待审核');
  };

  const handlePlayAudio = () => {
    setIsPlayingAudio(!isPlayingAudio);
    toast.success(isPlayingAudio ? '暂停播放' : '开始播放');
  };

  const handlePlayAnswerAudio = (answerId: string) => {
    if (playingAnswerId === answerId) {
      setPlayingAnswerId(null);
      toast.success('暂停播放');
    } else {
      setPlayingAnswerId(answerId);
      toast.success('开始播放');
    }
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

  return (
    <div className="flex flex-col gap-4">
      {/* 顶部导航栏 - Now handled by MainLayout if needed, but for detail page back button is nice */}
      {/* Since MainLayout has a header, having another header might be redundant but Detail page usually has Back button. */}
      {/* We can hide MainLayout header for detail pages or just keep the back button style inside content */}

      <div className="bg-white shadow-sm sticky top-0 z-10 -mx-4 px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition active:scale-90"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex flex-col items-center flex-1">
          <h1 className="text-base font-bold text-gray-800">问题详情</h1>
        </div>
        <button
          onClick={handleShare}
          className="p-2 hover:bg-gray-100 rounded-full transition active:scale-90"
        >
          <Share2 className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* 内容区域 */}
      <div className="w-full space-y-3 pb-20">
        {/* 问题内容卡片 */}
        <div className="bg-white rounded-3xl shadow-sm p-4 space-y-4">
          {/* 标签行 */}
          <div className="flex flex-wrap items-center gap-2">
            {question.isGoodQuestion && (
              <Badge className="bg-[#FFAFCC] text-white border-none">好问题</Badge>
            )}
            {question.tags?.map((tag, index) => (
              <Badge
                key={index}
                className="bg-[#BDE0FE] text-gray-700 border-none hover:bg-[#A2D2FF]"
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
            <Avatar className="w-6 h-6">
              <AvatarImage src={question.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${question.authorName}`} />
              <AvatarFallback className="text-[10px] bg-gray-100">{question.authorName[0]}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-gray-600">{question.authorName}</span>
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
            <div className="bg-[#F5EBE0] rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlayAudio}
                  className="w-12 h-12 bg-[#D5BDAF] hover:bg-[#B59D8F] text-white rounded-full flex items-center justify-center transition shadow-sm active:scale-90 flex-shrink-0"
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
                      <Volume2 className="w-4 h-4 text-[#8C786E]" />
                      <span className="text-xs font-medium text-[#8C786E]">语音说明</span>
                    </div>
                    {/* Speed Control */}
                    <div className="flex gap-1">
                      {[1.0, 1.5, 2.0].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => setPlaybackRate(rate)}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded transition-colors",
                            playbackRate === rate
                              ? "bg-[#8C786E] text-white font-bold"
                              : "text-[#8C786E] hover:bg-[#8C786E]/10"
                          )}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-1.5 bg-white bg-opacity-50 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-[#D5BDAF] transition-all duration-300 ${isPlayingAudio ? 'w-1/2' : 'w-0'}`}
                    />
                  </div>
                </div>
                <span className="text-xs font-bold text-[#8C786E]">00:45</span>
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
            <div className="flex gap-6">
              <button
                onClick={handleLike}
                className="flex items-center gap-1.5 text-gray-500 hover:text-red-500 transition-colors group"
              >
                <Heart className={cn("w-5 h-5 transition-transform group-active:scale-125", isLiked ? "fill-red-500 text-red-500" : "")} />
                <span className={cn("text-sm", isLiked ? "text-red-500 font-medium" : "")}>
                  {question.stats.likes + (isLiked ? 1 : 0)}
                </span>
              </button>
              <button
                onClick={handleFavorite}
                className="flex items-center gap-1.5 text-gray-500 hover:text-yellow-500 transition-colors group"
              >
                <Star className={cn("w-5 h-5 transition-transform group-active:scale-125", isFavorited ? "fill-yellow-500 text-yellow-500" : "")} />
                <span className={cn("text-sm", isFavorited ? "text-yellow-500 font-medium" : "")}>
                  {question.stats.favorites + (isFavorited ? 1 : 0)}
                </span>
              </button>
              <button className="flex items-center gap-1.5 text-gray-500 hover:text-indigo-500 transition-colors">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm">{question.stats.comments}</span>
              </button>
            </div>

            {currentUser?.role === 'teacher' && (
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
                <div key={answer.id} className="space-y-3 pb-4 border-b border-gray-50 last:border-b-0 last:pb-0">
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
                    <div className="bg-[#BDE0FE] bg-opacity-20 rounded-2xl p-3 border border-[#BDE0FE] border-opacity-30">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handlePlayAnswerAudio(answer.id)}
                          className="w-10 h-10 bg-[#A2D2FF] text-white rounded-full flex items-center justify-center shadow-sm active:scale-90 transition"
                        >
                          {playingAnswerId === answer.id ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 ml-0.5 fill-white" />}
                        </button>
                        <div className="flex-1 h-1 bg-white bg-opacity-50 rounded-full overflow-hidden">
                          <div className={`h-full bg-[#A2D2FF] transition-all duration-300 ${playingAnswerId === answer.id ? 'w-1/2' : 'w-0'}`} />
                        </div>
                        <span className="text-[10px] font-bold text-[#1D4ED8]">01:20</span>
                      </div>
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
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#D5BDAF]">
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
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  <div className="flex-1 relative">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="说点什么..."
                      className="bg-gray-50 border-none rounded-2xl h-10 pr-10 text-xs focus-visible:ring-1 focus-visible:ring-[#D5BDAF]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitComment();
                        }
                      }}
                    />
                    <button
                      onClick={handleSubmitComment}
                      className="absolute right-2 top-1.5 p-1.5 text-[#D5BDAF] hover:text-[#B59D8F] transition active:scale-75"
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

      {/* 图片预览模态框 */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="预览"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
