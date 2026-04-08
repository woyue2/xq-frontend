/**
 * [POS] src/pages/AnswerQuestionPage.tsx
 *   所属：pages 层 | 角色：回答问题页，路由 `/answer/:id`
 *   兄弟：QuestionDetailPage.tsx / CreateQuestionPage.tsx
 *
 * [INPUT]
 *   - react                          → useState / useEffect
 *   - react-router-dom               → useNavigate / useParams
 *   - lucide-react                   → ArrowLeft
 *   - @/components/ui/*              → Button / Textarea / Label / AlertDialog
 *   - @/components/ImageUploader     → ImageUploader
 *   - sonner                         → toast
 *
 * [OUTPUT]
 *   - AnswerQuestionPage（页面组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/pages/CLAUDE.md 的文件清单
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

export function AnswerQuestionPage() {
  const navigate = useNavigate();
  const { id: questionId } = useParams<{ id: string }>();

  // Form state
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Question context
  const [questionTitle, setQuestionTitle] = useState('');
  const [loading, setLoading] = useState(true);

  // Load question details
  useEffect(() => {
    if (!questionId) return;

    const loadQuestion = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('需要登录');
          navigate('/login');
          return;
        }

        const response = await fetch(`/api/questions?id=${questionId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (data.code === 200 && data.data) {
          setQuestionTitle(data.data.title || '');
        } else {
          toast.error('加载问题失败');
          navigate('/');
        }
      } catch (error) {
        console.error('Failed to load question:', error);
        toast.error('加载问题失败');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadQuestion();
  }, [questionId, navigate]);

  const handleBack = () => {
    if (content || images.length > 0) {
      setShowExitDialog(true);
    } else {
      navigate(`/question/${questionId}`);
    }
  };

  const handleSubmit = async () => {
    // Validation: content is required
    if (!content.trim()) {
      toast.error('请输入回答内容');
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
        images: images.length > 0 ? images : undefined
      };

      const response = await fetch('/api/answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.code === 201 || data.code === 200) {
        toast.success('回答已提交');
        navigate(`/question/${questionId}`);
      } else {
        toast.error(data.message || '提交失败');
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
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
          <h1 className="text-xl flex-1 text-center">回答问题</h1>
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
          <p className="text-sm text-gray-500 mb-2">回答以下问题：</p>
          <h3 className="font-medium">{questionTitle}</h3>
        </div>

        {/* Answer Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Content Input */}
          <div className="space-y-2">
            <Label htmlFor="content">
              回答内容 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="content"
              placeholder="请输入你的回答"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] resize-none"
            />
          </div>

          {/* Image Uploader */}
          <div className="space-y-2">
            <Label>上传图片（可选）</Label>
            <ImageUploader
              maxCount={3}
              value={images}
              onChange={setImages}
              disabled={submitting}
            />
          </div>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>是否放弃回答？</AlertDialogTitle>
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
