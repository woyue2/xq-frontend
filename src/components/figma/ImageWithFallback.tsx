import React, { useState } from 'react';

const UPLOAD_PROXY_HOSTS = new Set(['s3.bmp.ovh', 'imgurl.org', 'www.imgurl.org']);

const resolveImageSrc = (rawSrc?: string) => {
  if (!rawSrc) {
    return rawSrc;
  }

  const trimmed = rawSrc.trim();
  if (!trimmed) {
    return trimmed;
  }

  // 修改原因：本地静态资源、data/blob URL 保持原样，避免不必要代理影响现有逻辑。
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/api/upload/image-proxy?url=')
  ) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      return trimmed;
    }

    if (!UPLOAD_PROXY_HOSTS.has(parsed.hostname.toLowerCase())) {
      return trimmed;
    }

    // 修改原因：图床地址改为后端代理读取，降低浏览器直连第三方图床时的 HTTP2 抖动风险。
    return `/api/upload/image-proxy?url=${encodeURIComponent(parsed.toString())}`;
  } catch {
    // ⚠️ 不确定因素：若 src 不是合法 URL（但浏览器可容错加载），这里将保持原地址直连。
    return trimmed;
  }
};

export function ImageWithFallback(
  props: React.ImgHTMLAttributes<HTMLImageElement>
) {
  const [didError, setDidError] = useState(false);
  const { src, alt, style, className, ...rest } = props;
  const resolvedSrc = resolveImageSrc(typeof src === 'string' ? src : undefined);

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
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={style}
      onError={() => {
        // eslint-disable-next-line no-console
        console.error('[ImageWithFallback] load error, src =', resolvedSrc, 'raw =', src);
        setDidError(true);
      }}
      {...rest}
    />
  );
}
