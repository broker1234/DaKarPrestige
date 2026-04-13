import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Home, MessageCircle, Phone, Share2, Heart, Trash2, Info, Sparkles, CheckCircle2, GraduationCap, Users, Send, ShieldCheck, Clock, Star, User, Zap, Facebook, Copy, Check, Edit2, Rocket } from 'lucide-react';
import { Listing, ColocationMessage, Review, UserProfile } from '../types';
import { getWhatsAppLink } from '../lib/utils';
import { closeListing } from '../lib/notifications';
import MediaSlider from './MediaSlider';
import FinancialBreakdown from './FinancialBreakdown';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, limit, doc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useCurrency } from '../lib/currency';

interface ListingDetailModalProps {
  key?: string;
  listing: Listing | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  isOwner?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (listing: Listing) => void;
  userProfile: UserProfile | null;
}

export default function ListingDetailModal({ listing, isOpen, onClose, isFavorite, onToggleFavorite, isOwner, onDelete, onEdit, userProfile }: ListingDetailModalProps) {
  const [colocMessages, setColocMessages] = useState<ColocationMessage[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [refProfile, setRefProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refId = params.get('ref');
    if (refId) {
      const fetchRefProfile = async () => {
        try {
          const docRef = doc(db, 'users', refId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setRefProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
          }
        } catch (error) {
          console.error("Error fetching ref profile:", error);
        }
      };
      fetchRefProfile();
    }
  }, []);

  const handleCloseListing = async () => {
    if (!listing) return;
    if (!confirm("Voulez-vous vraiment marquer cette annonce comme LOUÉE ? Cela informera tous les aide-courtiers.")) return;
    
    setIsClosing(true);
    try {
      await closeListing(listing.id, listing);
      onClose();
    } catch (error) {
      console.error("Error closing listing:", error);
    } finally {
      setIsClosing(false);
    }
  };
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    if (!listing || !isOpen) return;

    // Fetch Colocation Messages
    const colocQ = query(
      collection(db, 'listings', listing.id, 'colocation_messages'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeColoc = onSnapshot(colocQ, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ColocationMessage[];
      setColocMessages(messages);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.GET, `listings/${listing.id}/colocation_messages`);
    });

    // Fetch Broker Reviews
    const reviewsQ = query(
      collection(db, 'reviews'),
      where('courtierId', '==', listing.courtierId),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribeReviews = onSnapshot(reviewsQ, (snapshot) => {
      const fetchedReviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];
      setReviews(fetchedReviews);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.GET, 'reviews');
    });

    return () => {
      unsubscribeColoc();
      unsubscribeReviews();
    };
  }, [listing, isOpen]);

  if (!listing) return null;

  const whatsappLink = getWhatsAppLink(
    refProfile?.phone || listing.whatsapp,
    refProfile 
      ? `Bonjour, je suis intéressé par l'annonce "${listing.title}" sur Dakar Prestige. Pouvez-vous m'aider pour la visite ?`
      : `Bonjour, je suis intéressé par votre annonce "${listing.title}" à ${listing.neighborhood} (${formatPrice(listing.price)}).`
  );

  const handleShare = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?ref=${auth.currentUser?.uid || ''}&listing=${listing.id}`;
    if (navigator.share) {
      navigator.share({
        title: listing.title,
        text: `Regardez cette annonce sur Dakar Immo: ${listing.title} à ${listing.neighborhood}`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      setShowShareSuccess(true);
      setTimeout(() => setShowShareSuccess(false), 2000);
    }
  };

  const shareOnWhatsApp = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?ref=${auth.currentUser?.uid || ''}&listing=${listing.id}`;
    const text = `Regardez cette annonce sur Dakar Immo: ${listing.title} à ${listing.neighborhood}\n\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareOnFacebook = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?ref=${auth.currentUser?.uid || ''}&listing=${listing.id}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const handleSendColocMessage = async () => {
    if (!auth.currentUser || !newMessage.trim()) return;

    setIsSubmitting(true);
    const path = `listings/${listing.id}/colocation_messages`;
    try {
      await addDoc(collection(db, 'listings', listing.id, 'colocation_messages'), {
        listingId: listing.id,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Utilisateur',
        message: newMessage.trim(),
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReview = async () => {
    if (!auth.currentUser || !newReview.comment.trim()) return;

    setIsSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        courtierId: listing.courtierId,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Utilisateur',
        rating: newReview.rating,
        comment: newReview.comment.trim(),
        createdAt: serverTimestamp(),
      });
      setNewReview({ rating: 5, comment: '' });
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.CREATE, 'reviews');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4">
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      
      <motion.div
        key="modal-content"
        initial={{ opacity: 0, scale: 0.95, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 40 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative bg-white w-full h-full sm:h-[90vh] sm:max-w-6xl sm:rounded-[3rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] flex flex-col md:flex-row"
      >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 z-[60] p-3 bg-white/90 hover:bg-white text-slate-900 rounded-2xl shadow-xl transition-all hover:scale-110 active:scale-95 group"
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
            </button>

            {/* Media Section */}
            <div className="w-full md:w-[55%] h-[40vh] md:h-auto bg-slate-100 relative overflow-hidden">
              <MediaSlider images={listing.images} videos={listing.videos || []} />
              
              <div className="absolute bottom-8 left-8 flex gap-3 z-20">
                <button 
                  onClick={() => onToggleFavorite(listing.id)}
                  className={`p-4 rounded-2xl backdrop-blur-xl transition-all shadow-2xl hover:scale-110 active:scale-95 ${isFavorite ? 'bg-red-500 text-white shadow-red-500/40' : 'bg-white/90 text-slate-700 hover:bg-white'}`}
                >
                  <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
                <button 
                  onClick={handleShare}
                  className="p-4 bg-white/90 text-slate-700 rounded-2xl backdrop-blur-xl hover:bg-white transition-all shadow-2xl hover:scale-110 active:scale-95"
                >
                  <Share2 className="w-6 h-6" />
                </button>
              </div>

              {/* Gradient Overlay for better readability of bottom buttons if needed */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            </div>

            {/* Content Section */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
              <div className="p-8 md:p-12">
                <div className="mb-10">
                  <div className="flex flex-wrap gap-2.5 mb-6">
                    {listing.status === 'Loué' && (
                      <span className="bg-slate-900 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-xl shadow-slate-900/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Loué
                      </span>
                    )}
                    <span className="bg-brand-50 text-brand-600 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-brand-100 shadow-sm">
                      {listing.type}
                    </span>
                    {listing.isVerified && (
                      <span className="bg-emerald-50 text-emerald-600 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 border border-emerald-100 shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Vérifié
                      </span>
                    )}
                    {listing.visitFee !== undefined && listing.visitFee > 0 && (
                      <span className="bg-orange-50 text-orange-600 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 border border-orange-100 shadow-sm">
                        <Sparkles className="w-3.5 h-3.5" />
                        Visite: {formatPrice(listing.visitFee)}
                      </span>
                    )}
                  </div>
                  
                  <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-[1.05] tracking-tight">{listing.title}</h2>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-6 rounded-[2.5rem] bg-slate-50 border border-slate-100">
                    <div className="flex flex-col">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Prix de location</p>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-3xl md:text-4xl font-black text-brand-600 tracking-tighter break-all">
                          {formatPrice(listing.price)} 
                        </span>
                        <span className="text-sm font-black text-slate-400 uppercase tracking-widest">
                          {listing.stayType === 'Location Courte Durée' ? ' / jour' : ' / mois'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
                  {[
                    { icon: MapPin, label: 'Quartier', value: listing.neighborhood, color: 'text-brand-500', bg: 'bg-brand-50' },
                    { icon: Home, label: 'Type', value: listing.type, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { icon: Users, label: 'Chambres', value: listing.bedrooms || 1, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { icon: Star, label: 'SDB', value: listing.bathrooms || 1, color: 'text-orange-500', bg: 'bg-orange-50' }
                  ].map((item, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                      <div className={`p-3 rounded-2xl ${item.bg} ${item.color} mb-4 group-hover:scale-110 transition-transform inline-block`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">{item.label}</p>
                      <p className="font-black text-slate-900 text-sm truncate">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Financial Breakdown Section */}
                <div className="mb-12">
                  <h4 className="font-black text-slate-900 mb-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em]">
                    <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                      <Zap className="w-4 h-4" />
                    </div>
                    Budget d'emménagement
                  </h4>
                  <FinancialBreakdown rent={listing.price} />
                </div>

                {/* Agent Section */}
                <div className="mb-12 p-8 rounded-[3rem] bg-slate-900 text-white relative overflow-hidden group">
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl group-hover:bg-brand-500/30 transition-colors" />
                  
                  <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
                    <div 
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('navigate', { 
                          detail: { view: 'public-profile', brokerId: listing.courtierId } 
                        }));
                        onClose();
                      }}
                      className="w-24 h-24 rounded-[2rem] bg-white/10 p-1 border border-white/20 relative cursor-pointer group/avatar overflow-hidden"
                    >
                      {listing.courtierPhoto ? (
                        <img src={listing.courtierPhoto} alt={listing.courtierName} className="w-full h-full object-cover rounded-[1.8rem] group-hover/avatar:scale-110 transition-transform" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-brand-500 rounded-[1.8rem] text-2xl font-black">
                          {listing.courtierName?.charAt(0) || 'A'}
                        </div>
                      )}
                      <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-1.5 rounded-xl border-4 border-slate-900 z-10">
                        <ShieldCheck className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    
                    <div 
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('navigate', { 
                          detail: { view: 'public-profile', brokerId: listing.courtierId } 
                        }));
                        onClose();
                      }}
                      className="flex-1 text-center sm:text-left cursor-pointer group/agent"
                    >
                      <p className="text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] mb-2">Agent Immobilier</p>
                      <h4 className="text-2xl font-black mb-2 group-hover/agent:text-brand-500 transition-colors">{listing.courtierName || 'Agent Dakar Prestige'}</h4>
                      <div className="flex items-center justify-center sm:justify-start gap-4">
                        <div className="flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="font-black text-sm">4.9</span>
                          <span className="text-slate-400 text-xs font-bold">(12 avis)</span>
                        </div>
                        <div className="w-1 h-1 bg-slate-700 rounded-full" />
                        <span className="text-slate-400 text-xs font-bold">Vérifié</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <a
                        href={`tel:${refProfile?.phone || listing.whatsapp}`}
                        className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-black text-sm hover:bg-brand-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Phone className="w-4 h-4" />
                        Appeler
                      </a>
                    </div>
                  </div>
                </div>

                {/* Description Section */}
                <div className="mb-12">
                  <h4 className="font-black text-slate-900 mb-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em]">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <Info className="w-4 h-4" />
                    </div>
                    Description du bien
                  </h4>
                  <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100">
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                      {listing.description || "Aucune description fournie."}
                    </p>
                  </div>
                </div>

                {/* Proximity & Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                  {listing.proximity && listing.proximity.length > 0 && (
                    <div>
                      <h4 className="font-black text-slate-900 mb-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em]">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        Proximité
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {listing.proximity.map(zone => (
                          <span key={zone} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-2xl text-xs font-black border border-slate-200 shadow-sm">
                            {zone}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {listing.tags && listing.tags.length > 0 && (
                    <div>
                      <h4 className="font-black text-slate-900 mb-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em]">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        Équipements
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {listing.tags.map(tag => (
                          <div key={tag} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            {tag}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Map Section */}
                <div className="mb-12">
                  <h4 className="font-black text-slate-900 mb-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em]">
                    <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                      <MapPin className="w-4 h-4" />
                    </div>
                    Localisation
                  </h4>
                  <div className="w-full aspect-video rounded-[3rem] overflow-hidden border-8 border-slate-50 shadow-inner bg-slate-100 relative group">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://maps.google.com/maps?q=${listing.lat || 14.7167},${listing.lng || -17.4677}&z=15&output=embed`}
                      allowFullScreen
                      className="grayscale-[0.2] contrast-[1.1] group-hover:grayscale-0 transition-all duration-700"
                    ></iframe>
                  </div>
                  <p className="mt-4 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] text-center">
                    Zone approximative du bien immobilier
                  </p>
                </div>

                {/* Colocation Section */}
                <div className="mb-12 p-8 rounded-[3rem] bg-brand-50/50 border border-brand-100">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-brand-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm uppercase tracking-[0.2em]">Colocation</h4>
                        <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Messages publics</p>
                      </div>
                    </div>
                    <span className="bg-brand-100 text-brand-600 px-3 py-1 rounded-full text-[10px] font-black">
                      {colocMessages.length}
                    </span>
                  </div>

                  {auth.currentUser ? (
                    <div className="flex gap-3 mb-8">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Laissez un message..."
                        className="flex-1 bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-sm"
                      />
                      <button
                        onClick={handleSendColocMessage}
                        disabled={isSubmitting || !newMessage.trim()}
                        className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white p-4 rounded-2xl transition-all shadow-xl shadow-brand-600/20 hover:scale-110 active:scale-95"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white/50 p-6 rounded-2xl border border-brand-100 text-center mb-8">
                      <p className="text-xs text-brand-600 font-black uppercase tracking-widest">Connectez-vous pour participer</p>
                    </div>
                  )}

                  <div className="space-y-4 max-h-80 overflow-y-auto pr-4 custom-scrollbar">
                    {colocMessages.map((msg) => (
                      <div key={msg.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                              <User className="w-3 h-3" />
                            </div>
                            <span className="font-black text-xs text-slate-900">{msg.userName}</span>
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleDateString('fr-FR') : 'À l\'instant'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">{msg.message}</p>
                      </div>
                    ))}
                    {colocMessages.length === 0 && (
                      <div className="text-center py-12 bg-white/30 rounded-[2rem] border border-dashed border-brand-200">
                        <MessageCircle className="w-10 h-10 text-brand-200 mx-auto mb-4" />
                        <p className="text-xs text-brand-400 font-black uppercase tracking-widest">Aucun message pour le moment</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reviews Section */}
                <div className="mb-12">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-500 border border-yellow-100">
                        <Star className="w-5 h-5 fill-current" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm uppercase tracking-[0.2em]">Avis Clients</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expériences vérifiées</p>
                      </div>
                    </div>
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black">
                      {reviews.length} avis
                    </span>
                  </div>

                  {auth.currentUser && auth.currentUser.uid !== listing.courtierId && (
                    <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 mb-8">
                      <div className="flex items-center gap-3 mb-6">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setNewReview({ ...newReview, rating: star })}
                            className="focus:outline-none hover:scale-125 transition-transform"
                          >
                            <Star className={`w-8 h-8 ${star <= newReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={newReview.comment}
                        onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                        placeholder="Partagez votre expérience avec cet agent..."
                        className="w-full bg-white border border-slate-200 rounded-[2rem] px-8 py-6 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all resize-none mb-6 shadow-sm"
                        rows={3}
                      />
                      <button
                        onClick={handleSendReview}
                        disabled={isSubmittingReview || !newReview.comment.trim()}
                        className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 text-white py-5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20"
                      >
                        {isSubmittingReview ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Publier mon avis
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-black text-xs text-slate-900">{review.userName}</p>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star key={star} className={`w-2.5 h-2.5 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString('fr-FR') : 'Récemment'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium italic leading-relaxed">"{review.comment}"</p>
                      </div>
                    ))}
                    {reviews.length === 0 && (
                      <div className="col-span-full text-center py-12 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                        <Star className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                        <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Aucun avis pour le moment</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sticky Action Bar for Mobile */}
                <div className="md:hidden fixed bottom-6 left-6 right-6 z-50 flex gap-3">
                  <a
                    href={listing.status === 'Loué' ? '#' : whatsappLink}
                    target={listing.status === 'Loué' ? '_self' : '_blank'}
                    rel="noopener noreferrer"
                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all shadow-2xl ${
                      listing.status === 'Loué' 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'bg-emerald-500 text-white shadow-emerald-500/40'
                    }`}
                  >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                  </a>
                  <button
                    onClick={() => window.open(`tel:${listing.whatsapp}`)}
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-900 text-white font-black text-sm transition-all shadow-2xl shadow-slate-900/40"
                  >
                    <Phone className="w-5 h-5" />
                    Appeler
                  </button>
                </div>

                <div className="flex flex-col gap-4 pt-12 border-t border-slate-100 pb-24 md:pb-0">
                  {userProfile?.role === 'aide_courtier' && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-[3rem] p-8 border border-amber-100 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                            <Rocket className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-black text-amber-900 text-sm uppercase tracking-[0.2em]">Partager & Gagner</h4>
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Programme Affiliation</p>
                          </div>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-2xl border border-amber-200 shadow-sm">
                          <span className="text-xs font-black text-amber-900">{formatPrice(listing.commissionAideCourtier || 0)}</span>
                          <span className="text-[9px] font-black text-amber-400 uppercase ml-1">/ Vente</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { icon: MessageCircle, label: 'WhatsApp', color: 'text-emerald-500', onClick: shareOnWhatsApp },
                          { icon: Facebook, label: 'Facebook', color: 'text-blue-600', onClick: shareOnFacebook },
                          { icon: showShareSuccess ? Check : Copy, label: showShareSuccess ? 'Copié !' : 'Lien', color: 'text-slate-600', onClick: handleShare }
                        ].map((btn, i) => (
                          <button
                            key={i}
                            onClick={btn.onClick}
                            className="flex flex-col items-center gap-3 p-5 bg-white rounded-[2rem] border border-amber-100 hover:border-amber-300 hover:shadow-xl hover:-translate-y-1 transition-all group"
                          >
                            <btn.icon className={`w-6 h-6 ${btn.color} group-hover:scale-110 transition-transform`} />
                            <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest">{btn.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <a
                      href={listing.status === 'Loué' ? '#' : whatsappLink}
                      target={listing.status === 'Loué' ? '_self' : '_blank'}
                      rel="noopener noreferrer"
                      className={`flex items-center justify-center gap-3 py-6 rounded-[2rem] font-black text-lg transition-all shadow-2xl ${
                        listing.status === 'Loué' 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200' 
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 hover:scale-[1.02] active:scale-95'
                      }`}
                      onClick={(e) => listing.status === 'Loué' && e.preventDefault()}
                    >
                      <MessageCircle className="w-6 h-6" />
                      {listing.status === 'Loué' ? 'Logement Loué' : 'Contacter WhatsApp'}
                    </a>

                    <button
                      onClick={() => window.open(`tel:${refProfile?.phone || listing.whatsapp}`)}
                      className="flex items-center justify-center gap-3 py-6 rounded-[2rem] bg-slate-900 hover:bg-black text-white font-black text-lg transition-all shadow-2xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95"
                    >
                      <Phone className="w-6 h-6" />
                      Appeler {refProfile ? 'l\'aide-courtier' : 'l\'agent'}
                    </button>
                  </div>
                  
                  {isOwner && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                      <button
                        onClick={() => {
                          if (onEdit && listing) {
                            onEdit(listing);
                            onClose();
                          }
                        }}
                        className="flex items-center justify-center gap-3 bg-blue-50 text-blue-600 hover:bg-blue-100 py-5 rounded-[2rem] font-black text-sm transition-all border border-blue-100"
                      >
                        <Edit2 className="w-5 h-5" />
                        Modifier
                      </button>
                      {listing.status !== 'Loué' && (
                        <button
                          onClick={handleCloseListing}
                          disabled={isClosing}
                          className="flex items-center justify-center gap-3 bg-amber-50 text-amber-600 hover:bg-amber-100 py-5 rounded-[2rem] font-black text-sm transition-all border border-amber-100"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          {isClosing ? '...' : 'Marquer Loué'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (onDelete) {
                            onDelete(listing.id);
                            onClose();
                          }
                        }}
                        className="flex items-center justify-center gap-3 bg-red-50 text-red-600 hover:bg-red-100 py-5 rounded-[2rem] font-black text-sm transition-all border border-red-100"
                      >
                        <Trash2 className="w-5 h-5" />
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
    </div>
  );
}
