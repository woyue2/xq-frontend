/**
 * [POS] src/components/figma/ImageWithFallback.tsx
 *   所属：components/figma 层 | 角色：带 fallback 的图片组件（Figma 导出基础组件）
 *   兄弟：（figma 目录内唯一文件）
 *
 * [INPUT]
 *   - react  → React / useState
 *
 * [OUTPUT]
 *   - ImageWithFallback（图片组件，继承 img 全部 props）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/components/CLAUDE.md 的文件清单
 */
import React, { useState } from 'react';

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false);
  const { src, alt, style, className, ...rest } = props;

  if (didError) {
    return (
      <div
        className={`inline-flex items-center justify-center bg-gray-100 text-gray-400 text-xs ${className ?? ''}`}
        style={style}
        data-original-url={src}
      >
        图片加载失败
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => {
        // eslint-disable-next-line no-console
        console.error('[ImageWithFallback] load error, src =', src);
        setDidError(true);
      }}
      {...rest}
    />
  );
}
