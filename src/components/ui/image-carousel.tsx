import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { X, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface ImageCarouselProps {
    images: string[];
    initialIndex?: number;
    open: boolean;
    onClose: () => void;
}

export function ImageCarousel({ images, initialIndex = 0, open, onClose }: ImageCarouselProps) {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
    const [selectedIndex, setSelectedIndex] = useState(initialIndex);

    useEffect(() => {
        if (emblaApi && open) {
            emblaApi.scrollTo(initialIndex, true);
            setSelectedIndex(initialIndex);
        }
    }, [emblaApi, open, initialIndex]);

    useEffect(() => {
        if (!emblaApi) return;
        const onSelect = () => {
            setSelectedIndex(emblaApi.selectedScrollSnap());
        };
        emblaApi.on('select', onSelect);
        return () => {
            emblaApi.off('select', onSelect);
        };
    }, [emblaApi]);

    const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-in fade-in duration-300">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition z-50"
            >
                <X className="w-6 h-6" />
            </button>

            <button
                onClick={scrollPrev}
                className="absolute left-4 p-3 hidden md:block text-white/50 hover:text-white transition z-50"
            >
                <CaretLeft className="w-8 h-8" />
            </button>

            <button
                onClick={scrollNext}
                className="absolute right-4 p-3 hidden md:block text-white/50 hover:text-white transition z-50"
            >
                <CaretRight className="w-8 h-8" />
            </button>

            <div className="w-full max-w-4xl overflow-hidden" ref={emblaRef}>
                <div className="flex touch-pan-y">
                    {images.map((src, index) => (
                        <div key={index} className="flex-[0_0_100%] min-w-0 flex items-center justify-center relative pl-4">
                            <img
                                src={src}
                                alt={`Slide ${index + 1}`}
                                className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
                {images.map((_, index) => (
                    <button
                        key={index}
                        className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            index === selectedIndex ? "bg-white w-4" : "bg-white/30"
                        )}
                        onClick={() => emblaApi?.scrollTo(index)}
                    />
                ))}
            </div>
        </div>
    );
}
