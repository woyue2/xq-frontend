/**
 * [POS] src/components/ImageUploader.tsx
 *   所属：components 层 | 角色：图片上传组件（支持多图上传、客户端验证、进度显示和预览）
 *   兄弟：ImageGallery.tsx / QuestionCard.tsx / QuestionFilter.tsx
 *
 * [INPUT]
 *   - react                          → useState / useRef
 *   - lucide-react                   → Upload / X / ImageIcon
 *   - @/components/ui/button         → Button
 *   - @/components/ui/progress       → Progress
 *   - @/lib/utils                    → cn
 *
 * [OUTPUT]
 *   - ImageUploader（图片上传组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/components/CLAUDE.md 的文件清单
 */
import { useState, useRef } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface ImageUploaderProps {
  maxCount?: number;
  value?: string[];
  onChange?: (urls: string[]) => void;
  disabled?: boolean;
  className?: string;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  url?: string;
  error?: string;
}

const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB - allow larger files for compression
const MAX_COMPRESSED_SIZE = 2.8 * 1024 * 1024; // 2.8MB target (留出余量给 OSS)

export function ImageUploader({
  maxCount = 3,
  value = [],
  onChange,
  disabled = false,
  className
}: ImageUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAddMore = value.length + uploadingFiles.length < maxCount;

  // 验证文件格式
  const validateFileFormat = (file: File): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    return ALLOWED_FORMATS.includes(ext);
  };

  // 验证文件大小
  const validateFileSize = (file: File): boolean => {
    return file.size <= MAX_FILE_SIZE;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    return (bytes / (1024 * 1024)).toFixed(2) + 'MB';
  };

  // 压缩图片
  const compressImage = async (file: File): Promise<File> => {
    // GIF 不压缩（会丢失动画）
    if (file.type === 'image/gif') {
      return file;
    }

    // 如果文件已经小于目标大小，不压缩
    if (file.size <= MAX_COMPRESSED_SIZE) {
      return file;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 根据文件大小动态调整目标尺寸
          let maxDimension = 2560; // 提高默认分辨率以保持清晰度
          if (file.size > 8 * 1024 * 1024) {
            maxDimension = 2048; // 8MB+ → 2048px
          } else if (file.size > 5 * 1024 * 1024) {
            maxDimension = 2304; // 5-8MB → 2304px
          }

          // 如果图片太大，先缩小尺寸
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法创建 canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // 尝试不同的质量级别，直到文件大小合适
          let quality = 0.90; // 提高初始质量
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('压缩失败'));
                  return;
                }

                // 如果压缩后仍然太大，降低质量再试
                if (blob.size > MAX_COMPRESSED_SIZE && quality > 0.5) {
                  quality -= 0.05; // 更小的质量步进以保持更好的质量
                  tryCompress();
                  return;
                }

                // 如果质量已经很低但仍然太大，进一步缩小尺寸
                if (blob.size > MAX_COMPRESSED_SIZE && quality <= 0.5) {
                  canvas.width = Math.floor(canvas.width * 0.85); // 更温和的缩小比例
                  canvas.height = Math.floor(canvas.height * 0.85);
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  quality = 0.8; // 重置质量
                  tryCompress();
                  return;
                }

                // 创建新的 File 对象
                const compressedFile = new File([blob], file.name, {
                  type: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
                  lastModified: Date.now()
                });

                resolve(compressedFile);
              },
              file.type === 'image/png' ? 'image/png' : 'image/jpeg',
              quality
            );
          };

          tryCompress();
        };

        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  };

  // 上传单个文件
  const uploadFile = async (file: File): Promise<string> => {
    // 先压缩图片
    const fileToUpload = await compressImage(file);

    const formData = new FormData();
    formData.append('file', fileToUpload);

    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('需要登录');
    }

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '上传失败');
    }

    const data = await response.json();
    return data.url;
  };

  // 处理文件选择
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    const availableSlots = maxCount - value.length - uploadingFiles.length;
    const filesToUpload = filesArray.slice(0, availableSlots);

    // 验证文件
    const validFiles: File[] = [];
    for (const file of filesToUpload) {
      if (!validateFileFormat(file)) {
        alert(`文件 "${file.name}" 格式不支持，仅支持 ${ALLOWED_FORMATS.join(', ')} 格式`);
        continue;
      }
      if (!validateFileSize(file)) {
        alert(`文件 "${file.name}" 大小超过限制（${formatFileSize(file.size)}），单张图片不能超过 10MB`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // 创建上传任务
    const newUploadingFiles: UploadingFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // 开始上传
    for (const uploadingFile of newUploadingFiles) {
      try {
        // 模拟进度更新
        const progressInterval = setInterval(() => {
          setUploadingFiles(prev =>
            prev.map(f =>
              f.id === uploadingFile.id && f.progress < 90
                ? { ...f, progress: f.progress + 10 }
                : f
            )
          );
        }, 200);

        const url = await uploadFile(uploadingFile.file);

        clearInterval(progressInterval);

        // 上传成功
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id
              ? { ...f, progress: 100, url }
              : f
          )
        );

        // 添加到已上传列表
        const newUrls = [...value, url];
        onChange?.(newUrls);

        // 移除上传任务
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id));
        }, 500);

      } catch (error: any) {
        // 上传失败
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id
              ? { ...f, error: error.message || '上传失败' }
              : f
          )
        );
      }
    }

    // 清空 input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 删除已上传的图片
  const handleRemove = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index);
    onChange?.(newUrls);
  };

  // 重试上传失败的文件
  const handleRetry = (uploadingFile: UploadingFile) => {
    setUploadingFiles(prev =>
      prev.map(f =>
        f.id === uploadingFile.id
          ? { ...f, error: undefined, progress: 0 }
          : f
      )
    );

    // 重新上传
    handleFileSelect(new DataTransfer().files);
    const dt = new DataTransfer();
    dt.items.add(uploadingFile.file);
    handleFileSelect(dt.files);
  };

  // 取消上传
  const handleCancelUpload = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* 已上传的图片预览 */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {value.map((url, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group"
            >
              <img
                src={url}
                alt={`图片 ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <button
                  onClick={() => handleRemove(index)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="删除"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 正在上传的文件 */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map(uploadingFile => (
            <div
              key={uploadingFile.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/50"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded bg-muted flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {uploadingFile.file.name}
                </p>
                {uploadingFile.error ? (
                  <p className="text-xs text-destructive mt-1">
                    {uploadingFile.error}
                  </p>
                ) : (
                  <Progress value={uploadingFile.progress} className="mt-2 h-1" />
                )}
              </div>
              {uploadingFile.error ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRetry(uploadingFile)}
                >
                  重试
                </Button>
              ) : (
                <button
                  onClick={() => handleCancelUpload(uploadingFile.id)}
                  className="flex-shrink-0 w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="取消"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 上传按钮 */}
      {canAddMore && !disabled && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_FORMATS.map(f => `.${f}`).join(',')}
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <Upload className="w-4 h-4" />
            上传图片
            <span className="text-xs text-muted-foreground ml-2">
              ({value.length}/{maxCount})
            </span>
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            支持 {ALLOWED_FORMATS.join(', ')} 格式，单张不超过 10MB（自动压缩），最多 {maxCount} 张
          </p>
        </div>
      )}
    </div>
  );
}
