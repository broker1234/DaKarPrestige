import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Rocket, MessageCircle, Star, ShieldCheck, MapPin, ArrowRight, Lock, UserPlus } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Listing, UserProfile } from '../types';
import ListingCard from './ListingCard';
import { useCurrency } from '../lib/currency';

interface MissionsUrgentesProps {
  onViewListing: (listing: Listing) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  userProfile: UserProfile | null;
  onAuthClick: () => void;
}

export default function MissionsUrgentes({ onViewListing, isFavorite, onToggleFavorite, userProfile, onAuthClick }: MissionsUrgentesProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    const q = query(
      collection(db, 'listings'),
      where('allowCollaboration', '==', true),
      orderBy('commissionAideCourtier', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Listing[];
      setListings(fetched);
      setLoading(false);
    }, (error) => {
      console.error("MissionsUrgentes Snapshot Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Banner */}
      <div className="relative h-[40vh] md:h-[50vh] overflow-hidden bg-slate-900 flex items-center justify-center">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80" 
            className="w-full h-full object-cover opacity-40"
            alt="Missions Urgentes"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] mb-6 shadow-xl shadow-brand-600/20"
          >
            <Zap className="w-4 h-4 fill-white" />
            Opportunités Premium
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-7xl font-black text-white mb-6 tracking-tight leading-none"
          >
            🔥 Missions <span className="text-brand-500">Urgentes</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-300 text-lg md:text-xl font-medium max-w-2xl mx-auto"
          >
            Gagnez des commissions élevées en trouvant des clients pour ces biens exclusifs. 
            Plus la commission est haute, plus la mission est prioritaire.
          </motion.p>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 -mt-20 relative z-20 pb-20">
        {!userProfile ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[3rem] p-12 text-center shadow-2xl border border-slate-100 max-w-2xl mx-auto"
          >
            <div className="w-20 h-20 bg-brand-50 rounded-[2rem] flex items-center justify-center text-brand-600 mx-auto mb-8">
              <Lock className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4">Accès Réservé</h2>
            <p className="text-slate-500 font-medium mb-10 leading-relaxed">
              Inscrivez-vous ou connectez-vous pour voir les montants des commissions et commencer à gagner de l'argent avec Dakar Prestige.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onAuthClick}
                className="bg-brand-600 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-600/20 hover:bg-brand-700 transition-all flex items-center justify-center gap-3"
              >
                <UserPlus className="w-5 h-5" />
                S'inscrire maintenant
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-[2rem] h-[500px] animate-pulse border border-slate-100" />
              ))
            ) : listings.length > 0 ? (
              listings.map((listing) => (
                <div key={listing.id} className="relative group">
                  {/* High Commission Badge */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-2xl shadow-xl shadow-amber-500/20 flex flex-col items-center">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 leading-none mb-1">Commission</span>
                    <span className="text-lg font-black leading-none">{formatPrice(listing.commissionAideCourtier || 0)}</span>
                  </div>

                  <ListingCard 
                    listing={listing}
                    isFavorite={isFavorite(listing.id)}
                    onToggleFavorite={onToggleFavorite}
                    onClick={onViewListing}
                    userProfile={userProfile}
                  />

                  <div className="mt-4 px-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const shareUrl = `${window.location.origin}/?listing=${listing.id}&ref=${userProfile.uid}`;
                        const message = `🔥 MISSION URGENTE : ${listing.title} à ${listing.neighborhood}.\n\nRegardez les détails et la vidéo ici : ${shareUrl}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                      }}
                      className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95"
                    >
                      <Rocket className="w-4 h-4 text-brand-500" />
                      Prendre la mission
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                <Rocket className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                <h3 className="text-2xl font-black text-slate-900 mb-2">Aucune mission urgente</h3>
                <p className="text-slate-400 font-medium">Revenez plus tard pour de nouvelles opportunités.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
