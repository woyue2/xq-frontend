import { useState, useRef } from 'react';
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
import { mockQuestions } from '@/lib/mock-data';

interface AnswerQuestionPageProps {
  questionId: string;
  onNavigate: (page: string, data?: any) => void;
}

export function AnswerQuestionPage({ questionId, onNavigate }: AnswerQuestionPageProps) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const question = mockQuestions.find((q) => q.id === questionId);

  const handleImageUpload = () => {
    if (images.length >= 5) {
      toast.error('最多只能上传5张图片');
      return;
    }

    // 模拟图片上传
    const mockImageUrl = `https://images.unsplash.com/photo-${Date.now()}?w=400&h=300&fit=crop`;
    setImages([...images, mockImageUrl]);
    toast.success('图片上传成功');
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    setAudioUrl(null);
    
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
    
    toast.success('开始录音');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    
    // 模拟生成录音文件
    setAudioUrl(`mock-audio-${Date.now()}.mp3`);
    toast.success('录音完成');
  };

  const handleDeleteAudio = () => {
    setAudioUrl(null);
    setRecordingTime(0);
    toast.success('已删除录音');
  };

  const handlePlayAudio = () => {
    setIsPlaying(!isPlaying);
    toast.success(isPlaying ? '暂停播放' : '开始播放');
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
      onNavigate('detail', { questionId });
    }
  };

  const handleSubmit = () => {
    if (!content.trim() && images.length === 0 && !audioUrl) {
      toast.error('请至少填写文字回答、上传图片或录音');
      return;
    }

    if (content.length > 2000) {
      toast.error('回答内容不能超过2000字');
      return;
    }

    // 模拟提交审核
    toast.success('回答已提交，等待审核');
    setTimeout(() => {
      onNavigate('detail', { questionId });
    }, 1000);
  };

  const canSubmit = content.trim().length > 0 || images.length > 0 || audioUrl !== null;

  if (!question) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">问题不存在</p>
      </div>
    );
  }

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
          <h3 className="line-clamp-2">{question.title}</h3>
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
                  className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-teal-500 hover:bg-teal-50 transition"
                >
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-500">上传图片</span>
                </button>
              )}
            </div>
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
            <AlertDialogAction onClick={() => onNavigate('detail', { questionId })}>
              确认放弃
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}