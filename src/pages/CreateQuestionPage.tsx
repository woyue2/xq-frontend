import { useState } from 'react';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
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
} from '@/app/components/ui/alert-dialog';

interface CreateQuestionPageProps {
  onNavigate: (page: string) => void;
}

export function CreateQuestionPage({ onNavigate }: CreateQuestionPageProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const handleImageUpload = () => {
    if (images.length >= 3) {
      toast.error('最多只能上传3张图片');
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

  const handleBack = () => {
    if (title || content || images.length > 0) {
      setShowExitDialog(true);
    } else {
      onNavigate('home');
    }
  };

  const handleSubmit = () => {
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

    // 模拟提交审核
    toast.success('问题已提交，等待审核');
    setTimeout(() => {
      onNavigate('home');
    }, 1000);
  };

  const canSubmit = title.trim().length > 0;

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
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* 问题标题 */}
          <div className="space-y-2">
            <Label htmlFor="title">
              问题标题 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="title"
              placeholder="请输入问题标题（必填，最多100字）"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              className="min-h-[80px] resize-none"
            />
            <div className="text-sm text-gray-500 text-right">
              {title.length}/100
            </div>
          </div>

          {/* 问题详情 */}
          <div className="space-y-2">
            <Label htmlFor="content">问题详情（可选）</Label>
            <Textarea
              id="content"
              placeholder="请输入问题详情（可选，最多500字）"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 500))}
              className="min-h-[120px] resize-none"
            />
            <div className="text-sm text-gray-500 text-right">
              {content.length}/500
            </div>
          </div>

          {/* 图片上传区 */}
          <div className="space-y-2">
            <Label>上传图片（最多3张）</Label>
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ 问题及图片将通过AI+人工审核，违规内容将不予展示
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
            <AlertDialogAction onClick={() => onNavigate('home')}>
              确认放弃
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}