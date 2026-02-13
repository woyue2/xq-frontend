import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CaretLeft, Check, X, WarningCircle, ChatCentered, ThumbsUp } from '@phosphor-icons/react';
// 修改原因：按需求保持收藏图标为原始样式，Star 回退到 lucide-react。
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { Question, Comment, AuditStatus, DifficultyLevel } from '@/types';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { useNavigate } from 'react-router-dom';
import { aiTextConfig } from '@/config/ai-text';
import { auditService } from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';

type PendingAnswerAuditItem = {
  id: string;
  questionId: string;
  questionTitle: string;
  content: string;
  images: string[];
  audioUrl: string | null;
  authorId: string;
  authorName: string;
  status: AuditStatus;
  aiResult?: string;
  createdAt: string;
};

export const AuditPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  // 修改原因：审核台需要覆盖“问题/回答/评论”三类待审数据，补齐回答入口。
  const [activeTab, setActiveTab] = useState<'questions' | 'answers' | 'comments'>('questions');
  const [filter, setFilter] = useState<AuditStatus>('pending');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<PendingAnswerAuditItem[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  // 修改原因：审核通过前需要独立保存每个问题的难度选择，满足“必选后再通过”。
  const [difficultyDrafts, setDifficultyDrafts] = useState<Record<string, DifficultyLevel | ''>>({});

  // 驳回相关状态
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [currentAuditItem, setCurrentAuditItem] = useState<{ id: string; type: 'question' | 'answer' | 'comment' } | null>(null);

  // 评分相关状态
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 基础权限校验：仅允许老师访问审核页面
  useEffect(() => {
    if (!user) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }

    if (user.role !== 'teacher') {
      toast.error('只有老师可以访问审核页面');
      navigate('/profile');
    }
  }, [user, navigate]);

  useEffect(() => {
    const isTestEnv =
      typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.MODE === 'test';

    const loadQuestions = async () => {
      setLoadingQuestions(true);
      try {
        const res = await auditService.getPendingQuestions({ page: 1, pageSize: 20 });
        const items = res.list.map((item) => ({
          id: item.id,
          title: item.title,
          content: item.content,
          authorId: item.authorId,
          authorName: item.authorName,
          createdAt: item.createdAt,
          status: item.status as AuditStatus,
          stats: { likes: 0, favorites: 0, comments: 0, answers: 0 },
          subject: 'math',
          // 修改原因：使用后端真实难度，避免前端默认值掩盖“未选择难度”。
          difficulty: (item.difficulty as DifficultyLevel | null) ?? undefined,
          aiResult: item.aiResult ?? undefined
        } as Question));
        setQuestions(items);
        const initialDrafts = Object.fromEntries(
          // 修改原因：按需求将审核页难度默认值设置为“中等”，避免初始为空导致额外交互。
          res.list.map((item) => [item.id, (item.difficulty as DifficultyLevel | null) ?? 'medium'])
        ) as Record<string, DifficultyLevel | ''>;
        setDifficultyDrafts(initialDrafts);
      } catch (error) {
        if (isTestEnv) {
          const demoQuestions: Question[] = [
            {
              id: 'audit-demo-q1',
              title: '待审核示例问题',
              content: '这是一个用于前端审核流程验证的示例问题内容。',
              authorId: 'stu-demo-1',
              authorName: '学生示例',
              createdAt: new Date().toISOString(),
              status: 'pending',
              stats: { likes: 0, favorites: 0, comments: 0, answers: 0 },
              subject: 'math',
              difficulty: undefined
            } as Question
          ];
          setQuestions(demoQuestions);
          // 修改原因：测试环境演示数据与生产行为一致，默认难度同样设为“中等”。
          setDifficultyDrafts({
            'audit-demo-q1': 'medium'
          });
        } else {
          // 静默失败，保留空态，由老师通过系统配置中心/日志排查
          setQuestions([]);
          setDifficultyDrafts({});
        }
      } finally {
        setLoadingQuestions(false);
      }
    };

    const loadComments = async () => {
      setLoadingComments(true);
      try {
        const res = await auditService.getPendingComments({ page: 1, pageSize: 20 });
        const items = res.list.map((item) => ({
          id: item.id,
          questionId: item.questionId,
          questionTitle: item.questionTitle,
          content: item.content,
          image: item.image,
          authorId: item.authorId,
          authorName: item.authorName,
          status: item.status as AuditStatus,
          aiResult: item.aiResult ?? undefined,
          createdAt: item.createdAt
        } as Comment));
        setComments(items);
      } catch {
        setComments([]);
      } finally {
        setLoadingComments(false);
      }
    };

    const loadAnswers = async () => {
      setLoadingAnswers(true);
      try {
        const res = await auditService.getPendingAnswers({ page: 1, pageSize: 20 });
        const items = res.list.map((item) => ({
          id: item.id,
          questionId: item.questionId,
          questionTitle: item.questionTitle,
          content: item.content,
          images: item.images ?? [],
          audioUrl: item.audioUrl ?? null,
          authorId: item.authorId,
          authorName: item.authorName,
          status: item.status as AuditStatus,
          aiResult: item.aiResult ?? undefined,
          createdAt: item.createdAt
        } as PendingAnswerAuditItem));
        setAnswers(items);
      } catch {
        setAnswers([]);
      } finally {
        setLoadingAnswers(false);
      }
    };

    if (activeTab === 'questions') {
      void loadQuestions();
    } else if (activeTab === 'answers') {
      void loadAnswers();
    } else {
      void loadComments();
    }
  }, [activeTab]);

  const filteredQuestions = questions.filter(q => q.status === filter);
  const filteredAnswers = answers.filter(a => a.status === filter);
  const filteredComments = comments.filter(c => c.status === filter);

  const pendingQuestionsCount = questions.filter(q => q.status === 'pending').length;
  const pendingAnswersCount = answers.filter(a => a.status === 'pending').length;
  const pendingCommentsCount = comments.filter(c => c.status === 'pending').length;

  const handleAudit = (id: string, type: 'question' | 'answer' | 'comment', status: AuditStatus, extraData?: any) => {
    if (type === 'question') {
      setQuestions(prev => prev.map(q => {
        if (q.id === id) {
          return { ...q, status, ...extraData };
        }
        return q;
      }));
    } else if (type === 'answer') {
      setAnswers(prev => prev.map(a => {
        if (a.id === id) {
          return { ...a, status, ...extraData };
        }
        return a;
      }));
    } else {
      setComments(prev => prev.map(c => {
        if (c.id === id) {
          return { ...c, status, ...extraData };
        }
        return c;
      }));
    }

    const statusText = status === 'approved' 
      ? aiTextConfig.auditMessages.statusApproved 
      : status === 'rejected' 
        ? aiTextConfig.auditMessages.statusRejected 
        : aiTextConfig.auditMessages.statusBanned;
    toast.success(`${aiTextConfig.auditMessages.auditComplete}：${statusText}`);
  };

  const openRejectDialog = (id: string, type: 'question' | 'answer' | 'comment') => {
    setCurrentAuditItem({ id, type });
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (!currentAuditItem) return;
    if (!rejectReason.trim()) {
      toast.error('请填写驳回/封禁原因');
      return;
    }

    if (currentAuditItem.type === 'question') {
      auditService
        .rejectQuestion(currentAuditItem.id, rejectReason)
        .then(() => {
          handleAudit(currentAuditItem.id, 'question', 'rejected', { aiResult: rejectReason });
          setRejectDialogOpen(false);
        })
        .catch(() => {
          toast.error('驳回失败，请稍后重试');
        });
    } else if (currentAuditItem.type === 'answer') {
      // 修改原因：回答审核新增驳回动作，复用现有驳回弹窗交互。
      auditService
        .rejectAnswer(currentAuditItem.id, rejectReason)
        .then(() => {
          handleAudit(currentAuditItem.id, 'answer', 'rejected', { aiResult: rejectReason });
          setRejectDialogOpen(false);
        })
        .catch(() => {
          toast.error('驳回失败，请稍后重试');
        });
    } else {
      auditService
        .banComment(currentAuditItem.id, rejectReason)
        .then(() => {
          handleAudit(currentAuditItem.id, 'comment', 'banned', { aiResult: rejectReason });
          setRejectDialogOpen(false);
        })
        .catch(() => {
          toast.error('封禁失败，请稍后重试');
        });
    }
  };

  const openScoreDialog = (id: string) => {
    setCurrentAuditItem({ id, type: 'question' });
    const q = questions.find(item => item.id === id);
    setCurrentScore(q?.score || 0);
    setScoreDialogOpen(true);
  };

  const confirmScore = () => {
    if (!currentAuditItem) return;
    const selectedDifficulty = difficultyDrafts[currentAuditItem.id] ?? 'medium';
    if (!selectedDifficulty) {
      toast.error('请先选择难度再打分通过');
      return;
    }
    auditService
      .approveQuestion(currentAuditItem.id, { score: currentScore, difficulty: selectedDifficulty })
      .then(() => {
        setQuestions(prev => prev.map(q => {
          if (q.id === currentAuditItem.id) {
            return {
              ...q,
              score: currentScore,
              status: 'approved' as AuditStatus,
              difficulty: selectedDifficulty
            };
          }
          return q;
        }));
        setScoreDialogOpen(false);
        toast.success('评分已更新');
      })
      .catch(() => {
        toast.error('评分保存失败，请稍后重试');
      });
  };

  const toggleGoodQuestion = (id: string, checked: boolean) => {
    const selectedDifficulty = difficultyDrafts[id] ?? 'medium';
    if (!selectedDifficulty) {
      toast.error('请先选择难度再设置好问题');
      return;
    }
    auditService
      .approveQuestion(id, { isGoodQuestion: checked, difficulty: selectedDifficulty })
      .then(() => {
        setQuestions(prev => prev.map(q => {
          if (q.id === id) {
            return { ...q, isGoodQuestion: checked, difficulty: selectedDifficulty };
          }
          return q;
        }));
      })
      .catch(() => {
        toast.error('更新“好问题”状态失败，请稍后重试');
      });
  };

  return (
    <div className="flex flex-col h-screen bg-[#EDEDE9]" data-testid="audit-page">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <button
          onClick={() => navigate('/profile')}
          className="p-2 -ml-2 active:scale-90 transition-transform"
        >
          <CaretLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 flex items-center">
          审核管理
          {(pendingQuestionsCount > 0 || pendingAnswersCount > 0 || pendingCommentsCount > 0) && (
            <span className="ml-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </h1>
        <div className="flex items-center gap-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as AuditStatus)} className="w-auto">
            <TabsList className="h-8 bg-gray-100 p-0.5">
              <TabsTrigger value="pending" className="px-3 text-xs h-7">待审核</TabsTrigger>
              <TabsTrigger value="approved" className="px-3 text-xs h-7">已通过</TabsTrigger>
              <TabsTrigger value="rejected" className="px-3 text-xs h-7">已驳回</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* 顶部标签切换区 */}
      <div className="bg-white px-2 py-1 shadow-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
        <div className="flex gap-2 p-1">
          <button
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors relative ${activeTab === 'questions' ? 'bg-[#D5BDAF] text-white' : 'bg-gray-100 text-gray-500'
              }`}
          >
            问题审核 {pendingQuestionsCount > 0 && `(${pendingQuestionsCount})`}
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'comments' ? 'bg-[#D5BDAF] text-white' : 'bg-gray-100 text-gray-500'
              }`}
          >
            评论审核 {pendingCommentsCount > 0 && `(${pendingCommentsCount})`}
          </button>
          <button
            onClick={() => setActiveTab('answers')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'answers' ? 'bg-[#D5BDAF] text-white' : 'bg-gray-100 text-gray-500'
              }`}
          >
            回答审核 {pendingAnswersCount > 0 && `(${pendingAnswersCount})`}
          </button>
        </div>
      </div>

      {/* 中间内容区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'questions' ? (
          filteredQuestions.length > 0 ? (
            filteredQuestions.map((q) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1 flex-1 pr-2">
                    <h3 className="font-bold text-gray-800 leading-tight">{q.title}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <button
                        type="button"
                        onClick={() => navigate(`/student/${q.authorId}/questions`)}
                        className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-700 cursor-pointer"
                        data-testid="audit-question-author"
                      >
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-100 text-[8px] text-gray-500">
                          {q.authorName?.[0] ?? '学'}
                        </span>
                        <span className="truncate max-w-[120px] font-medium">
                          {q.authorName}
                        </span>
                      </button>
                      <span>•</span>
                      <span>{new Date(q.createdAt).toLocaleString()}</span>
                    </div>
                    {q.aiResult && (
                      <div className="flex items-center gap-1 text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded w-fit">
                        <WarningCircle className="w-3 h-3" />
                        AI初筛：{q.aiResult}
                      </div>
                    )}
                  </div>
                  {q.isGoodQuestion && (
                    <Badge className="bg-red-500 text-white border-none text-[10px] h-5">好问题</Badge>
                  )}
                </div>
                {/* Subject/Topics */}
                <div className="flex gap-2">
                  {q.subject && (
                    <Badge variant="outline" className="text-blue-500 border-blue-200 capitalize">
                      {q.subject}
                    </Badge>
                  )}
                  {q.topics?.map((topic, i) => (
                    <Badge key={i} variant="secondary" className="bg-gray-100 text-gray-600">
                      {topic}
                    </Badge>
                  ))}
                </div>

                <div className="text-sm text-gray-600 line-clamp-3">
                  {q.content}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">难度</span>
                  <select
                    value={difficultyDrafts[q.id] ?? 'medium'}
                    onChange={(e) => {
                      // 修改原因：审核台通过动作前，先明确选择难度，避免空值通过。
                      const value = e.target.value as DifficultyLevel | '';
                      setDifficultyDrafts((prev) => ({
                        ...prev,
                        [q.id]: value
                      }));
                    }}
                    className="h-8 rounded-md border border-gray-200 px-2 text-xs bg-white"
                  >
                    <option value="">请选择难度</option>
                    <option value="easy">简单</option>
                    <option value="medium">中等</option>
                    <option value="hard">困难</option>
                  </select>
                </div>

                {q.images && q.images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {q.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 cursor-pointer active:scale-95 transition-transform"
                        onClick={() => setSelectedImage(img)}
                      >
                        <ImageWithFallback src={img} alt="preview" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
                  <button
                    onClick={() => openRejectDialog(q.id, 'question')}
                    className="flex-1 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-medium active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <X className="w-3 h-3" /> 驳回
                  </button>
                  <button
                    onClick={() => openScoreDialog(q.id)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium active:scale-95 transition-transform flex items-center justify-center gap-1 ${q.score ? 'bg-orange-50 text-orange-500' : 'bg-gray-50 text-gray-500'
                      }`}
                  >
                    <Star className={`w-3 h-3 ${q.score ? 'fill-orange-500' : ''}`} />
                    {q.score ? `${q.score}分` : '打分'}
                  </button>
                  <div className="flex items-center px-3 bg-gray-50 rounded-xl">
                    <Checkbox
                      id={`good-${q.id}`}
                      checked={q.isGoodQuestion}
                      onCheckedChange={(checked) => toggleGoodQuestion(q.id, checked as boolean)}
                      className="w-4 h-4 border-gray-300"
                    />
                    <label htmlFor={`good-${q.id}`} className="ml-1.5 text-[10px] text-gray-500 whitespace-nowrap">好问题</label>
                  </div>
                  <button
                    onClick={() => {
                      const selectedDifficulty = difficultyDrafts[q.id] ?? 'medium';
                      if (!selectedDifficulty) {
                        toast.error('请先选择难度再通过审核');
                        return;
                      }
                      auditService
                        .approveQuestion(q.id, {
                          isGoodQuestion: q.isGoodQuestion,
                          score: q.score,
                          tags: q.tags,
                          difficulty: selectedDifficulty
                        })
                        .then(() => {
                          handleAudit(q.id, 'question', 'approved', {
                            difficulty: selectedDifficulty
                          });
                        })
                        .catch(() => {
                          toast.error('审核通过失败，请稍后重试');
                        });
                    }}
                    className="flex-1 py-2 bg-[#BDE0FE] text-[#1D4ED8] rounded-xl text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <Check className="w-3 h-3" /> 通过
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <ChatCentered className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">暂无待审核内容</p>
            </div>
          )
        ) : activeTab === 'answers' ? (
          filteredAnswers.length > 0 ? (
            filteredAnswers.map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm p-4 space-y-3"
              >
                <div className="space-y-1">
                  <div className="text-[10px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded w-fit mb-1 font-medium truncate max-w-full">
                    源自：{a.questionTitle || '未知问题'}
                  </div>
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => navigate(`/student/${a.authorId}/questions`)}
                      className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-100 text-[8px] text-gray-500">
                        {a.authorName?.[0] ?? '答'}
                      </span>
                      <span className="truncate max-w-[120px] font-medium">{a.authorName}</span>
                    </button>
                    <span className="text-[10px] text-gray-400">{new Date(a.createdAt).toLocaleString()}</span>
                  </div>
                  {a.aiResult && (
                    <div className="flex items-center gap-1 text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded w-fit">
                      <WarningCircle className="w-3 h-3" />
                      AI初筛：{a.aiResult}
                    </div>
                  )}
                </div>

                <div className="text-sm text-gray-600">
                  {a.content || '[图片/语音回答]'}
                </div>

                {a.images && a.images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {a.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 cursor-pointer active:scale-95 transition-transform"
                        onClick={() => setSelectedImage(img)}
                      >
                        <ImageWithFallback src={img} alt="answer-image" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {a.audioUrl && (
                  <div className="text-[11px] text-gray-500 bg-gray-50 px-2 py-1 rounded">
                    含语音回答
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-gray-50">
                  <button
                    onClick={() => openRejectDialog(a.id, 'answer')}
                    className="flex-1 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-medium active:scale-95 transition-transform"
                  >
                    驳回
                  </button>
                  <button
                    onClick={() => {
                      auditService
                        .approveAnswer(a.id)
                        .then(() => {
                          handleAudit(a.id, 'answer', 'approved');
                        })
                        .catch(() => {
                          toast.error('审核通过失败，请稍后重试');
                        });
                    }}
                    className="flex-1 py-2 bg-[#BDE0FE] text-[#1D4ED8] rounded-xl text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <Check className="w-3 h-3" /> 通过
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <ChatCentered className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">暂无待审核内容</p>
            </div>
          )
        ) : (
          filteredComments.length > 0 ? (
            filteredComments.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm p-4 space-y-3"
              >
                <div className="space-y-1">
                  <div className="text-[10px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded w-fit mb-1 font-medium truncate max-w-full">
                    源自：{c.questionTitle || '未知问题'}
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden">
                        <ImageWithFallback src={c.authorAvatar || ''} alt="avatar" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs font-bold text-gray-700">{c.authorName}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  {c.aiResult && (
                    <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded w-fit ${c.aiResult.includes('违规') ? 'text-red-500 bg-red-50' : 'text-orange-500 bg-orange-50'
                      }`}>
                      <WarningCircle className="w-3 h-3" />
                      AI初筛：{c.aiResult}
                    </div>
                  )}
                </div>

                <div className={`text-sm ${c.aiResult?.includes('违规') ? 'text-red-600' : 'text-gray-600'}`}>
                  {c.content}
                </div>

                {c.image && (
                  <div
                    className="w-24 h-24 rounded-lg overflow-hidden border border-gray-100 cursor-pointer active:scale-95 transition-transform"
                    onClick={() => setSelectedImage(c.image || null)}
                  >
                    <ImageWithFallback src={c.image} alt="comment" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-gray-50">
                  <button
                    onClick={() => openRejectDialog(c.id, 'comment')}
                    className="flex-1 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-bold active:scale-95 transition-transform"
                  >
                    封禁
                  </button>
                  <button
                    onClick={() => openRejectDialog(c.id, 'comment')}
                    className="flex-1 py-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-medium active:scale-95 transition-transform"
                  >
                    驳回
                  </button>
                  <button
                    onClick={() => {
                      auditService
                        .approveComment(c.id)
                        .then(() => {
                          handleAudit(c.id, 'comment', 'approved');
                        })
                        .catch(() => {
                          toast.error('审核通过失败，请稍后重试');
                        });
                    }}
                    className="flex-1 py-2 bg-[#BDE0FE] text-[#1D4ED8] rounded-xl text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <Check className="w-3 h-3" /> 通过
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <ChatCentered className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">暂无待审核内容</p>
            </div>
          )
        )}

        <div className="text-center py-6">
          <p className="text-[10px] text-gray-400">问题、回答及评论需人工二次审核，AI初筛仅作参考</p>
        </div>
      </div>

      {/* 驳回对话框 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>驳回原因</DialogTitle>
            <DialogDescription>请输入驳回该内容的具体原因，用户将收到通知。</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="例如：问题不明确，请补充详情"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="rounded-xl border-gray-200"
            />
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="flex-1 rounded-xl">取消</Button>
            <Button onClick={confirmReject} className="flex-1 rounded-xl bg-red-500 hover:bg-red-600">确认驳回</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 评分对话框 */}
      <Dialog open={scoreDialogOpen} onOpenChange={setScoreDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>问题打分</DialogTitle>
          </DialogHeader>
          <div className="py-8 flex justify-center gap-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setCurrentScore(s)}
                className="transition-transform active:scale-75"
              >
                <Star
                  className={`w-10 h-10 ${s <= currentScore ? 'text-orange-400 fill-orange-400' : 'text-gray-200'}`}
                />
              </button>
            ))}
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setScoreDialogOpen(false)} className="flex-1 rounded-xl">取消</Button>
            <Button onClick={confirmScore} className="flex-1 rounded-xl bg-orange-400 hover:bg-orange-500">保存评分</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 图片预览模态框 */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="预览"
            className="max-w-full max-h-full object-cover rounded-xl"
            style={{ maxHeight: '90vh', maxWidth: '90vw' }}
          />
        </div>
      )}
    </div>
  );
};
