/**
 * [POS] src/pages/CommentQuestionPage.tsx
 *   所属：pages 层 | 角色：评论问题页，路由 `/comment/:id`
 *   兄弟：QuestionDetailPage.tsx / AnswerQuestionPage.tsx
 *
 * [INPUT]
 *   - react                          → useState / useEffect
 *   - react-router-dom               → useNavigate / useParams
 *   - swr                            → useSWR
 *   - @/lib/swr-config               → fetcher
 *   - lucide-react                   → ArrowLeft
 *   - @/components/ui/*              → Button / Textarea / Label / AlertDialog
 *   - @/components/ImageUploader     → ImageUploader
 *   - sonner                         → toast
 *   - @/types/dto                    → QuestionDTO
 *
 * [OUTPUT]
 *   - CommentQuestionPage（页面组件，带 SWR 缓存）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/pages/CLAUDE.md 的文件清单
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/swr-config';
import type { QuestionDTO } from '@/types/dto';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ImageUploader } from '@/components/ImageUploader';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function CommentQuestionPage() {
  const navigate = useNavigate();
  const { id: questionId } = useParams<{ id: string }>();

  // Form state
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    toast.error('需要登录');
    navigate('/login');
  }

  // Fetch question data with SWR
  const { data: question, error: questionError, isLoading: loading } = useSWR<QuestionDTO>(
    questionId && token ? `/api/questions?id=${questionId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute deduplication
    }
  );

  // Extract question title
  const questionTitle = question?.title || '';

  // Handle error state
  useEffect(() => {
    if (questionError && questionId) {
      toast.error('加载问题失败');
      navigate('/');
    }
  }, [questionError, questionId, navigate]);

  const handleBack = () => {
    if (content || image) {
      setShowExitDialog(true);
    } else {
      navigate(`/question/${questionId}`);
    }
  };

  const handleSubmit = async () => {
    // Validation: content is required
    if (!content.trim()) {
      toast.error('请输入评论内容');
      return;
    }

    if (!questionId) {
      toast.error('问题ID缺失');
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('需要登录');
        navigate('/login');
        return;
      }

      const payload = {
        questionId,
        content: content.trim(),
        image: image || undefined
      };

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.code === 201 || data.code === 200) {
        toast.success('评论已提交');
        
        // Invalidate comments cache to force refresh
        await mutate(`/api/comments?questionId=${questionId}`);
        
        navigate(`/question/${questionId}`);
      } else {
        toast.error(data.message || '提交失败');
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
      toast.error('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !submitting && content.trim().length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl flex-1 text-center">评论问题</h1>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-teal-500 hover:bg-teal-600"
          >
            {submitting ? '提交中...' : '提交'}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {/* Question Context */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border-l-4 border-teal-500">
          <p className="text-sm text-gray-500 mb-2">评论以下问题：</p>
          <h3 className="font-medium">{questionTitle}</h3>
        </div>

        {/* Comment Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Content Input */}
          <div className="space-y-2">
            <Label htmlFor="content">
              评论内容 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="content"
              placeholder="请输入你的评论"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </div>

          {/* Image Uploader (Single Image) */}
          <div className="space-y-2">
            <Label>上传图片（可选，最多1张）</Label>
            <ImageUploader
              maxCount={1}
              value={image ? [image] : []}
              onChange={(images) => setImage(images[0] || '')}
              disabled={submitting}
            />
          </div>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>是否放弃评论？</AlertDialogTitle>
            <AlertDialogDescription>
              当前编辑的内容将不会被保存
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续编辑</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate(`/question/${questionId}`)}>
              确认放弃
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
