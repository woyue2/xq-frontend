import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SwipeableImageCarouselProps {
    images: string[];
    onClick?: (e: React.MouseEvent) => void;
    overlay?: React.ReactNode;
}

export function SwipeableImageCarousel({ 
    images, 
    onClick, 
    overlay 
}: SwipeableImageCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isSwipe = Math.abs(distance) > 50;

        if (isSwipe) {
            if (distance > 0 && currentIndex < images.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else if (distance < 0 && currentIndex > 0) {
                setCurrentIndex(prev => prev - 1);
            }
        }
        setTouchStart(0);
        setTouchEnd(0);
    };

    const goToPrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    const goToNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentIndex < images.length - 1) setCurrentIndex(prev => prev + 1);
    };

    if (images.length === 0) return null;

    return (
        <div
            ref={containerRef}
            className="w-full aspect-square rounded-xl overflow-hidden relative group"
            onClick={onClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Overlay Element (e.g. Pin Icon) - Absolute Positioned Top-Left */}
            {overlay && (
                <div className="absolute top-2 left-2 z-10">
                    {overlay}
                </div>
            )}

            {/* Images */}
            <div
                className="flex transition-transform duration-300 ease-out h-full"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {images.map((img, idx) => (
                    <img
                        key={idx}
                        src={img}
                        alt={`图片${idx + 1}`}
                        className="w-full h-full object-cover flex-shrink-0"
                    />
                ))}
            </div>

            {/* Navigation Arrows (visible on hover for desktop) */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={goToPrev}
                        className={cn(
                            "absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white transition-opacity",
                            currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "opacity-0 group-hover:opacity-100 hover:bg-black/60"
                        )}
                        disabled={currentIndex === 0}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={goToNext}
                        className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white transition-opacity",
                            currentIndex === images.length - 1 ? "opacity-30 cursor-not-allowed" : "opacity-0 group-hover:opacity-100 hover:bg-black/60"
                        )}
                        disabled={currentIndex === images.length - 1}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </>
            )}

            {/* Dot Indicators */}
            {images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                            className={cn(
                                "w-1.5 h-1.5 rounded-full transition-all",
                                idx === currentIndex
                                    ? "bg-white w-4"
                                    : "bg-white/50 hover:bg-white/80"
                            )}
                        />
                    ))}
                </div>
            )}

            {/* Image Count */}
            {images.length > 1 && (
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                    {currentIndex + 1}/{images.length}
                </div>
            )}
        </div>
    );
}
