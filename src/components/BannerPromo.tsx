import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { PromoCode, UserProfile } from '../types';
import { motion } from 'motion/react';
import { Tag } from 'lucide-react';

interface BannerPromoProps {
  userProfile: UserProfile | null;
}

export default function BannerPromo({ userProfile }: BannerPromoProps) {
  const [activePromo, setActivePromo] = useState<PromoCode | null>(null);

  useEffect(() => {
    if (!userProfile || (userProfile.role !== 'courtier' && userProfile.role !== 'aide_courtier')) {
      setActivePromo(null);
      return;
    }

    const q = query(
      collection(db, 'promo_codes'),
      where('estActif', '==', true),
      where('afficherBarreDefilante', '==', true),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as PromoCode;
        // Check expiration
        const now = new Date();
        const expiration = data.dateExpiration?.toDate ? data.dateExpiration.toDate() : new Date(data.dateExpiration);
        if (expiration > now) {
          setActivePromo(data);
        } else {
          setActivePromo(null);
        }
      } else {
        setActivePromo(null);
      }
    }, (error) => {
      console.error("BannerPromo Snapshot Error:", error);
    });

    return () => unsubscribe();
  }, [userProfile]);

  if (!activePromo) return null;

  return (
    <div className="bg-blue-600 text-white py-2 overflow-hidden relative z-[60]">
      <motion.div
        animate={{ x: [0, -1000] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="flex whitespace-nowrap items-center gap-8"
      >
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Tag className="w-4 h-4" />
            <span className="font-black uppercase tracking-widest text-[10px] sm:text-xs">
              OFFRE PRO : Utilisez le code <span className="text-yellow-300">{activePromo.codeName}</span> pour bénéficier de -{activePromo.reduction}{activePromo.reductionType === 'percent' ? '%' : ' FCFA'} sur vos boosts !
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
