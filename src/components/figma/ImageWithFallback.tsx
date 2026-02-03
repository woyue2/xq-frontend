import React, { useState } from 'react';

export function ImageWithFallback(
  props: React.ImgHTMLAttributes<HTMLImageElement>
) {
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
