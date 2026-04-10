import { Search, MapPin, SlidersHorizontal, X, GraduationCap, Sparkles, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { NEIGHBORHOODS, PROXIMITY_ZONES, Neighborhood, Listing } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { formatPrice } from '../lib/utils';

interface HeroProps {
  onFilterChange: (filters: any) => void;
  onAuthClick: () => void;
  boostedListings: Listing[];
  onViewListing: (listing: Listing) => void;
}

export default function Hero({ onFilterChange, onAuthClick, boostedListings, onViewListing }: HeroProps) {
  const [neighborhood, setNeighborhood] = useState<Neighborhood | ''>('');
  const [proximity, setProximity] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (boostedListings.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % boostedListings.length);
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [boostedListings.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % boostedListings.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + boostedListings.length) % boostedListings.length);
  };

  const handleSearch = () => {
    onFilterChange({
      neighborhood,
      proximity: proximity || undefined,
      minPrice: minPrice ? parseInt(minPrice) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
    });
  };

  const quickTags = [
    { name: 'Plateau', icon: '🏙️' },
    { name: 'Almadies', icon: '💎' },
    { name: 'Ouest Foire', icon: '🏠' },
    { name: 'Liberté 6', icon: '📍' },
    { name: 'Mermoz', icon: '🌊' }
  ];

  return (
    <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20">
      {/* Background Slider */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-slate-950" />
        <AnimatePresence mode="wait">
          {boostedListings.length > 0 ? (
            <motion.div
              key={boostedListings[currentSlide].id}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 0.5, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <img 
                src={boostedListings[currentSlide].images[0]} 
                alt={boostedListings[currentSlide].title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ duration: 2 }}
              className="absolute inset-0"
            >
              <img 
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80" 
                alt="Background" 
                className="w-full h-full object-cover scale-110"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-slate-50" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
        <div className="mb-12">
          <AnimatePresence mode="wait">
            {boostedListings.length > 0 ? (
              <motion.div
                key={`content-${boostedListings[currentSlide].id}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-600/20 backdrop-blur-md border border-brand-500/30 text-brand-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                  <Zap className="w-3 h-3 animate-pulse" />
                  Exclusivité Prestige
                </div>
                
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 leading-[0.9] tracking-tight">
                  {boostedListings[currentSlide].title.split(' ').slice(0, 2).join(' ')}<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">
                    {boostedListings[currentSlide].title.split(' ').slice(2).join(' ') || boostedListings[currentSlide].neighborhood}
                  </span>
                </h1>
                
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-12">
                  <div className="flex items-center gap-2 text-slate-300 font-bold">
                    <MapPin className="w-5 h-5 text-brand-500" />
                    {boostedListings[currentSlide].neighborhood}
                  </div>
                  <div className="text-3xl font-black text-white">
                    {formatPrice(boostedListings[currentSlide].price)}
                  </div>
                </div>

                <button 
                  onClick={() => onViewListing(boostedListings[currentSlide])}
                  className="bg-white text-slate-950 px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm hover:bg-brand-500 hover:text-white transition-all shadow-2xl shadow-white/10"
                >
                  Voir la sélection
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                  L'immobilier de prestige à Dakar
                </div>
                
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 leading-[0.9] tracking-tight">
                  Dakar<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">Prestige</span>
                </h1>
                
                <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
                  Découvrez une sélection exclusive de logements d'exception dans les plus beaux quartiers de la capitale sénégalaise.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Slider Controls */}
        {boostedListings.length > 1 && (
          <div className="absolute bottom-40 left-1/2 -translate-x-1/2 flex items-center gap-6 z-30">
            <button 
              onClick={prevSlide}
              className="p-3 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex gap-2">
              {boostedListings.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 rounded-full transition-all ${idx === currentSlide ? 'w-8 bg-brand-500' : 'w-2 bg-white/20'}`}
                />
              ))}
            </div>
            <button 
              onClick={nextSlide}
              className="p-3 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-white p-2 md:p-3 rounded-[2.5rem] shadow-2xl shadow-slate-950/20 flex flex-col md:flex-row items-stretch gap-2">
            <div className="flex-1 flex items-center gap-3 px-6 py-4 md:py-0 border-b md:border-b-0 md:border-r border-slate-100">
              <MapPin className="w-5 h-5 text-brand-600" />
              <select 
                value={neighborhood}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChange={(e) => setNeighborhood(e.target.value as Neighborhood)}
                className="w-full py-4 bg-transparent border-none outline-none text-slate-900 font-bold placeholder:text-slate-400 text-lg appearance-none cursor-pointer"
              >
                <option value="">Tous les quartiers</option>
                {NEIGHBORHOODS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2 p-2">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="hidden md:flex items-center gap-2 px-6 py-3 rounded-2xl text-slate-600 hover:bg-slate-50 font-bold transition-all"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filtres
              </button>
              
              <button 
                onClick={handleSearch}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-brand-600/20"
              >
                <Search className="w-4 h-4" />
                Rechercher
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                className="mt-4 bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-left"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">Budget Min (FCFA)</label>
                    <div className="relative">
                      <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="number" 
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        placeholder="Ex: 50 000"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">Budget Max (FCFA)</label>
                    <div className="relative">
                      <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="number" 
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        placeholder="Ex: 500 000"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">Proximité</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select 
                        value={proximity}
                        onChange={(e) => setProximity(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Toutes les zones</option>
                        {PROXIMITY_ZONES.map(z => (
                          <option key={z} value={z}>{z}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Popular Tags */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-2">Populaire :</span>
            {quickTags.map((tag) => (
              <button
                key={tag.name}
                onClick={() => {
                  setNeighborhood(tag.name as Neighborhood);
                  onFilterChange({ neighborhood: tag.name });
                }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-bold transition-all backdrop-blur-sm flex items-center gap-2"
              >
                <span>{tag.icon}</span>
                {tag.name}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
