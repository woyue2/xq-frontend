/**
 * [POS] src/components/ImageGallery.tsx
 *   所属：components 层 | 角色：图片画廊组件（显示多张图片，支持点击放大、缩放、拖拽）
 *   兄弟：QuestionCard.tsx / QuestionFilter.tsx / QuestionList.tsx
 *
 * [INPUT]
 *   - react                          → useState
 *   - lucide-react                   → X / ChevronLeft / ChevronRight / ZoomIn / ZoomOut / Maximize2
 *   - @/components/ui/dialog         → Dialog / DialogContent
 *   - @/lib/utils                    → cn
 *
 * [OUTPUT]
 *   - ImageGallery（图片画廊组件，支持响应式设计）
 *
 * [PROTOCOL] 变更此文件时同步更新：
 *   1. 本注释头部（[INPUT]/[OUTPUT] 变化时）
 *   2. src/components/CLAUDE.md 的文件清单
 */
import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
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
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  if (!images || images.length === 0) return null;

  const displayImages = maxVisible ? images.slice(0, maxVisible) : images;
  const hasMore = maxVisible && images.length > maxVisible;

  const handleImageClick = (index: number) => {
    setCurrentIndex(index);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsOpen(true);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
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
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[98vw] max-h-[98vh] w-auto h-auto p-0 border-none bg-transparent shadow-none flex items-center justify-center"
          onKeyDown={handleKeyDown}
        >
          <div className="relative flex items-center justify-center">
            {/* Close Button - Responsive */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/90 transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Zoom Controls - Responsive */}
            <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-50 flex gap-1 sm:gap-2">
              <button
                onClick={handleZoomIn}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/90 transition-colors"
                aria-label="放大"
              >
                <ZoomIn className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                onClick={handleZoomOut}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/90 transition-colors"
                aria-label="缩小"
              >
                <ZoomOut className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                onClick={handleResetZoom}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/90 transition-colors"
                aria-label="重置"
              >
                <Maximize2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Previous Button - Responsive */}
            {images.length > 1 && (
              <button
                onClick={goToPrev}
                className="absolute left-2 sm:left-20 top-1/2 -translate-y-1/2 z-50 w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/90 transition-colors"
                aria-label="上一张"
              >
                <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
            )}

            {/* Next Button - Responsive */}
            {images.length > 1 && (
              <button
                onClick={goToNext}
                className="absolute right-2 sm:right-20 top-1/2 -translate-y-1/2 z-50 w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/90 transition-colors"
                aria-label="下一张"
              >
                <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
            )}

            {/* Image Container */}
            <div
              className="flex items-center justify-center"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
              <img
                src={images[currentIndex]}
                alt={`图片 ${currentIndex + 1}`}
                className="max-w-[92vw] max-h-[85vh] sm:max-w-[90vw] sm:max-h-[90vh] object-contain rounded-lg transition-transform select-none"
                style={{
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  transformOrigin: 'center center'
                }}
                draggable={false}
              />
            </div>

            {/* Image Counter - Responsive */}
            {images.length > 1 && (
              <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white text-sm sm:text-base px-3 py-1 sm:px-5 sm:py-2 rounded-full font-medium">
                {currentIndex + 1} / {images.length}
              </div>
            )}

            {/* Zoom Level Indicator - Responsive */}
            {scale !== 1 && (
              <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 bg-black/70 backdrop-blur-sm text-white text-sm sm:text-base px-3 py-1 sm:px-4 sm:py-2 rounded-full font-medium">
                {Math.round(scale * 100)}%
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
