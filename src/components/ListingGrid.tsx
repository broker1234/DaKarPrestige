import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Listing, UserProfile } from '../types';
import ListingCard from './ListingCard';

interface ListingGridProps {
  listings: Listing[];
  loading: boolean;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onViewListing: (listing: Listing) => void;
  title?: string;
  layout?: 'grid' | 'scroll';
  userProfile?: UserProfile | null;
  autoScroll?: boolean;
}

export default function ListingGrid({ 
  listings, 
  loading, 
  isFavorite, 
  onToggleFavorite, 
  onViewListing,
  title,
  layout = 'grid',
  userProfile,
  autoScroll = false
}: ListingGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (layout === 'scroll' && autoScroll && listings.length > 4 && scrollRef.current) {
      const container = scrollRef.current;
      let scrollInterval: NodeJS.Timeout;

      const startScrolling = () => {
        scrollInterval = setInterval(() => {
          if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
            container.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            container.scrollBy({ left: 300, behavior: 'smooth' });
          }
        }, 4000);
      };

      startScrolling();

      const handleMouseEnter = () => clearInterval(scrollInterval);
      const handleMouseLeave = () => startScrolling();

      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        clearInterval(scrollInterval);
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [layout, autoScroll, listings.length]);

  if (loading) {
    return (
      <div className="space-y-6">
        {title && <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />}
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
              <div className="aspect-[4/5] bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">🏠</span>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune annonce trouvée</h3>
        <p className="text-gray-500">Essayez de modifier vos filtres de recherche.</p>
      </div>
    );
  }

  const gridClasses = layout === 'scroll' 
    ? "flex overflow-x-auto pb-6 gap-6 snap-x no-scrollbar" 
    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8";

  return (
    <div className="space-y-6 mb-12">
      {title && (
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span className="w-2 h-8 bg-brand-500 rounded-full" />
            {title}
          </h2>
          {layout === 'scroll' && (
            <button className="text-brand-600 font-black text-sm hover:underline">
              Voir tout
            </button>
          )}
        </div>
      )}
      
      <div 
        ref={scrollRef}
        className={gridClasses}
      >
        <AnimatePresence mode="popLayout">
          {listings.map((listing) => (
            <div 
              key={listing.id} 
              className={layout === 'scroll' ? "min-w-[280px] md:min-w-[320px] snap-start" : ""}
            >
              <ListingCard 
                listing={listing} 
                isFavorite={isFavorite(listing.id)}
                onToggleFavorite={onToggleFavorite}
                onClick={onViewListing}
                userProfile={userProfile}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
