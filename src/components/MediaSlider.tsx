import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Video } from 'lucide-react';
import { motion } from 'motion/react';

interface MediaSliderProps {
  images: string[];
  videos: string[];
}

export default function MediaSlider({ images, videos }: MediaSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const allMedia = [
    ...videos.map(v => ({ type: 'video' as const, url: v })),
    ...images.map(i => ({ type: 'image' as const, url: i }))
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (allMedia.length === 0) return null;

  return (
    <div className="relative group w-full h-full bg-gray-100">
      <div 
        ref={scrollRef}
        className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-none"
      >
        {allMedia.map((media, index) => (
          <div 
            key={index}
            className="flex-none w-full h-full snap-center relative"
          >
            {media.type === 'video' ? (
              <video 
                src={media.url} 
                controls 
                className="w-full h-full object-cover"
              />
            ) : (
              <img 
                src={media.url} 
                alt={`Media ${index}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
            
            {media.type === 'video' && (
              <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-xl pointer-events-none">
                <Video className="w-3 h-3" />
                Vidéo
              </div>
            )}

            <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">
              {index + 1} / {allMedia.length}
            </div>
          </div>
        ))}
      </div>

      {allMedia.length > 1 && (
        <>
          <button 
            onClick={() => scroll('left')}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hidden md:block"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={() => scroll('right')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hidden md:block"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
    </div>
  );
}
