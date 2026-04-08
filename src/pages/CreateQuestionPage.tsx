/**
 * [POS] src/pages/CreateQuestionPage.tsx
 *   所属：pages 层 | 角色：问题创建和编辑页面，路由 `/create` 和 `/edit/:id`
 *   兄弟：QuestionDetailPage.tsx / HomePage.tsx
 *
 * [INPUT]
 *   - react                          → useState / useEffect
 *   - react-router-dom               → useNavigate / useParams
 *   - swr                            → useSWR
 *   - @/lib/swr-config               → fetcher
 *   - lucide-react                   → ArrowLeft
 *   - @/components/ui/*              → Button / Input / Textarea / Label
 *   - @/components/SubjectTopicSelector → SubjectTopicSelector
 *   - @/components/ImageUploader     → ImageUploader
 *   - sonner                         → toast
 *   - @/types/dto                    → QuestionDTO
 *
 * [OUTPUT]
 *   - CreateQuestionPage（页面组件，带 SWR 缓存）
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SubjectTopicSelector } from '@/components/SubjectTopicSelector';
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

export function CreateQuestionPage() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = !!editId;

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token && isEditMode) {
    toast.error('需要登录');
    navigate('/login');
  }

  // Fetch question data with SWR in edit mode
  const { data: question, error: questionError } = useSWR<QuestionDTO>(
    editId && token ? `/api/questions?id=${editId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute deduplication
    }
  );

  // Populate form when question data is loaded
  useEffect(() => {
    if (!question) return;

    setTitle(question.title || '');
    setContent(question.content || '');
    setSubject(question.subject || '');
    setImages(question.images || []);
    
    // Extract topic from tags (first tag that's not the subject)
    if (Array.isArray(question.tags)) {
      const topicTag = question.tags.find((tag: string) => tag !== question.subject);
      if (topicTag) setTopic(topicTag);
    }
  }, [question]);

  // Handle error state
  useEffect(() => {
    if (questionError && editId) {
      toast.error('加载问题失败');
      navigate('/');
    }
  }, [questionError, editId, navigate]);

  const handleBack = () => {
    if (title || content || images.length > 0) {
      setShowExitDialog(true);
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      toast.error('请输入问题标题');
      return;
    }

    if (title.length > 100) {
      toast.error('标题最多100字');
      return;
    }

    if (content.length > 500) {
      toast.error('内容最多500字');
      return;
    }

    if (!subject) {
      toast.error('请选择科目');
      return;
    }

    if (images.length > 3) {
      toast.error('最多上传3张图片');
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

      // Prepare tags array (subject + topic if selected)
      const tags = topic ? [topic] : [];

      const payload = {
        title: title.trim(),
        content: content.trim() || undefined,
        subject,
        tags,
        images
      };

      let response;
      if (isEditMode && editId) {
        // Update existing question
        response = await fetch(`/api/questions?id=${editId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new question
        response = await fetch('/api/questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      const data = await response.json();

      if (data.code === 200 || data.code === 201) {
        toast.success(isEditMode ? '问题已更新' : '问题已创建');
        
        // Invalidate question cache to force refresh
        if (isEditMode && editId) {
          await mutate(`/api/questions?id=${editId}`);
        }
        // Also invalidate homepage cache
        await mutate((key) => typeof key === 'string' && key.startsWith('/api/questions?'));
        
        navigate(`/question/${data.data.id}`);
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch (error) {
      console.error('Failed to submit question:', error);
      toast.error('操作失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !submitting && title.trim().length > 0 && subject;

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
          <h1 className="text-xl flex-1 text-center">
            {isEditMode ? '编辑问题' : '创建问题'}
          </h1>
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
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Subject and Topic Selector */}
          <SubjectTopicSelector
            subjectValue={subject}
            topicValue={topic}
            onSubjectChange={setSubject}
            onTopicChange={setTopic}
            required
          />

          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title">
              问题标题 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="请输入问题标题（最多100字）"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              maxLength={100}
            />
            <div className="text-sm text-gray-500 text-right">
              {title.length}/100
            </div>
          </div>

          {/* Content Input */}
          <div className="space-y-2">
            <Label htmlFor="content">问题详情</Label>
            <Textarea
              id="content"
              placeholder="请输入详细描述（可选，最多500字）"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 500))}
              className="min-h-[120px] resize-none"
              maxLength={500}
            />
            <div className="text-sm text-gray-500 text-right">
              {content.length}/500
            </div>
          </div>

          {/* Image Uploader */}
          <div className="space-y-2">
            <Label>上传图片（最多3张）</Label>
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
            <AlertDialogTitle>是否放弃编辑？</AlertDialogTitle>
            <AlertDialogDescription>
              当前编辑的内容将不会被保存
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续编辑</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/')}>
              确认放弃
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
