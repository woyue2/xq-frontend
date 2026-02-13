import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, X, Mic, Square, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { useNavigate, useParams } from 'react-router-dom';
import type { Question } from '@/types';
import { questionService, answerService } from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';

export function AnswerQuestionPage() {
  const navigate = useNavigate();
  const { id: questionIdParam } = useParams();
  const questionId = questionIdParam ?? '';
  const { user } = useAuthStore();

  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [question, setQuestion] = useState<Question | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 修改原因：补齐图片上传过程态，避免只有结果提示、缺少等待反馈。
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  // 修改原因：显示顺序上传进度，降低用户重复点击“上传图片”的概率。
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const MAX_RECORDING_SECONDS = 60;
  // 修改原因：在进入录音流程前先做能力探测，避免用户点击后才报错。
  const getAudioCapability = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        supported: false,
        reason: '当前环境不支持录音功能'
      };
    }

    // 修改原因：移动端浏览器常要求安全上下文才能申请麦克风权限。
    // ⚠️ 不确定因素：部分 WebView 即使在 HTTPS 下也可能额外限制录音权限，需真机验证。
    if (!window.isSecureContext) {
      return {
        supported: false,
        reason: '当前页面不是安全环境（需 HTTPS 或 localhost）'
      };
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        supported: false,
        reason: '当前浏览器不支持麦克风能力'
      };
    }

    if (typeof MediaRecorder === 'undefined') {
      return {
        supported: false,
        reason: '当前浏览器不支持录音编码能力（MediaRecorder）'
      };
    }

    return { supported: true, reason: '' };
  };
  const audioCapability = getAudioCapability();

  // 基础权限校验：仅允许教师进入回答页面
  useEffect(() => {
    if (!user) {
      toast.error('请先登录');
      navigate('/login');
      return;
    }

    if (user.role !== 'teacher') {
      toast.error('只有老师可以回答问题');
      navigate(-1);
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!questionId) return;

    let cancelled = false;

    questionService
      .getQuestionById(questionId)
      .then((q) => {
        if (!cancelled && q) {
          setQuestion(q);
        }
      })
      .catch(() => {
        // 失败时保持现有 question（可能来自 mock），由下方 fallback 处理
      });

    return () => {
      cancelled = true;
    };
  }, [
    // 仅依赖 questionId，避免 setQuestion 后因 question 引用变化触发重复请求。
    questionId
  ]);

  const handleImageUpload = () => {
    if (isUploadingImages) {
      return;
    }

    if (images.length >= 5) {
      toast.error('最多只能上传5张图片');
      return;
    }
    imageInputRef.current?.click();
  };

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      event.target.value = '';
      return;
    }

    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      toast.error('最多只能上传5张图片');
      event.target.value = '';
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    try {
      setIsUploadingImages(true);
      setUploadProgress({ current: 0, total: filesToUpload.length });
      const uploaded: string[] = [];
      for (let i = 0; i < filesToUpload.length; i += 1) {
        const file = filesToUpload[i];
        // ⚠️ 不确定因素：当前按顺序上传；若后续改并发上传，此进度应切换为“完成数/总数”。
        setUploadProgress({ current: i + 1, total: filesToUpload.length });
        // eslint-disable-next-line no-await-in-loop
        const { imageUrl } = await questionService.uploadImage(file, {
          purpose: '回答问题',
          senderName: user?.nickname ?? user?.name ?? '老师',
          receiverName: question?.authorName ?? '学生'
        });
        uploaded.push(imageUrl);
      }
      if (uploaded.length > 0) {
        setImages(prev => [...prev, ...uploaded]);
        toast.success('图片上传成功');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('answer image upload failed', error);
      toast.error('图片上传失败，请稍后重试');
    } finally {
      setIsUploadingImages(false);
      setUploadProgress(null);
      event.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const handleStartRecording = async () => {
    if (isRecording) return;

    if (!audioCapability.supported) {
      // 修改原因：统一使用能力探测结论，给出更明确的失败原因。
      toast.error(audioCapability.reason);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;
      setAudioUrl(null);
      setRecordingTime(0);
      setIsRecording(true);

      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: 'audio/webm' });

          // 停止所有音轨，释放麦克风
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
          }
          mediaRecorderRef.current = null;

          if (blob.size === 0) {
            toast.error('录音失败，请重试');
            setAudioUrl(null);
            setRecordingTime(0);
            return;
          }

          toast.success('录音完成，正在上传...');
          const { audioUrl: uploadedUrl } = await questionService.uploadAudio(blob);
          setAudioUrl(uploadedUrl);
          if (audioElementRef.current) {
            audioElementRef.current.src = uploadedUrl;
          }
          toast.success('录音上传成功');
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('audio upload failed', error);
          toast.error('音频上传失败，请稍后重试');
          setAudioUrl(null);
          setRecordingTime(0);
        }
      };

      recorder.start();

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1;
          if (next >= MAX_RECORDING_SECONDS) {
            if (recordingTimerRef.current) {
              clearInterval(recordingTimerRef.current);
              recordingTimerRef.current = null;
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            return MAX_RECORDING_SECONDS;
          }
          return next;
        });
      }, 1000);

      toast.success('开始录音');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('start recording failed', error);
      toast.error('无法访问麦克风，请检查浏览器权限设置');
    }
  };

  const handleStopRecording = () => {
    if (!isRecording) return;

    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    toast.success('录音结束，正在处理中...');
  };

  const handleDeleteAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setAudioUrl(null);
    setRecordingTime(0);
    toast.success('已删除录音');
  };

  const handlePlayAudio = () => {
    if (!audioUrl || !audioElementRef.current) return;

    const el = audioElementRef.current;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      toast.success('暂停播放');
    } else {
      el
        .play()
        .then(() => {
          setIsPlaying(true);
          toast.success('开始播放');
        })
        .catch(() => {
          toast.error('无法播放音频，请稍后重试');
        });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBack = () => {
    if (content || images.length > 0 || audioUrl) {
      setShowExitDialog(true);
    } else {
      navigate(`/question/${questionId}`);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0 && !audioUrl) {
      toast.error('请至少填写文字回答、上传图片或录音');
      return;
    }

    if (content.length > 2000) {
      toast.error('回答内容不能超过2000字');
      return;
    }

    if (!questionId) {
      toast.error('问题信息缺失，无法提交回答');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await answerService.create(questionId, {
        content: content.trim() || undefined,
        images: images.length > 0 ? images : undefined,
        audioUrl: audioUrl ?? undefined
      });

      // 处理 AI 审核结果
      const aiAudit = (result as any)?.aiAudit;
      if (aiAudit && !aiAudit.safe) {
        toast.error(`回答被拒绝：${aiAudit.reason || '内容不符合规范'}`);
        setIsSubmitting(false);
        return;
      }

      toast.success('回答已提交');
      navigate(`/question/${questionId}`);
    } catch {
      toast.error('提交回答失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    !isSubmitting &&
    !isUploadingImages &&
    (content.trim().length > 0 || images.length > 0 || audioUrl !== null);

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
          <h1 className="text-xl flex-1 text-center">回答问题</h1>
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
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-6">
        {/* 问题卡片 */}
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-teal-500">
          <p className="text-sm text-gray-500 mb-2">回答以下问题：</p>
          <h3 className="line-clamp-2">
            {question?.title ?? '问题加载中...'}
          </h3>
        </div>

        {/* 回答编辑区 */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* 文字回答 */}
          <div className="space-y-2">
            <Label htmlFor="content">文字回答</Label>
            <Textarea
              id="content"
              placeholder="请输入你的回答（最多2000字）"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 2000))}
              className="min-h-[200px] resize-none"
            />
            <div className="text-sm text-gray-500 text-right">
              {content.length}/2000
            </div>
          </div>

          {/* 图片上传区 */}
          <div className="space-y-2">
            <Label>上传图片（最多5张）</Label>
            <div className="flex flex-wrap gap-3">
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
                    disabled={isUploadingImages}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* 上传按钮 */}
              {images.length < 5 && (
                <button
                  onClick={handleImageUpload}
                  disabled={isUploadingImages}
                  className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-teal-500 hover:bg-teal-50 transition"
                >
                  <Upload className="w-6 h-6 text-gray-400" />
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
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageFileChange}
            />
          </div>

          {/* 录音区 */}
          <div className="space-y-2">
            <Label>语音回答</Label>
            <div className="space-y-3">
              {!audioUrl ? (
                <div className="flex items-center gap-3">
                  {!isRecording ? (
                    <Button
                      onClick={handleStartRecording}
                      disabled={!audioCapability.supported}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Mic className="w-4 h-4" />
                      开始录音
                    </Button>
                  ) : (
                    <div className="flex items-center gap-3 flex-1">
                      <Button
                        onClick={handleStopRecording}
                        variant="destructive"
                        className="flex items-center gap-2"
                      >
                        <Square className="w-4 h-4" />
                        停止录音
                      </Button>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePlayAudio}
                      className="w-10 h-10 bg-teal-500 hover:bg-teal-600 text-white rounded-full flex items-center justify-center transition shadow-md"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <div>
                      <p className="text-sm text-teal-700">录音文件</p>
                      <p className="text-xs text-teal-600">{formatTime(recordingTime)}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDeleteAudio}
                    className="text-red-500 hover:text-red-600 text-sm"
                  >
                    删除
                  </button>
                </div>
              )}
            </div>
            {!audioCapability.supported && (
              <p className="text-xs text-amber-600">
                {/* 修改原因：在按钮旁直接展示不可用原因，减少无效点击。 */}
                当前不可录音：{audioCapability.reason}
              </p>
            )}
            <audio ref={audioElementRef} src={audioUrl ?? undefined} className="hidden" />
          </div>

          {/* 审核提示 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ 回答内容将通过AI+人工审核，违规内容将不予展示
            </p>
          </div>
        </div>
      </div>

      {/* 退出确认对话框 */}
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
