import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { Listing } from '../types';
import { formatPrice } from '../lib/utils';

const BANNERS = [
  {
    id: 1,
    title: "Dakar Prestige Tech Week",
    subtitle: "Découvrez les logements les plus connectés de la capitale",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80",
    color: "from-brand-600 to-indigo-600",
    cta: "Voir la sélection"
  },
  {
    id: 2,
    title: "Offre Spéciale Étudiants",
    subtitle: "Des colocations vérifiées à proximité des universités",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80",
    color: "from-amber-500 to-orange-600",
    cta: "Trouver ma chambre"
  },
  {
    id: 3,
    title: "Devenez Aide-Courtier",
    subtitle: "Partagez des annonces et gagnez jusqu'à 50.000 FCFA par vente",
    image: "https://images.unsplash.com/photo-1556742049-02e456ca210c?auto=format&fit=crop&w=1600&q=80",
    color: "from-emerald-500 to-teal-600",
    cta: "S'inscrire maintenant"
  }
];

interface PromoBannerProps {
  boostedListings: Listing[];
  onViewListing: (listing: Listing) => void;
}

export default function PromoBanner({ boostedListings, onViewListing }: PromoBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const displayBanners = boostedListings.length > 0 
    ? boostedListings.map((l, idx) => ({
        id: l.id,
        title: l.title,
        subtitle: `${l.neighborhood} • ${formatPrice(l.price)}`,
        image: l.images[0],
        cta: "Voir l'offre",
        isListing: true,
        listing: l
      }))
    : BANNERS;

  useEffect(() => {
    // Reset index if it becomes out of bounds due to displayBanners changing
    if (currentIndex >= displayBanners.length) {
      setCurrentIndex(0);
    }

    if (displayBanners.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % displayBanners.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [displayBanners.length, currentIndex]);

  const next = () => setCurrentIndex((prev) => (prev + 1) % displayBanners.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + displayBanners.length) % displayBanners.length);

  const currentBanner = displayBanners[currentIndex] || displayBanners[0];

  if (!currentBanner) return null;

  return (
    <div className="relative w-full h-[250px] md:h-[450px] overflow-hidden rounded-[2rem] mb-8 group">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10" />
          <img
            src={currentBanner.image}
            alt={currentBanner.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          
          <div className="absolute inset-0 z-20 flex flex-col justify-center px-8 md:px-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mb-2"
            >
              <div className="px-3 py-1 rounded-full bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-brand-500/20">
                <Zap className="w-3 h-3 fill-current" />
                Exclusivité
              </div>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl md:text-5xl font-black text-white mb-2 md:mb-4 max-w-2xl leading-tight"
            >
              {currentBanner.title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-white/80 text-sm md:text-xl font-medium mb-4 md:mb-8 max-w-xl"
            >
              {currentBanner.subtitle}
            </motion.p>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if ('isListing' in currentBanner && currentBanner.isListing) {
                  onViewListing(currentBanner.listing);
                }
              }}
              className="w-fit px-6 md:px-10 py-3 md:py-4 rounded-2xl bg-white text-slate-900 font-black text-sm md:text-base shadow-xl hover:bg-brand-500 hover:text-white transition-all"
            >
              {currentBanner.cta}
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {displayBanners.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 md:p-4 rounded-full bg-white/10 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 md:p-4 rounded-full bg-white/10 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Indicators */}
      {displayBanners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
          {displayBanners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 md:w-8 h-1.5 md:h-2 rounded-full transition-all ${
                index === currentIndex ? 'bg-white w-6 md:w-12' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
