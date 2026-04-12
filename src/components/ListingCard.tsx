import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Home, MessageCircle, Heart, Eye, Video, Rocket, ShieldCheck, Clock, Zap, Star, CheckCircle2, Share2, Award, Search, Sparkles } from 'lucide-react';
import { Listing, UserProfile } from '../types';
import { getWhatsAppLink } from '../lib/utils';
import { useCurrency } from '../lib/currency';
import { db } from '../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

interface ListingCardProps {
  listing: Listing;
  key?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onClick?: (listing: Listing) => void;
  onTransfer?: (listing: Listing) => void;
  userProfile?: UserProfile | null;
}

export default function ListingCard({ listing, isFavorite, onToggleFavorite, onClick, onTransfer, userProfile }: ListingCardProps) {
  const { formatPrice } = useCurrency();
  const [isHovered, setIsHovered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isNew = isMounted && listing.createdAt && (new Date().getTime() - (listing.createdAt.toDate ? listing.createdAt.toDate().getTime() : new Date(listing.createdAt).getTime())) < 7 * 24 * 60 * 60 * 1000;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(listing)}
      className="group relative bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50 transition-all duration-500 hover:shadow-2xl hover:shadow-brand-100/50 hover:-translate-y-2 cursor-pointer"
    >
      {/* Media Section */}
      <div className="relative aspect-[4/5] overflow-hidden">
        <AnimatePresence mode="wait">
          {isHovered && listing.videos && listing.videos.length > 0 ? (
            <motion.div
              key="video"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10"
            >
              <video
                ref={videoRef}
                src={listing.videos[0]}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4 z-20 bg-brand-600/90 backdrop-blur-md text-white p-2.5 rounded-2xl shadow-lg border border-white/20">
                <Video className="w-4 h-4" />
              </div>
            </motion.div>
          ) : (
            <motion.img
              key="image"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={listing.images[0] || `https://picsum.photos/seed/${listing.id}/800/1000`}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
        
        {/* Badges */}
        <div className="absolute top-5 left-5 z-20 flex flex-col gap-2">
          <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            {listing.type}
          </div>
          {isNew && (
            <div className="bg-brand-600 px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-brand-600/20">
              <Star className="w-3 h-3 fill-white" />
              Nouveau
            </div>
          )}
          {listing.status === 'Loué' && (
            <div className="bg-slate-900 px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Loué
            </div>
          )}
          {listing.isBoosted && listing.status !== 'Loué' && (
            <div className="bg-amber-500 px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-amber-500/20">
              <Zap className="w-3 h-3 fill-white" />
              Boosté
            </div>
          )}
          {listing.isAgentCertified && (
            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-amber-500/20">
              <Award className="w-3 h-3" />
              Agent certifié
            </div>
          )}
          {listing.isVerified && (
            <div className="bg-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-emerald-600/20">
              <ShieldCheck className="w-3 h-3" />
              Vérifié
            </div>
          )}
          {listing.isVisitedByTeam && (
            <div className="bg-emerald-500 px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
              <Search className="w-3 h-3" />
              Visité par l'équipe
            </div>
          )}
          {listing.isExclusive && (
            <div className="bg-blue-600 px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-blue-600/20">
              <Sparkles className="w-3 h-3" />
              Exclusivité
            </div>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(listing.id);
          }}
          className={`absolute top-5 right-5 p-2.5 rounded-xl backdrop-blur-md transition-all duration-300 z-20 ${
            isFavorite 
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
              : 'bg-white/20 text-white hover:bg-white hover:text-red-500'
          }`}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Price Overlay */}
        <div className="absolute bottom-6 left-6 right-6 z-20">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] mb-1">À partir de</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white tracking-tight">
                  {formatPrice(listing.price)}
                </span>
                <span className="text-slate-300 text-xs font-bold uppercase tracking-widest">/ mois</span>
              </div>
            </div>
            {listing.commissionAideCourtier > 0 && (
              <div className="bg-brand-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-brand-500/20">
                <Zap className="w-3 h-3 fill-white" />
                +{formatPrice(listing.commissionAideCourtier)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-black text-slate-900 mb-1 group-hover:text-brand-600 transition-colors uppercase tracking-tight line-clamp-1">
              {listing.title}
            </h3>
            <div className="flex items-center gap-1.5 text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-brand-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider">{listing.neighborhood}</span>
              <span className="text-slate-200">•</span>
              <span className="text-[11px] font-bold uppercase tracking-wider">{listing.proximity}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
          <div className="flex flex-col items-center gap-1">
            <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
              <Home className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Chambres</span>
            <span className="text-xs font-black text-slate-900">{listing.bedrooms}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
              <Eye className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">S. de Bain</span>
            <span className="text-xs font-black text-slate-900">{listing.bathrooms}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vérifié</span>
            <span className="text-xs font-black text-slate-900">{listing.isVerified ? 'Oui' : 'Non'}</span>
          </div>
        </div>

        {/* Agent Info */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('navigate', { 
                  detail: { view: 'public-profile', brokerId: listing.courtierId } 
                }));
              }}
              className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center text-brand-600 font-black text-xs cursor-pointer hover:bg-brand-200 transition-colors overflow-hidden"
            >
              {listing.courtierPhoto ? (
                <img src={listing.courtierPhoto} alt={listing.courtierName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                listing.courtierName?.charAt(0) || 'C'
              )}
            </div>
            <div 
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('navigate', { 
                  detail: { view: 'public-profile', brokerId: listing.courtierId } 
                }));
              }}
              className="cursor-pointer group/broker"
            >
              <p className="text-[10px] font-black text-slate-900 leading-none mb-0.5 group-hover/broker:text-brand-600 transition-colors">{listing.courtierName}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Courtier Certifié</p>
            </div>
          </div>
          <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-600 transition-all">
            Détails
          </button>
        </div>

        {/* Aide-Courtier WhatsApp Share Button */}
        {userProfile?.role === 'aide_courtier' && (
          <div className="mt-4">
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const shareUrl = `${window.location.origin}/?listing=${listing.id}&ref=${userProfile.uid}`;
                const message = `Salut ! Regarde ce ${listing.type} à ${listing.neighborhood} pour seulement ${listing.price.toLocaleString()} FCFA sur Dakar Prestige. Vidéo et détails ici : ${shareUrl}`;
                
                // Track click
                try {
                  await updateDoc(doc(db, 'users', userProfile.uid), {
                    affiliateClicks: increment(1)
                  });
                } catch (error) {
                  console.error("Error tracking share click:", error);
                }

                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              Partager sur WhatsApp
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (onTransfer) {
                  onTransfer(listing);
                }
              }}
              className="w-full mt-2 bg-slate-900 hover:bg-black text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <Rocket className="w-4 h-4" />
              Transférer au Courtier
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
