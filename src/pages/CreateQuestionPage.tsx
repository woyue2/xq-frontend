/**
 * [POS] src/pages/CreateQuestionPage.tsx
 *   所属：pages 层 | 角色：学生/家长发布问题页，路由 `/create`
 *   兄弟：QuestionDetailPage.tsx / HomePage.tsx
 *
 * [INPUT]
 *   - react          → useState / useEffect / useRef / ChangeEvent
 *   - lucide-react   → ArrowLeft / Upload / X
 *   - @/components/ui/* → Button
 *   - @/services/api → questionService
 *
 * [OUTPUT]
 *   - CreateQuestionPage（页面组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/pages/CLAUDE.md 的文件清单
 */
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
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/config/app-constants';
import type { SubjectDto } from '@/types/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { isMemberActive } from '@/lib/permissions';
import { useDebounce } from '@/hooks/useDebounce';
import { questionService, configService } from '@/services/api';
import { subjectConfigService } from '@/services/subjectConfig.service';
import { safeCreate } from '@/lib/race-condition-fix';
import type { Question } from '@/types';
import type { QuestionDimensionDto } from '@/types/api';

export function CreateQuestionPage() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = !!editId;
  const { user } = useAuthStore();

  // Permission Check
  useEffect(() => {
    if (user && !isMemberActive(user)) {
      toast.error('您的会员已过期，请联系老师续费');
      navigate(ROUTES.home);
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
  const [subjectList, setSubjectList] = useState<SubjectDto[]>([]);
  const currentSubjectConfig =
    (subjectList ?? []).find((s) => s.key === `subject_${selectedSubject}`) ?? null;

  // 解题方法/办法维度配置（从后端动态获取，可关闭或改名）
  const [methodDimension, setMethodDimension] = useState<QuestionDimensionDto | null>(null);
  const [methodOptions, setMethodOptions] = useState<
    { value: string; label: string; order: number }[]
  >([]);
  const [methodConfigLoaded, setMethodConfigLoaded] = useState(false);

  const [similarQuestions, setSimilarQuestions] = useState<Question[]>([]);
  const debouncedTitle = useDebounce(title, 500);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 编辑模式：加载现有问题数据
  useEffect(() => {
    if (!editId) return;
    questionService
      .getQuestionById(editId)
      .then((q) => {
        if (!q) return;
        setTitle(q.title ?? '');
        setContent(q.content ?? '');
        setImages(q.images ?? []);
        setSelectedSubject(q.subject ?? '');
        if (Array.isArray(q.tags)) {
          const method = q.tags.find((t) => t && t !== q.subject);
          if (method) setSelectedMethod(method);
        }
      })
      .catch(() => toast.error('加载问题失败'));
  }, [editId]);

  // Smart Search Effect
  useEffect(() => {
    setSimilarQuestions([]);
  }, [debouncedTitle]);

  // 题目维度配置加载：当前仅使用 method 维度
  useEffect(() => {
    let cancelled = false;

    const loadDimensions = async () => {
      try {
        const dims = await configService.getQuestionDimensions();
        if (cancelled) return;

        const methodDim = dims.find((d) => d.key === 'method');
        setMethodConfigLoaded(true);

        if (methodDim && methodDim.enabled) {
          const sortedOptions = [...(methodDim.options ?? [])]
            .filter((opt) => opt && opt.value && opt.label)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((opt) => ({
              value: opt.value,
              label: opt.label,
              order: opt.order ?? 0,
            }));

          setMethodDimension(methodDim);
          setMethodOptions(sortedOptions);
        } else {
          setMethodDimension(null);
          setMethodOptions([]);
        }
      } catch {
        // 静默失败：维度配置失败时继续使用内置 TAXONOMY 配置
        setMethodDimension(null);
        setMethodOptions([]);
        setMethodConfigLoaded(false);
      }
    };

    loadDimensions();

    return () => {
      cancelled = true;
    };
  }, []);

  // 科目/考点动态加载（每次进入页面强制刷新，绕过缓存）
  useEffect(() => {
    subjectConfigService.clearCache();
    subjectConfigService
      .getSubjects()
      .then((list) => {
        setSubjectList(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, []);

  const showMethodField = !!currentSubjectConfig;

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
          receiverName: '老师',
        });
        uploadedUrls.push(imageUrl);
      }
      if (uploadedUrls.length > 0) {
        setImages((prev) => [...prev, ...uploadedUrls]);
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
      navigate(ROUTES.home);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return; // 防重复提交
    
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
        images,
      };

      if (isEditMode && editId) {
        await questionService.updateQuestion(editId, payload);
        
        // 验证更新后的问题是否可以访问（防止竞态条件）
        try {
          await questionService.getQuestionById(editId);
          toast.success('问题已更新');
          navigate(ROUTES.question(editId));
        } catch (error) {
          // 如果问题暂时不可访问，使用轮询重试
          const maxRetries = 3;
          const retryDelay = 200;

          const retryAccess = async (): Promise<boolean> => {
            for (let i = 0; i < maxRetries; i++) {
              try {
                await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, i)));
                await questionService.getQuestionById(editId);
                return true;
              } catch {
                if (i === maxRetries - 1) return false;
              }
            }
            return false;
          };

          const accessible = await retryAccess();
          if (accessible) {
            toast.success('问题已更新');
            navigate(ROUTES.question(editId));
          } else {
            toast.success('问题已更新，但详情页暂时无法访问，请稍后查看');
            navigate(ROUTES.home);
          }
        }
        return;
      }

      const created = await questionService.createQuestion(payload);

      // 验证响应包含有效的问题 ID
      if (!created || !(created as Question).id) {
        toast.error('创建问题失败：未返回有效的问题ID');
        setSubmitting(false);
        return;
      }

      const questionId = (created as Question).id;

      // 处理 AI 审核结果（仅处理违规情况，质量问题已在后端拦截）
      const aiAudit = (created as any)?.aiAudit;
      if (aiAudit && !aiAudit.safe) {
        // 内容违规被拒绝（理论上不会到这里，因为后端会抛错）
        toast.error(`提交失败：${aiAudit.reason || '内容不符合规范'}`);
        setSubmitting(false);
        return;
      }

      // 验证问题是否可以访问（防止竞态条件）
      try {
        await questionService.getQuestionById(questionId);
        toast.success('问题已提交，已跳转到详情页');
        navigate(ROUTES.question(questionId));
      } catch (error) {
        // 如果问题暂时不可访问，使用轮询重试
        let retryCount = 0;
        const maxRetries = 3;
        const retryDelay = 200; // 200ms初始延迟

        const retryAccess = async (): Promise<boolean> => {
          for (let i = 0; i < maxRetries; i++) {
            try {
              await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, i)));
              await questionService.getQuestionById(questionId);
              return true;
            } catch {
              if (i === maxRetries - 1) return false;
            }
          }
          return false;
        };

        const accessible = await retryAccess();
        if (accessible) {
          toast.success('问题已提交，已跳转到详情页');
          navigate(ROUTES.question(questionId));
        } else {
          toast.success('问题已提交，但详情页暂时无法访问，请稍后查看');
          navigate(ROUTES.home);
        }
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
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl flex-1 text-center">{isEditMode ? '编辑问题' : '编辑我的问题'}</h1>
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
            <Label className="text-base font-bold">
              选择科目 <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2 flex-wrap">
              {(subjectList ?? []).map((sub) => (
                <button
                  key={sub.key}
                  onClick={() => {
                    setSelectedSubject(sub.key.replace('subject_', ''));
                    setSelectedTopic('');
                    setSelectedMethod('');
                  }}
                  className={`px-4 py-2 rounded-full border transition-all ${
                    selectedSubject === sub.key.replace('subject_', '')
                      ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </div>

          {/* 2. 考点与方法联动 (Dynamic Chips) */}
          {currentSubjectConfig && (
            <div
              className={`grid grid-cols-1 ${
                showMethodField ? 'md:grid-cols-2' : ''
              } gap-4 animate-in fade-in slide-in-from-top-2`}
            >
              <div className="space-y-2">
                <Label className="text-gray-500">核心考点 (Topic)</Label>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择考点" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentSubjectConfig.topics.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showMethodField && (
                <div className="space-y-2">
                  <Label className="text-gray-500">
                    {methodDimension?.name ?? '解题方法'} (Method)
                  </Label>
                  <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="尝试了什么方法？" />
                    </SelectTrigger>
                    <SelectContent>
                      {(methodOptions.length > 0 ? methodOptions : []).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

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
                  {similarQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between text-sm bg-white p-2 rounded border border-amber-100 cursor-pointer hover:bg-amber-50 transition"
                      onClick={() => window.open(`/question/${q.id}`, '_blank')}
                    >
                      <span className="truncate flex-1 text-gray-700">{q.title}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                        {q.stats.answers}个回答
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-sm text-gray-500 text-right">{title.length}/100</div>
          </div>

          {/* 4. 问题详情 */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-base font-bold">
              问题详情
            </Label>
            <Textarea
              id="content"
              placeholder="请输入详细描述，支持公式和符号...（可选，最多500字）"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 500))}
              className="min-h-[120px] resize-none"
            />
            <div className="text-sm text-gray-500 text-right">{content.length}/500</div>
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
            <AlertDialogDescription>当前编辑的内容将不会被保存</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续编辑</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate(ROUTES.home)}>确认放弃</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
