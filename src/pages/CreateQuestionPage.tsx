import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { TAXONOMY, SUBJECT_OPTIONS } from '@/config/taxonomy';
import { useAuthStore } from '@/stores/useAuthStore';
import { isMemberActive } from '@/lib/permissions';
import { useDebounce } from '@/hooks/useDebounce';
import { mockQuestions } from '@/lib/mock-data';
import { questionService } from '@/services/api';

export function CreateQuestionPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Permission Check
  useEffect(() => {
    if (user && !isMemberActive(user)) {
      toast.error('您的会员已过期，请联系老师续费');
      navigate('/');
    }
  }, [user, navigate]);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Structured input state
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');

  // Derived options based on subject
  const currentSubjectConfig = selectedSubject ? TAXONOMY[selectedSubject] : null;

  const [similarQuestions, setSimilarQuestions] = useState<typeof mockQuestions>([]);
  const debouncedTitle = useDebounce(title, 500);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Smart Search Effect
  useEffect(() => {
    if (debouncedTitle.length > 2) {
      // Mock Search Logic: Filter questions that contain the title keywords
      const hits = mockQuestions.filter(q =>
        q.title.includes(debouncedTitle) ||
        q.topics?.some(t => debouncedTitle.includes(t))
      ).slice(0, 3);
      setSimilarQuestions(hits);
    } else {
      setSimilarQuestions([]);
    }
  }, [debouncedTitle]);

  const handleImageUpload = () => {
    if (images.length >= 3) {
      toast.error('最多只能上传3张图片');
      return;
    }

    if (!fileInputRef.current) return;
    fileInputRef.current.click();
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const remainingSlots = 3 - images.length;
    if (remainingSlots <= 0) {
      toast.error('最多只能上传3张图片');
      event.target.value = '';
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    try {
      const uploadedUrls: string[] = [];
      for (const file of filesToUpload) {
        // 顺序上传，便于控制错误与提示
        // eslint-disable-next-line no-await-in-loop
        const { imageUrl } = await questionService.uploadImage(file, {
          purpose: '提问',
          senderName: user?.nickname ?? user?.name ?? '学生',
          receiverName: '老师'
        });
        uploadedUrls.push(imageUrl);
      }
      if (uploadedUrls.length > 0) {
        setImages(prev => [...prev, ...uploadedUrls]);
        toast.success('图片上传成功');
      }
    } catch {
      toast.error('图片上传失败，请稍后重试');
    } finally {
      // 允许用户重复选择同一文件
      event.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const handleBack = () => {
    if (title || content || images.length > 0) {
      setShowExitDialog(true);
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async () => {
    // Double check permission on submit
    if (user && !isMemberActive(user)) {
      toast.error('您的会员已过期，无法提问');
      return;
    }

    if (!selectedSubject) {
      toast.error('请选择科目');
      return;
    }

    if (!title.trim()) {
      toast.error('请输入问题标题');
      return;
    }

    if (title.length > 100) {
      toast.error('标题不能超过100字');
      return;
    }

    if (content.length > 500) {
      toast.error('详情不能超过500字');
      return;
    }

    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title,
        content,
        subject: selectedSubject,
        tags: [selectedTopic, selectedMethod].filter(Boolean),
        images
      };

      const created = await questionService.createQuestion(payload);

      toast.success('问题已提交，AI 正在初筛中...');
      // 成功后跳转到问题详情页，若后端未返回 id，则回首页兜底
      if (created?.id) {
        navigate(`/question/${created.id}`);
      } else {
        navigate('/');
      }
    } catch {
      // 具体错误提示由 axios 拦截器统一处理
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !submitting && title.trim().length > 0 && selectedSubject;

  if (!user) return null; // Should be handled by layout but safe guard

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl flex-1 text-center">编辑我的问题</h1>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-teal-500 hover:bg-teal-600"
          >
            提交
          </Button>
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 text-sm">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* 1. 科目选择 (Taxonomy) */}
          <div className="space-y-3">
            <Label className="text-base font-bold">选择科目 <span className="text-red-500">*</span></Label>
            <div className="flex gap-2">
              {SUBJECT_OPTIONS.map((sub) => (
                <button
                  key={sub.value}
                  onClick={() => {
                    setSelectedSubject(sub.value);
                    setSelectedTopic('');
                    setSelectedMethod('');
                  }}
                  className={`px-4 py-2 rounded-full border transition-all ${selectedSubject === sub.value
                    ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. 考点与方法联动 (Dynamic Chips) */}
          {currentSubjectConfig && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label className="text-gray-500">核心考点 (Topic)</Label>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择考点" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentSubjectConfig.topics.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-500">解题方法 (Method)</Label>
                <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="尝试了什么方法？" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentSubjectConfig.methods.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}



            // ... render part ...

          {/* 3. 问题标题 */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-bold">
              问题标题 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="title"
              placeholder="一句话描述你的问题（必填，最多100字）"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              className="min-h-[60px] resize-none text-base"
            />

            {/* 智能防重 - 猜你想找 */}
            {similarQuestions.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-2 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2 text-xs text-amber-600 font-bold">
                  <span className="bg-amber-100 px-1.5 py-0.5 rounded">AI 智能拦截</span>
                  <span>发现相似问题，看看有没有你想要的答案？</span>
                </div>
                <div className="space-y-2">
                  {similarQuestions.map(q => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between text-sm bg-white p-2 rounded border border-amber-100 cursor-pointer hover:bg-amber-50 transition"
                      onClick={() => window.open(`/question/${q.id}`, '_blank')}
                    >
                      <span className="truncate flex-1 text-gray-700">{q.title}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{q.stats.answers}个回答</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-sm text-gray-500 text-right">
              {title.length}/100
            </div>
          </div>

          {/* 4. 问题详情 */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-base font-bold">问题详情</Label>
            <Textarea
              id="content"
              placeholder="请输入详细描述，支持公式和符号...（可选，最多500字）"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 500))}
              className="min-h-[120px] resize-none"
            />
            <div className="text-sm text-gray-500 text-right">
              {content.length}/500
            </div>
          </div>

          {/* 5. 图片上传区 */}
          <div className="space-y-2">
            <Label className="font-bold">上传图片（最多3张）</Label>
            <div className="flex flex-wrap gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
                data-testid="create-question-image-input"
              />
              {/* 已上传图片预览 */}
              {images.map((image, index) => (
                <div key={index} className="relative w-24 h-24">
                  <img
                    src={image}
                    alt={`上传图片${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* 上传按钮 */}
              {images.length < 3 && (
                <button
                  onClick={handleImageUpload}
                  className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-teal-500 hover:bg-teal-50 transition"
                >
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-500">上传图片</span>
                </button>
              )}
            </div>
          </div>

          {/* 审核提示 */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
            <p className="text-sm text-indigo-800">
              💡 AI 小贴士：准确选择 <b>科目</b> 和 <b>考点</b> 能让老师更快回答哦！
            </p>
          </div>
        </div>
      </div>

      {/* 退出确认对话框 */}
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
