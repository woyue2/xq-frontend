/**
 * [POS] src/components/ImageGallery.tsx
 *   所属：components 层 | 角色：图片画廊组件（显示多张图片，支持点击放大）
 *   兄弟：QuestionCard.tsx / QuestionFilter.tsx / QuestionList.tsx
 *
 * [INPUT]
 *   - react                          → useState
 *   - lucide-react                   → X / ChevronLeft / ChevronRight
 *   - @/components/ui/dialog         → Dialog / DialogContent
 *   - @/lib/utils                    → cn
 *
 * [OUTPUT]
 *   - ImageGallery（图片画廊组件）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/components/CLAUDE.md 的文件清单
 */
import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface ImageGalleryProps {
  images: string[];
  maxVisible?: number;
  className?: string;
}

export function ImageGallery({ images, maxVisible, className }: ImageGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const displayImages = maxVisible ? images.slice(0, maxVisible) : images;
  const hasMore = maxVisible && images.length > maxVisible;

  const handleImageClick = (index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrev();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') setIsOpen(false);
  };

  return (
    <>
      {/* Gallery Grid */}
      <div className={cn('grid gap-2', className)}>
        {displayImages.length === 1 && (
          <div
            onClick={() => handleImageClick(0)}
            className="relative w-full aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
          >
            <img
              src={displayImages[0]}
              alt="图片 1"
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}

        {displayImages.length === 2 && (
          <div className="grid grid-cols-2 gap-2">
            {displayImages.map((img, idx) => (
              <div
                key={idx}
                onClick={() => handleImageClick(idx)}
                className="relative w-full aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              >
                <img
                  src={img}
                  alt={`图片 ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ))}
          </div>
        )}

        {displayImages.length >= 3 && (
          <div className="grid grid-cols-3 gap-2">
            {displayImages.map((img, idx) => (
              <div
                key={idx}
                onClick={() => handleImageClick(idx)}
                className="relative w-full aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              >
                <img
                  src={img}
                  alt={`图片 ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                {hasMore && idx === displayImages.length - 1 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-lg font-semibold">
                      +{images.length - maxVisible!}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 border-none bg-transparent shadow-none"
          onKeyDown={handleKeyDown}
        >
          <div className="relative flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Previous Button */}
            {images.length > 1 && (
              <button
                onClick={goToPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                aria-label="上一张"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Next Button */}
            {images.length > 1 && (
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                aria-label="下一张"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Image */}
            <img
              src={images[currentIndex]}
              alt={`图片 ${currentIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />

            {/* Image Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full font-medium">
                {currentIndex + 1} / {images.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
