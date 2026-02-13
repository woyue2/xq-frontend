import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { ArrowLeft, UploadSimple, X } from '@phosphor-icons/react';
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
import { TAXONOMY } from '@/config/taxonomy';
import { useAuthStore } from '@/stores/useAuthStore';
import { isMemberActive } from '@/lib/permissions';
import { useDebounce } from '@/hooks/useDebounce';
import { questionService, configService } from '@/services/api';
import type { Question } from '@/types';
import type { QuestionDimensionDto } from '@/types/api';
import { ImageCropDialog } from '@/components/ImageCropDialog';
import { ImageCarousel } from '@/components/ui/image-carousel';

const METHOD_PROGRESS_OPTIONS = [
  { value: '读不懂题', label: '读不懂题', order: 10 },
  { value: '完全不会', label: '完全不会', order: 20 },
  { value: '试过但卡住', label: '试过但卡住', order: 30 },
  { value: '做了一半', label: '做了一半', order: 40 },
  { value: '就差一点点', label: '就差一点点', order: 50 },
] as const;

const TOPIC_UNKNOWN_OPTION = '不知道';
// 修改原因：方案A要求“每次仅上传一道题图片”，收敛上传数量到单图，降低后续打印版面失控风险。
const MAX_QUESTION_IMAGES = 1;

export function CreateQuestionPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  // 修改原因：方案A需要按“用户维度”隔离提问草稿，避免不同账号串草稿。
  const draftKey = user?.id ? `draft:create-question:${user.id}` : '';

  // Permission Check
  useEffect(() => {
    if (user && !isMemberActive(user)) {
      toast.error('您的会员已过期');
      navigate('/');
    }
  }, [user, navigate]);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Structured input state
  // 修改原因：产品当前仅支持数学提问，前端提交口径固定为 math，避免用户再选择科目。
  // ⚠️ 不确定因素：后续若恢复“学科/生活”分类，需要恢复此处的可选状态并同步后端校验。
  const [selectedSubject] = useState<string>('math');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');

  // Derived options based on subject
  const currentSubjectConfig = selectedSubject ? TAXONOMY[selectedSubject] : null;

  // 解题方法/办法维度配置（从后端动态获取，可关闭或改名）
  const [methodDimension, setMethodDimension] = useState<QuestionDimensionDto | null>(null);
  const [methodOptions, setMethodOptions] = useState<
    { value: string; label: string; order: number }[]
  >(METHOD_PROGRESS_OPTIONS.map((item) => ({ ...item })));
  const [methodConfigLoaded, setMethodConfigLoaded] = useState(false);

  const [similarQuestions, setSimilarQuestions] = useState<Question[]>([]);
  const debouncedTitle = useDebounce(title, 500);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropResolveRef = useRef<((file: File | null) => void) | null>(null);
  // 修改原因：方案A要求“上传前先裁剪”，这里保存当前待裁剪图片。
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 修改原因：为图片上传提供“进行中”可视反馈，避免用户等待时无感知。
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  // 修改原因：展示顺序上传进度（第几张/总张数），减少重复点击与误判。
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  // 修改原因：支持点击缩略图查看大图，覆盖“上传后（表单内预览阶段）”查看诉求。
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Smart MagnifyingGlass Effect
  useEffect(() => {
    setSimilarQuestions([]);
  }, [debouncedTitle]);

  useEffect(() => {
    if (!draftKey) return;
    try {
      const rawDraft = window.localStorage.getItem(draftKey);
      if (!rawDraft) return;
      const parsed = JSON.parse(rawDraft) as {
        title?: string;
        content?: string;
        images?: string[];
        selectedTopic?: string;
        selectedMethod?: string;
      };
      // 修改原因：进入页面自动恢复同账号草稿，减少误退出后的重复输入。
      setTitle(parsed.title ?? '');
      setContent(parsed.content ?? '');
      setImages(Array.isArray(parsed.images) ? parsed.images : []);
      setSelectedTopic(parsed.selectedTopic ?? '');
      setSelectedMethod(parsed.selectedMethod ?? '');
      toast.success('已恢复上次未提交的提问草稿');
    } catch {
      // ⚠️ 不确定因素：localStorage 可能被外部手动篡改为非 JSON，这里仅做静默兜底不阻断页面。
    }
  }, [draftKey]);

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
          // 修改原因：按产品文案统一“做到哪一步了？”固定选项，避免后台历史配置与当前引导不一致。
          setMethodDimension(methodDim);
          setMethodOptions(METHOD_PROGRESS_OPTIONS.map((item) => ({ ...item })));
        } else {
          setMethodDimension(null);
          setMethodOptions(METHOD_PROGRESS_OPTIONS.map((item) => ({ ...item })));
        }
      } catch {
        // 静默失败：维度配置失败时继续使用内置 TAXONOMY 配置
        setMethodDimension(null);
        // 修改原因：即使维度配置请求失败，也要保证“做到哪一步了”选项可用。
        setMethodOptions(METHOD_PROGRESS_OPTIONS.map((item) => ({ ...item })));
        setMethodConfigLoaded(false);
      }
    };

    loadDimensions();

    return () => {
      cancelled = true;
    };
  }, []);

  const showMethodField = !!currentSubjectConfig;

  const handleImageUpload = () => {
    if (isUploadingImages) {
      return;
    }

    if (images.length >= MAX_QUESTION_IMAGES) {
      toast.error('每次仅可上传1张题目图片，如需更换请先删除当前图片');
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

    // ⚠️ 不确定因素：部分系统文件选择器在特定手势/多选模式下仍可能返回多文件，这里统一兜底为仅取首张。
    if (files.length > 1) {
      toast.error('一次只能选择1张题目图片');
    }

    const remainingSlots = MAX_QUESTION_IMAGES - images.length;
    if (remainingSlots <= 0) {
      toast.error('每次仅可上传1张题目图片，如需更换请先删除当前图片');
      event.target.value = '';
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    const requestCrop = (file: File) =>
      new Promise<File | null>((resolve) => {
        cropResolveRef.current = resolve;
        setPendingCropFile(file);
      });

    try {
      setIsUploadingImages(true);
      setUploadProgress({ current: 0, total: filesToUpload.length });
      const uploadedUrls: string[] = [];
      for (let i = 0; i < filesToUpload.length; i += 1) {
        const file = filesToUpload[i];
        // 修改原因：上传前先裁剪，再进入现有压缩+上传链路，兼顾清晰度与体积控制。
        // ⚠️ 不确定因素：若用户取消裁剪，当前策略为“跳过该文件继续后续文件”。
        // eslint-disable-next-line no-await-in-loop
        const croppedFile = await requestCrop(file);
        if (!croppedFile) {
          continue;
        }
        // ⚠️ 不确定因素：当前按顺序上传；若未来改为并发上传，这里的 current/total 语义需改为“已完成数”。
        setUploadProgress({ current: i + 1, total: filesToUpload.length });
        // 顺序上传，便于控制错误与提示
        // eslint-disable-next-line no-await-in-loop
        const { imageUrl } = await questionService.uploadImage(croppedFile, {
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
      setIsUploadingImages(false);
      setUploadProgress(null);
      // 允许用户重复选择同一文件
      event.target.value = '';
    }
  };

  const handleCropCancel = () => {
    if (cropResolveRef.current) {
      cropResolveRef.current(null);
      cropResolveRef.current = null;
    }
    setPendingCropFile(null);
  };

  const handleCropConfirm = (file: File) => {
    if (cropResolveRef.current) {
      cropResolveRef.current(file);
      cropResolveRef.current = null;
    }
    setPendingCropFile(null);
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

  const saveDraft = () => {
    if (!draftKey) return;
    try {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({
          title,
          content,
          images,
          selectedTopic,
          selectedMethod,
          updatedAt: Date.now()
        })
      );
    } catch {
      // ⚠️ 不确定因素：Safari 隐私模式或存储空间不足时 setItem 可能失败，此处仅提示用户。
      toast.error('草稿保存失败，请检查浏览器存储权限');
    }
  };

  const clearDraft = () => {
    if (!draftKey) return;
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
  };

  const handleSaveDraftAndExit = () => {
    saveDraft();
    setShowExitDialog(false);
    toast.success('草稿已保存');
    navigate('/');
  };

  const handleDiscardAndExit = () => {
    // 修改原因：用户明确选择“放弃”时应清理历史草稿，避免下次进入时误恢复。
    clearDraft();
    setShowExitDialog(false);
    navigate('/');
  };

  const handleSubmit = async () => {
    // Double check permission on submit
    if (user && !isMemberActive(user)) {
      toast.error('您的会员已过期，无法提问');
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
        // 修改原因：即使未来页面上出现异常状态，也确保请求体中的 subject 固定为 math。
        subject: selectedSubject,
        tags: [selectedTopic, selectedMethod].filter(Boolean),
        images
      };

      const created = await questionService.createQuestion(payload);

      // 处理 AI 审核结果
      const aiAudit = (created as any)?.aiAudit;
      if (aiAudit) {
        if (!aiAudit.safe) {
          // 内容违规被拒绝
          toast.error(`提交失败：${aiAudit.reason || '内容不符合规范'}`);
          setSubmitting(false);
          return;
        }
        if (aiAudit.qualitySuggestion) {
          // 有改进建议，显示提示
          toast.info(aiAudit.qualitySuggestion, { duration: 5000 });
        }
      }

      toast.success('问题已提交，已跳转到详情页');
      // 修改原因：提交成功后草稿已失效，及时清理避免下次误恢复旧内容。
      clearDraft();
      // 提交成功后跳转到该问题详情页，便于学生继续查看与分享
      if (created && (created as Question).id) {
        navigate(`/question/${(created as Question).id}`);
      } else {
        // 兜底：如果后端未返回有效 ID，则回首页
        navigate('/');
      }
    } catch {
      // 具体错误提示由 axios 拦截器统一处理
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !submitting && !isUploadingImages && title.trim().length > 0 && Boolean(selectedSubject);

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
            data-testid="create-question-submit-top"
            className="bg-teal-500 hover:bg-teal-600"
          >
            提交
          </Button>
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 text-sm">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* 修改原因：仅保留数学维度，移除“选择科目”交互，减少与产品定位不一致的入口。 */}
          {/* 1. 考点与方法联动 (Dynamic Chips) */}
          {currentSubjectConfig && (
            <div
              className={`grid grid-cols-1 ${showMethodField ? 'md:grid-cols-2' : ''
                } gap-4 animate-in fade-in slide-in-from-top-2`}
            >
              <div className="space-y-2">
                {/* 修改原因：字段名改为“知识点”，降低术语门槛。 */}
                <Label className="text-gray-500">知识点</Label>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择知识点" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentSubjectConfig.topics.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                    {/* 修改原因：在保留原有知识点选项基础上新增“不知道”，降低填写阻力。 */}
                    <SelectItem value={TOPIC_UNKNOWN_OPTION}>{TOPIC_UNKNOWN_OPTION}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showMethodField && (
                <div className="space-y-2">
                  {/* 修改原因：字段名改为“做到哪一步了？”，更贴近学生当前状态表达。 */}
                  <Label className="text-gray-500">做到哪一步了？</Label>
                  <Select
                    value={selectedMethod}
                    onValueChange={setSelectedMethod}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择你的当前进度" />
                    </SelectTrigger>
                    <SelectContent>
                      {(methodOptions.length > 0 ? methodOptions : METHOD_PROGRESS_OPTIONS).map((opt) => (
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

          {/* 2. 问题标题 */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-bold">
              问题标题 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="title"
              placeholder="用一句话说说你卡住的点（培养总结能力）"
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

          {/* 3. 问题详情 */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-base font-bold">问题详情</Label>
            <Textarea
              id="content"
              placeholder="请输入问题详细描述（如果暂时无法描述，可以不写）"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 500))}
              className="min-h-[120px] resize-none"
            />
            <div className="text-sm text-gray-500 text-right">
              {content.length}/500
            </div>
          </div>

          {/* 4. 图片上传区 */}
          <div className="space-y-2">
            {/* 修改原因：显性提示“单题单图”规则，减少误操作与预期偏差。 */}
            <Label className="font-bold">上传图片（每次仅1张）</Label>
            <div className="flex flex-wrap gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
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
                    className="w-full h-full object-cover rounded-lg cursor-pointer"
                    onClick={() => setSelectedImage(image)}
                  />
                  <button
                    onClick={() => handleRemoveImage(index)}
                    disabled={isUploadingImages}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* 上传按钮 */}
              {images.length < MAX_QUESTION_IMAGES && (
                <button
                  onClick={handleImageUpload}
                  disabled={isUploadingImages}
                  className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-teal-500 hover:bg-teal-50 transition"
                >
                  <UploadSimple className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {isUploadingImages ? '上传中...' : '上传图片'}
                  </span>
                </button>
              )}
            </div>
            {isUploadingImages && uploadProgress && (
              <p className="text-xs text-teal-600">
                正在上传图片 {uploadProgress.current}/{uploadProgress.total}...
              </p>
            )}
            <p className="text-xs text-gray-500">
              每次仅上传1道题的图片；如需替换，请先删除当前图片后重新上传。
            </p>
            <div className="pt-3">
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                data-testid="create-question-submit-bottom"
                className="w-full bg-teal-500 hover:bg-teal-600"
              >
                提交
              </Button>
            </div>
          </div>

          {/* 审核提示 */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
            <p className="text-sm text-indigo-800">
              💡 AI 小贴士：准确选择 <b>知识点</b> 和 <b>做到哪一步了</b> 能让老师更快回答哦！
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
            <Button
              variant="outline"
              onClick={handleSaveDraftAndExit}
            >
              保存草稿并退出
            </Button>
            <AlertDialogAction onClick={handleDiscardAndExit}>
              确认放弃
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImageCropDialog
        open={!!pendingCropFile}
        file={pendingCropFile}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />

      <ImageCarousel
        images={images}
        // 修改原因：当前页预览源就是 images，按当前点击图片定位初始索引。
        initialIndex={Math.max(0, images.indexOf(selectedImage || ''))}
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
