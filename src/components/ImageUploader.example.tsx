/**
 * [POS] src/components/ImageUploader.example.tsx
 *   所属：components 层 | 角色：ImageUploader 组件使用示例
 *
 * [INPUT]
 *   - react                          → useState
 *   - @/components/ImageUploader     → ImageUploader
 *
 * [OUTPUT]
 *   - ImageUploaderExample（示例组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/components/CLAUDE.md 的文件清单
 */
import { useState } from 'react';
import { ImageUploader } from './ImageUploader';

export function ImageUploaderExample() {
  const [images, setImages] = useState<string[]>([]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">ImageUploader 组件示例</h2>
        <p className="text-muted-foreground mb-6">
          支持多图上传（最多 3 张），客户端验证格式和大小，显示上传进度和预览
        </p>
      </div>

      {/* 基本用法 */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">基本用法</h3>
        <ImageUploader
          value={images}
          onChange={setImages}
        />
      </div>

      {/* 当前值 */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">当前上传的图片 URL</h3>
        <div className="p-4 rounded-lg bg-muted">
          {images.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无图片</p>
          ) : (
            <ul className="space-y-1">
              {images.map((url, index) => (
                <li key={index} className="text-sm font-mono break-all">
                  {index + 1}. {url}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 自定义最大数量 */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">自定义最大数量（最多 1 张）</h3>
        <ImageUploader
          maxCount={1}
          value={images.slice(0, 1)}
          onChange={(urls) => setImages([...urls, ...images.slice(1)])}
        />
      </div>

      {/* 禁用状态 */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">禁用状态</h3>
        <ImageUploader
          value={images}
          onChange={setImages}
          disabled
        />
      </div>
    </div>
  );
}
