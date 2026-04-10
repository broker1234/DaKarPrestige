import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Listing, UserProfile } from '../types';
import ListingCard from './ListingCard';
import { ShieldCheck, MessageCircle, Share2, MapPin, Star, Award, CheckCircle2, Phone, ArrowLeft, ExternalLink } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { getWhatsAppLink } from '../lib/utils';

interface PublicProfilePageProps {
  brokerId: string;
  onBack: () => void;
  onViewListing: (listing: Listing) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  currentUserProfile: UserProfile | null;
}

export default function PublicProfilePage({ 
  brokerId, 
  onBack, 
  onViewListing, 
  isFavorite, 
  onToggleFavorite,
  currentUserProfile
}: PublicProfilePageProps) {
  const [broker, setBroker] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShareSuccess, setShowShareSuccess] = useState(false);

  const isPremium = broker?.plan === 'Prestige' || broker?.plan === 'Agence';
  const isAgency = broker?.plan === 'Agence';

  useEffect(() => {
    if (!brokerId) return;

    const fetchBroker = async () => {
      try {
        const brokerDoc = await getDoc(doc(db, 'users', brokerId));
        if (brokerDoc.exists()) {
          setBroker(brokerDoc.data() as UserProfile);
        }
      } catch (error) {
        handleFirestoreError(auth, error, OperationType.GET, `users/${brokerId}`);
      }
    };

    fetchBroker();

    const q = query(
      collection(db, 'listings'),
      where('courtierId', '==', brokerId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Listing[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'listings');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [brokerId]);

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/?profile=${brokerId}`;
    if (navigator.share) {
      navigator.share({
        title: `Profil de ${broker?.displayName || 'Courtier'} - Dakar Prestige`,
        text: `Découvrez les annonces immobilières de ${broker?.displayName || 'ce courtier'} sur Dakar Prestige.`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      setShowShareSuccess(true);
      setTimeout(() => setShowShareSuccess(false), 2000);
    }
  };

  const whatsappLink = broker?.phone ? getWhatsAppLink(
    broker.phone,
    `Bonjour ${broker.displayName}, j'ai vu votre profil sur Dakar Prestige et je souhaiterais en savoir plus sur vos annonces.`
  ) : '#';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!broker) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-black text-slate-900 mb-4">Profil introuvable</h2>
        <button 
          onClick={onBack}
          className="bg-brand-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header Banner */}
      <div className={`relative h-48 md:h-64 overflow-hidden ${isPremium ? 'bg-slate-900' : 'bg-slate-200'}`}>
        {isPremium && broker?.coverImage ? (
          <img src={broker.coverImage} className="w-full h-full object-cover" alt="Cover" referrerPolicy="no-referrer" />
        ) : isPremium ? (
          <div className="absolute inset-0 bg-gradient-to-r from-brand-600/20 to-blue-600/20" />
        ) : null}
        
        {isPremium && <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />}
        
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 z-20 p-3 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white rounded-2xl transition-all flex items-center gap-2 font-bold text-sm"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        <button 
          onClick={handleShare}
          className="absolute top-6 right-6 z-20 p-3 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white rounded-2xl transition-all flex items-center gap-2 font-bold text-sm"
        >
          <Share2 className="w-5 h-5" />
          {showShareSuccess ? 'Lien copié !' : 'Partager'}
        </button>
      </div>

      {/* Profile Info Card */}
      <div className="max-w-5xl mx-auto px-4 -mt-24 relative z-10">
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 p-8 md:p-12 border border-slate-100">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
            <div className="relative">
              <div className={`w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] p-1.5 border-4 border-white shadow-xl overflow-hidden ${isPremium ? 'bg-slate-100' : 'bg-white'}`}>
                {isAgency && broker?.agencyLogo ? (
                  <img src={broker.agencyLogo} alt="Agency Logo" className="w-full h-full object-contain rounded-[2rem]" referrerPolicy="no-referrer" />
                ) : broker.photoURL ? (
                  <img src={broker.photoURL} alt={broker.displayName || ''} className="w-full h-full object-cover rounded-[2rem]" referrerPolicy="no-referrer" />
                ) : broker.displayName ? (
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(broker.displayName)}&background=${isPremium ? '0284c7' : 'cbd5e1'}&color=fff&size=256`} 
                    alt={broker.displayName}
                    className="w-full h-full object-cover rounded-[2rem]"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-white text-4xl font-black rounded-[2rem] ${isPremium ? 'bg-brand-600' : 'bg-slate-400'}`}>
                    {broker.email?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {isPremium && (
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-2xl border-4 border-white shadow-lg">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                  {isAgency ? (broker.displayName || 'Agence Immobilière') : (broker.displayName || 'Courtier Dakar Prestige')}
                </h1>
                {isAgency && (
                  <span className="bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    Agence Certifiée Gold
                  </span>
                )}
                {!isAgency && isPremium && (
                  <span className="bg-brand-50 text-brand-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-100">
                    Agent Certifié
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-slate-500 font-bold text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-500" />
                  Dakar, Sénégal
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  4.9 (12 avis vérifiés)
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  {listings.length} Annonces actives
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full md:w-auto">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                Contacter sur WhatsApp
              </a>
              {broker.phone && (
                <a
                  href={`tel:${broker.phone}`}
                  className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Phone className="w-5 h-5" />
                  Appeler l'agent
                </a>
              )}
            </div>
          </div>

          <div className="mt-12 pt-12 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Award className="w-4 h-4 text-brand-500" />
                  {isAgency ? 'À propos de notre agence' : 'À propos de cet agent'}
                </h3>
                <p className="text-slate-600 leading-relaxed font-medium">
                  {isPremium && broker?.agencyDescription ? broker.agencyDescription : (
                    "Professionnel de l'immobilier certifié par Dakar Prestige. Spécialiste du secteur de Dakar avec une expertise reconnue dans la location et la vente de biens haut de gamme. Engagé à fournir un service transparent et efficace pour tous vos besoins en logement."
                  )}
                </p>
              </div>
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Statistiques</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-600">Taux de réponse</span>
                    <span className="text-sm font-black text-emerald-600">98%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-600">Temps de réponse</span>
                    <span className="text-sm font-black text-slate-900">&lt; 15 min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-600">Membre depuis</span>
                    <span className="text-sm font-black text-slate-900">2024</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Listings Section */}
      <div className="max-w-7xl mx-auto px-4 mt-20">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Annonces de {broker.displayName?.split(' ')[0] || 'l\'agent'}</h2>
            <p className="text-slate-500 text-sm font-bold">Découvrez tous les biens actuellement disponibles</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm text-sm font-black text-brand-600">
            {listings.length} Biens
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {listings.map((listing) => (
            <ListingCard 
              key={listing.id}
              listing={listing}
              isFavorite={isFavorite(listing.id)}
              onToggleFavorite={onToggleFavorite}
              onClick={onViewListing}
              userProfile={currentUserProfile}
            />
          ))}
        </div>

        {listings.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Aucune annonce active</h3>
            <p className="text-slate-500 font-medium">Cet agent n'a pas d'annonces publiées pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
