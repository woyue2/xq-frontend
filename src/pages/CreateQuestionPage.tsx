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
type UploadArea = 'question' | 'process';

// 修改原因：方案A中“题目区”限定单图，确保题干主图边界清晰。
const MAX_QUESTION_IMAGES = 1;
// 修改原因：方案A中“草稿/过程区”允许补充过程图，但限制为2张，避免输入失控。
const MAX_PROCESS_IMAGES = 2;
// 修改原因：将自动保存周期调整为 5 秒，平衡“输入安全感”和浏览器写入频率。
const DRAFT_AUTO_SAVE_INTERVAL_MS = 5_000;
// 修改原因：定期清理长期未使用草稿，降低 localStorage 持续膨胀风险。
// ⚠️ 不确定因素：当前按 7 天定义“过期”，若后续产品希望更长保留期需调整该阈值。
const DRAFT_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000;

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
  // 修改原因：按需求拆分图片语义，题目区与草稿/过程区分开管理。
  const [questionImages, setQuestionImages] = useState<string[]>([]);
  const [processImages, setProcessImages] = useState<string[]>([]);
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
  const questionFileInputRef = useRef<HTMLInputElement | null>(null);
  const processFileInputRef = useRef<HTMLInputElement | null>(null);
  // 修改原因：仅在草稿内容变化时写入，避免定时重复写同一份内容。
  const lastAutoSavedDraftRef = useRef<string>('');
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
  const previewImages = [...questionImages, ...processImages];

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
        questionImages?: string[];
        processImages?: string[];
        images?: string[];
        selectedTopic?: string;
        selectedMethod?: string;
        updatedAt?: number;
      };
      // 修改原因：读取草稿时先做过期判断，命中过期则立即清理，避免恢复陈旧内容。
      if (typeof parsed.updatedAt === 'number' && Date.now() - parsed.updatedAt > DRAFT_EXPIRE_MS) {
        window.localStorage.removeItem(draftKey);
        lastAutoSavedDraftRef.current = '';
        return;
      }
      // ⚠️ 不确定因素：历史草稿可能没有 updatedAt，当前保持可恢复以避免误删用户已有内容。
      // 修改原因：进入页面自动恢复同账号草稿，减少误退出后的重复输入。
      const restoredTitle = parsed.title ?? '';
      const restoredContent = parsed.content ?? '';
      let restoredQuestionImages: string[] = [];
      let restoredProcessImages: string[] = [];
      if (Array.isArray(parsed.questionImages) || Array.isArray(parsed.processImages)) {
        restoredQuestionImages = Array.isArray(parsed.questionImages) ? parsed.questionImages.slice(0, MAX_QUESTION_IMAGES) : [];
        restoredProcessImages = Array.isArray(parsed.processImages) ? parsed.processImages.slice(0, MAX_PROCESS_IMAGES) : [];
      } else {
        // ⚠️ 不确定因素：历史草稿仅保存 images 数组，这里按“首张题目图 + 后续过程图”回填，若历史数据语义不同需人工调整。
        const fallbackImages = Array.isArray(parsed.images) ? parsed.images : [];
        restoredQuestionImages = fallbackImages.slice(0, MAX_QUESTION_IMAGES);
        restoredProcessImages = fallbackImages.slice(MAX_QUESTION_IMAGES, MAX_QUESTION_IMAGES + MAX_PROCESS_IMAGES);
      }
      const restoredSelectedTopic = parsed.selectedTopic ?? '';
      const restoredSelectedMethod = parsed.selectedMethod ?? '';
      setTitle(restoredTitle);
      setContent(restoredContent);
      setQuestionImages(restoredQuestionImages);
      setProcessImages(restoredProcessImages);
      setSelectedTopic(restoredSelectedTopic);
      setSelectedMethod(restoredSelectedMethod);
      lastAutoSavedDraftRef.current = JSON.stringify({
        title: restoredTitle,
        content: restoredContent,
        images: [...restoredQuestionImages, ...restoredProcessImages],
        questionImages: restoredQuestionImages,
        processImages: restoredProcessImages,
        selectedTopic: restoredSelectedTopic,
        selectedMethod: restoredSelectedMethod
      });
      toast.success('已恢复上次未提交的提问草稿');
    } catch {
      // ⚠️ 不确定因素：localStorage 可能被外部手动篡改为非 JSON，这里仅做静默兜底不阻断页面。
    }
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey) return;
    const timer = window.setInterval(() => {
      // 修改原因：无输入内容时不写入草稿，避免产生无意义空草稿记录。
      const hasDraftContent =
        title.trim().length > 0 ||
        content.trim().length > 0 ||
        questionImages.length > 0 ||
        processImages.length > 0 ||
        selectedTopic.length > 0 ||
        selectedMethod.length > 0;
      if (!hasDraftContent) return;
      try {
        const draftPayload = {
          title,
          content,
          // 修改原因：自动保存与手动保存保持同一数据结构，避免恢复行为不一致。
          images: [...questionImages, ...processImages],
          questionImages,
          processImages,
          selectedTopic,
          selectedMethod
        };
        const serializedDraftPayload = JSON.stringify(draftPayload);
        if (serializedDraftPayload === lastAutoSavedDraftRef.current) {
          return;
        }
        window.localStorage.setItem(
          draftKey,
          JSON.stringify({
            ...draftPayload,
            updatedAt: Date.now()
          })
        );
        lastAutoSavedDraftRef.current = serializedDraftPayload;
      } catch {
        // 修改原因：自动保存失败时静默处理，避免定时弹错打断输入。
      }
    }, DRAFT_AUTO_SAVE_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [draftKey, title, content, questionImages, processImages, selectedTopic, selectedMethod]);

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

  const getAreaMax = (area: UploadArea) => (area === 'question' ? MAX_QUESTION_IMAGES : MAX_PROCESS_IMAGES);

  const getAreaImages = (area: UploadArea) => (area === 'question' ? questionImages : processImages);

  const handleImageUpload = (area: UploadArea) => {
    if (isUploadingImages) {
      return;
    }

    const currentImages = getAreaImages(area);
    const maxCount = getAreaMax(area);
    if (currentImages.length >= maxCount) {
      // 修改原因：分区给出准确提示，避免用户误以为另一区域也不可上传。
      toast.error(
        area === 'question'
          ? '题目区仅可上传1张图片，如需更换请先删除当前图片'
          : '草稿/过程区最多上传2张图片，如需更换请先删除已有图片'
      );
      return;
    }

    const inputRef = area === 'question' ? questionFileInputRef.current : processFileInputRef.current;
    if (!inputRef) return;
    inputRef.click();
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>, area: UploadArea) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const maxCount = getAreaMax(area);
    const currentImages = getAreaImages(area);
    if (files.length > maxCount) {
      // 修改原因：分区限制选择数量，避免一次选择过多导致用户预期偏差。
      toast.error(area === 'question' ? '题目区一次只能选择1张图片' : '草稿/过程区一次最多选择2张图片');
    }

    const remainingSlots = maxCount - currentImages.length;
    if (remainingSlots <= 0) {
      toast.error(
        area === 'question'
          ? '题目区仅可上传1张图片，如需更换请先删除当前图片'
          : '草稿/过程区最多上传2张图片，如需更换请先删除已有图片'
      );
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
        if (area === 'question') {
          setQuestionImages(prev => [...prev, ...uploadedUrls].slice(0, MAX_QUESTION_IMAGES));
        } else {
          setProcessImages(prev => [...prev, ...uploadedUrls].slice(0, MAX_PROCESS_IMAGES));
        }
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

  const handleRemoveImage = (area: UploadArea, index: number) => {
    if (area === 'question') {
      setQuestionImages(prev => prev.filter((_, i) => i !== index));
      return;
    }
    setProcessImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleBack = () => {
    if (title || content || questionImages.length > 0 || processImages.length > 0) {
      setShowExitDialog(true);
    } else {
      navigate('/');
    }
  };

  const saveDraft = () => {
    if (!draftKey) return;
    try {
      const draftPayload = {
        title,
        content,
        // 修改原因：保留旧字段以兼容历史草稿读取逻辑。
        images: [...questionImages, ...processImages],
        questionImages,
        processImages,
        selectedTopic,
        selectedMethod
      };
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({
          ...draftPayload,
          updatedAt: Date.now()
        })
      );
      // 修改原因：手动保存后同步快照，避免自动保存重复写入相同内容。
      lastAutoSavedDraftRef.current = JSON.stringify(draftPayload);
    } catch {
      // ⚠️ 不确定因素：Safari 隐私模式或存储空间不足时 setItem 可能失败，此处仅提示用户。
      toast.error('草稿保存失败，请检查浏览器存储权限');
    }
  };

  const clearDraft = () => {
    if (!draftKey) return;
    try {
      window.localStorage.removeItem(draftKey);
      lastAutoSavedDraftRef.current = '';
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
      // 修改原因：方案A前后端不改接口，按约定顺序合并为单一 images 字段提交（题目图在前，过程图在后）。
      const mergedImages = [...questionImages, ...processImages];
      const payload = {
        title,
        content,
        // 修改原因：即使未来页面上出现异常状态，也确保请求体中的 subject 固定为 math。
        subject: selectedSubject,
        tags: [selectedTopic, selectedMethod].filter(Boolean),
        images: mergedImages
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
            <Label className="font-bold">图片上传</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 rounded-lg border border-gray-100 p-3">
                {/* 修改原因：按需求明确“题目区”用途，降低误传过程图的概率。 */}
                <p className="text-sm font-semibold text-gray-700">题目区（最多1张）</p>
                <p className="text-xs text-gray-500">用于上传题干主图，建议仅保留完整题目内容。</p>
                <input
                  ref={questionFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleImageChange(event, 'question')}
                  className="hidden"
                  data-testid="create-question-image-input"
                />
                <div className="flex flex-wrap gap-3">
                  {questionImages.map((image, index) => (
                    <div key={`question-${index}`} className="relative w-24 h-24">
                      <img
                        src={image}
                        alt={`题目图${index + 1}`}
                        className="w-full h-full object-cover rounded-lg cursor-pointer"
                        onClick={() => setSelectedImage(image)}
                      />
                      <button
                        onClick={() => handleRemoveImage('question', index)}
                        disabled={isUploadingImages}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {questionImages.length < MAX_QUESTION_IMAGES && (
                    <button
                      onClick={() => handleImageUpload('question')}
                      disabled={isUploadingImages}
                      className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-teal-500 hover:bg-teal-50 transition"
                    >
                      <UploadSimple className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {isUploadingImages ? '上传中...' : '上传题目图'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-gray-100 p-3">
                {/* 修改原因：按需求新增“草稿/过程区”，支持上传解题过程辅助图片。 */}
                <p className="text-sm font-semibold text-gray-700">草稿/过程区（最多2张）</p>
                <p className="text-xs text-gray-500">用于上传草稿纸或中间步骤，帮助老师理解你的思路。</p>
                <input
                  ref={processFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => void handleImageChange(event, 'process')}
                  className="hidden"
                  data-testid="create-question-process-image-input"
                />
                <div className="flex flex-wrap gap-3">
                  {processImages.map((image, index) => (
                    <div key={`process-${index}`} className="relative w-24 h-24">
                      <img
                        src={image}
                        alt={`过程图${index + 1}`}
                        className="w-full h-full object-cover rounded-lg cursor-pointer"
                        onClick={() => setSelectedImage(image)}
                      />
                      <button
                        onClick={() => handleRemoveImage('process', index)}
                        disabled={isUploadingImages}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {processImages.length < MAX_PROCESS_IMAGES && (
                    <button
                      onClick={() => handleImageUpload('process')}
                      disabled={isUploadingImages}
                      className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-teal-500 hover:bg-teal-50 transition"
                    >
                      <UploadSimple className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {isUploadingImages ? '上传中...' : '上传过程图'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            {isUploadingImages && uploadProgress && (
              <p className="text-xs text-teal-600">
                正在上传图片 {uploadProgress.current}/{uploadProgress.total}...
              </p>
            )}
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
        images={previewImages}
        // 修改原因：预览源改为“题目区+过程区”合并集合，保持点击后定位正确。
        initialIndex={Math.max(0, previewImages.indexOf(selectedImage || ''))}
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
