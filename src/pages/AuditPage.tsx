import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Filter, 
  Check, 
  X, 
  Star, 
  AlertCircle, 
  Image as ImageIcon,
  MoreHorizontal,
  ThumbsUp,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { Checkbox } from '@/app/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';
import { mockQuestions, mockComments } from '@/lib/mock-data';
import type { Question, Comment, AuditStatus } from '@/types';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

interface AuditPageProps {
  onNavigate: (page: string) => void;
}

export const AuditPage = ({ onNavigate }: AuditPageProps) => {
  const [activeTab, setActiveTab] = useState<'questions' | 'comments'>('questions');
  const [filter, setFilter] = useState<AuditStatus>('pending');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  
  // 驳回相关状态
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [currentAuditItem, setCurrentAuditItem] = useState<{ id: string; type: 'question' | 'comment' } | null>(null);
  
  // 评分相关状态
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    // 展出所有问题
    const allQuestions = mockQuestions;
    // 展出所有评论
    const allComments = Object.values(mockComments).flat();
    
    setQuestions(allQuestions);
    setComments(allComments);
  }, []);

  const filteredQuestions = questions.filter(q => q.status === filter);
  const filteredComments = comments.filter(c => c.status === filter);

  const pendingQuestionsCount = questions.filter(q => q.status === 'pending').length;
  const pendingCommentsCount = comments.filter(c => c.status === 'pending').length;

  const handleAudit = (id: string, type: 'question' | 'comment', status: AuditStatus, extraData?: any) => {
    if (type === 'question') {
      setQuestions(prev => prev.map(q => {
        if (q.id === id) {
          return { ...q, status, ...extraData };
        }
        return q;
      }));
    } else {
      setComments(prev => prev.map(c => {
        if (c.id === id) {
          return { ...c, status, ...extraData };
        }
        return c;
      }));
    }
    
    const statusText = status === 'approved' ? '已通过' : status === 'rejected' ? '已驳回' : '已封禁';
    toast.success(`审核完成：${statusText}`);
  };

  const openRejectDialog = (id: string, type: 'question' | 'comment') => {
    setCurrentAuditItem({ id, type });
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (!currentAuditItem) return;
    handleAudit(currentAuditItem.id, currentAuditItem.type, 'rejected', { rejectReason });
    setRejectDialogOpen(false);
  };

  const openScoreDialog = (id: string) => {
    setCurrentAuditItem({ id, type: 'question' });
    const q = questions.find(item => item.id === id);
    setCurrentScore(q?.score || 0);
    setScoreDialogOpen(true);
  };

  const confirmScore = () => {
    if (!currentAuditItem) return;
    setQuestions(prev => prev.map(q => {
      if (q.id === currentAuditItem.id) {
        return { ...q, score: currentScore };
      }
      return q;
    }));
    setScoreDialogOpen(false);
    toast.success('评分已更新');
  };

  const toggleGoodQuestion = (id: string, checked: boolean) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        return { ...q, isGoodQuestion: checked };
      }
      return q;
    }));
  };

  return (
    <div className="flex flex-col h-screen bg-[#EDEDE9]">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <button 
          onClick={() => onNavigate('profile')}
          className="p-2 -ml-2 active:scale-90 transition-transform"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 flex items-center">
          审核管理
          {(pendingQuestionsCount > 0 || pendingCommentsCount > 0) && (
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
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors relative ${
              activeTab === 'questions' ? 'bg-[#D5BDAF] text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            问题审核 {pendingQuestionsCount > 0 && `(${pendingQuestionsCount})`}
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'comments' ? 'bg-[#D5BDAF] text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            评论审核 {pendingCommentsCount > 0 && `(${pendingCommentsCount})`}
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
                      <span>{q.authorName}</span>
                      <span>•</span>
                      <span>{new Date(q.createdAt).toLocaleString()}</span>
                    </div>
                    {q.aiResult && (
                      <div className="flex items-center gap-1 text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded w-fit">
                        <AlertCircle className="w-3 h-3" />
                        AI初筛：{q.aiResult}
                      </div>
                    )}
                  </div>
                  {q.isGoodQuestion && (
                    <Badge className="bg-red-500 text-white border-none text-[10px] h-5">好问题</Badge>
                  )}
                </div>

                <div className="text-sm text-gray-600 line-clamp-3">
                  {q.content}
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
                    className={`flex-1 py-2 rounded-xl text-xs font-medium active:scale-95 transition-transform flex items-center justify-center gap-1 ${
                      q.score ? 'bg-orange-50 text-orange-500' : 'bg-gray-50 text-gray-500'
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
                    onClick={() => handleAudit(q.id, 'question', 'approved')}
                    className="flex-1 py-2 bg-[#BDE0FE] text-[#1D4ED8] rounded-xl text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <Check className="w-3 h-3" /> 通过
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <MessageSquare className="w-10 h-10 mb-2 opacity-20" />
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
                    <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded w-fit ${
                      c.aiResult.includes('违规') ? 'text-red-500 bg-red-50' : 'text-orange-500 bg-orange-50'
                    }`}>
                      <AlertCircle className="w-3 h-3" />
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
                    onClick={() => handleAudit(c.id, 'comment', 'banned')}
                    className="flex-1 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-bold active:scale-95 transition-transform"
                  >
                    封禁
                  </button>
                  <button 
                    onClick={() => handleAudit(c.id, 'comment', 'rejected')}
                    className="flex-1 py-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-medium active:scale-95 transition-transform"
                  >
                    驳回
                  </button>
                  <button 
                    onClick={() => handleAudit(c.id, 'comment', 'approved')}
                    className="flex-1 py-2 bg-[#BDE0FE] text-[#1D4ED8] rounded-xl text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <Check className="w-3 h-3" /> 通过
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <MessageSquare className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">暂无待审核内容</p>
            </div>
          )
        )}

        <div className="text-center py-6">
          <p className="text-[10px] text-gray-400">问题及评论需人工二次审核，AI初筛仅作参考</p>
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
            className="max-w-full max-h-full object-contain animate-in zoom-in duration-200"
          />
        </div>
      )}
    </div>
  );
};