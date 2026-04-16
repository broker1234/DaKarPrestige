import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Zap, Package, ExternalLink, CheckCircle2, MessageCircle, Info, X, DollarSign, Rocket, Timer, Star, Building2, CreditCard, Wallet, Loader2, Plus, ArrowRight, ShieldAlert, Tag } from 'lucide-react';
import { useCurrency } from '../lib/currency';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot, updateDoc, arrayUnion, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { UserProfile, Listing, Transaction, PromoCode } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { safeDispatchEvent } from '../lib/utils';

interface ServiceOffer {
  id: string;
  title: string;
  price: number;
  duration: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  color: string;
  type: "Badge VÉRIFIÉ" | "BOOST Semaine" | "BOOST Mois" | "PACK Agence" | "Pack Découverte" | "Boost Flash 24h";
  isPopular?: boolean;
  discountedPrice?: number;
  discountLabel?: string;
  specialOffer?: string;
}

const OFFERS: ServiceOffer[] = [
  {
    id: 'discovery',
    title: 'Pack Découverte',
    price: 0,
    duration: '15 jours',
    description: 'Testez la puissance de Dakar Prestige sans frais.',
    features: [
      '2 annonces simples',
      'Photos uniquement (pas de vidéo)',
      'Validité 15 jours',
      'Support standard'
    ],
    icon: <Rocket className="w-8 h-8" />,
    color: 'from-slate-400 to-slate-600',
    type: "Pack Découverte"
  },
  {
    id: 'boost-flash',
    title: 'Boost Flash 24h',
    price: 1000,
    duration: '24 heures',
    description: 'Une visibilité fulgurante pour vos urgences absolues.',
    features: [
      'Haut de liste prioritaire',
      'Visibilité maximale 24h',
      'Idéal pour location urgente',
      'Activation instantanée'
    ],
    icon: <Timer className="w-8 h-8" />,
    color: 'from-red-400 to-rose-600',
    type: "Boost Flash 24h"
  },
  {
    id: 'verified',
    title: 'Badge VÉRIFIÉ',
    price: 5000,
    duration: '6 mois',
    description: 'Rassurez vos clients étrangers et étudiants avec un profil certifié.',
    features: [
      'Badge bleu sur toutes vos annonces',
      'Priorité dans les résultats de recherche',
      'Confiance accrue des expatriés',
      'Support prioritaire'
    ],
    icon: <ShieldCheck className="w-8 h-8" />,
    color: 'from-blue-500 to-blue-700',
    type: "Badge VÉRIFIÉ"
  },
  {
    id: 'boost-week',
    title: 'BOOST Semaine',
    price: 2500,
    duration: '7 jours',
    description: 'Propulsez votre annonce en tête de liste pour une visibilité maximale.',
    features: [
      'Haut de liste pendant 7 jours',
      'Mise en avant visuelle',
      'Statistiques de vues doublées',
      'Vente plus rapide'
    ],
    icon: <Zap className="w-8 h-8" />,
    color: 'from-amber-400 to-orange-600',
    type: "BOOST Semaine"
  },
  {
    id: 'boost-month',
    title: 'BOOST Mois',
    price: 7500,
    duration: '30 jours',
    description: 'La solution idéale pour louer vos biens les plus prestigieux rapidement.',
    features: [
      'Haut de liste pendant 30 jours',
      'Badge "Premium" exclusif',
      'Visibilité maximale garantie',
      'Économisez 25% vs Boost Semaine'
    ],
    icon: <Star className="w-8 h-8" />,
    color: 'from-purple-500 to-indigo-700',
    type: "BOOST Mois",
    isPopular: true
  },
  {
    id: 'pack-agency',
    title: 'PACK Agence',
    price: 15000,
    duration: 'Par mois',
    description: 'Le pack ultime pour les agences immobilières et courtiers actifs.',
    features: [
      'Annonces illimitées',
      '3 Boosts inclus par mois',
      'Badge VÉRIFIÉ inclus',
      'Gestionnaire de compte dédié'
    ],
    icon: <Building2 className="w-8 h-8" />,
    color: 'from-emerald-500 to-teal-700',
    type: "PACK Agence",
    specialOffer: "Offre Spéciale : 40 000 FCFA pour 3 mois (5 000 FCFA offerts)"
  }
];

const WAVE_PAYMENT_LINK = "https://pay.wave.com/m/M_sn_wXlszdyVZOIV/c/sn/";

const BOOST_OPTIONS = [
  { id: 'flash', label: 'Boost Flash (1 jour)', duration: 1, price: 1000 },
  { id: '3days', label: 'Boost 3 jours', duration: 3, price: 2000 },
  { id: 'week', label: 'Boost Semaine (7 jours)', duration: 7, price: 2500 },
  { id: 'month', label: 'Boost Mois (30 jours)', duration: 30, price: 7500 },
];

interface ServicesProProps {
  userProfile: UserProfile | null;
}

export default function ServicesPro({ userProfile }: ServicesProProps) {
  const [user] = useAuthState(auth);
  const { formatPrice } = useCurrency();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceOffer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string>('');
  const [selectedBoostDuration, setSelectedBoostDuration] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>("08:00");
  const [showListingSelector, setShowListingSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const BASE_BOOST_PRICE = 1000; // 1000 FCFA per day

  useEffect(() => {
    if (user && (userProfile?.role === 'courtier' || userProfile?.role === 'aide_courtier')) {
      const q = query(collection(db, 'listings'), where('courtierId', '==', user.uid));
      getDocs(q).then(snapshot => {
        setUserListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Listing[]);
      });
    }
  }, [user, userProfile]);

  const handlePurchase = async (offer: ServiceOffer) => {
    if (!user || !userProfile) {
      alert("Veuillez vous connecter pour acheter un service.");
      return;
    }

    const isBoost = offer.type.includes('BOOST') || offer.type.includes('Boost');
    const isVerified = offer.type === "Badge VÉRIFIÉ";
    const isAgencyPack = offer.type === "PACK Agence";

    // All services now go through the request modal
    if (!selectedListingId && !showListingSelector) {
      setSelectedService(offer);
      setShowListingSelector(true);
      // Set default duration based on offer if it's a boost
      if (offer.type === "Boost Flash 24h") setSelectedBoostDuration(1);
      else if (offer.type === "BOOST Semaine") setSelectedBoostDuration(7);
      else if (offer.type === "BOOST Mois") setSelectedBoostDuration(30);
      else setSelectedBoostDuration(1);
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      // Create Request in demandes_boost
      let baseAmount = offer.price;
      let duration = selectedBoostDuration; 
      
      if (isBoost) {
        baseAmount = BASE_BOOST_PRICE * selectedBoostDuration;
      } else if (isVerified) {
        duration = 180; // 6 months
      }

      // Apply promo code if any
      let amount = baseAmount;
      if (appliedPromo) {
        if (appliedPromo.reductionType === 'percent') {
          amount = baseAmount * (1 - appliedPromo.reduction / 100);
        } else {
          amount = Math.max(0, baseAmount - appliedPromo.reduction);
        }
      }

      // Check balance before creating request
      if ((userProfile.balance || 0) < amount) {
        setError("Solde insuffisante pour ce pack");
        setIsProcessing(false);
        return;
      }
      
      await addDoc(collection(db, 'demandes_boost'), {
        listingId: selectedListingId || 'account_wide',
        listingTitle: userListings.find(l => l.id === selectedListingId)?.title || (isAgencyPack ? "Compte Agence" : "Sans titre"),
        courtierId: user.uid,
        courtierName: userProfile.displayName || user.email,
        amount: amount,
        duration: duration,
        serviceName: offer.title,
        status: 'en_attente',
        startDate: startDate,
        startTime: startTime,
        startDateTime: `${startDate}T${startTime}`,
        promoCode: appliedPromo?.codeName || null,
        createdAt: serverTimestamp()
      });

      setSelectedService(offer);
      setShowSuccessModal(true);
      setShowListingSelector(false);
      setSelectedListingId('');
      setAppliedPromo(null);
    } catch (error) {
      console.error("Error creating request:", error);
      handleFirestoreError(auth, error, OperationType.CREATE, 'demandes_boost');
      setError("Une erreur est survenue lors de la création de la demande.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode) return;
    setPromoError(null);
    try {
      const q = query(
        collection(db, 'promo_codes'), 
        where('codeName', '==', promoCode.toUpperCase()),
        where('estActif', '==', true)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setPromoError("Code promo invalide");
        return;
      }

      const promoData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as PromoCode;
      const expiration = promoData.dateExpiration?.toDate ? promoData.dateExpiration.toDate() : new Date(promoData.dateExpiration);
      
      if (expiration < new Date()) {
        setPromoError("Code promo expiré");
        return;
      }

      setAppliedPromo(promoData);
      setPromoCode('');
    } catch (error) {
      console.error("Error applying promo code:", error);
      setPromoError("Erreur lors de l'application du code");
    }
  };

  const calculateTotal = () => {
    const baseTotal = BASE_BOOST_PRICE * selectedBoostDuration;
    if (!appliedPromo) return baseTotal;

    if (appliedPromo.reductionType === 'percent') {
      return baseTotal * (1 - appliedPromo.reduction / 100);
    } else {
      return Math.max(0, baseTotal - appliedPromo.reduction);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-black mb-4"
        >
          <ShieldCheck className="w-4 h-4" />
          SERVICES PRO DAKAR IMMO
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
          Boostez votre activité <br />
          <span className="text-blue-600">immobilière à Dakar</span>
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto text-lg">
          Choisissez l'offre qui correspond à vos besoins et profitez d'une visibilité exceptionnelle auprès de milliers de clients potentiels.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {OFFERS.map((offer, index) => (
          <motion.div
            key={offer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-blue-900/5 border border-gray-100 flex flex-col relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500"
          >
            {offer.isPopular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-6 py-1.5 rounded-b-2xl text-[10px] font-black uppercase tracking-widest shadow-lg z-10">
                Meilleur Choix
              </div>
            )}

            {/* Background Gradient Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${offer.color} opacity-[0.03] -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-700`} />

            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${offer.color} flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-500/20`}>
              {offer.icon}
            </div>

            <h3 className="text-xl font-black text-gray-900 mb-2">{offer.title}</h3>
            <div className="flex flex-col mb-4">
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-black ${offer.discountedPrice ? 'text-gray-400 line-through text-xl' : 'text-blue-600'}`}>
                  {formatPrice(offer.price)}
                </span>
                {!offer.discountedPrice && <span className="text-gray-400 text-sm font-bold">/ {offer.duration}</span>}
              </div>
              {offer.discountedPrice && (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-blue-600">{formatPrice(offer.discountedPrice)}</span>
                  <span className="text-gray-400 text-sm font-bold">/ {offer.duration}</span>
                </div>
              )}
              {offer.discountLabel && (
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">
                  {offer.discountLabel}
                </span>
              )}
              {offer.specialOffer && (
                <div className="mt-2 bg-emerald-50 border border-emerald-100 p-2 rounded-xl">
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-tight">
                    {offer.specialOffer}
                  </p>
                </div>
              )}
            </div>

            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              {offer.description}
            </p>

            <div className="space-y-4 mb-8 flex-1">
              {offer.features.map((feature, fIndex) => (
                <div key={fIndex} className="flex items-center gap-3">
                  <div className="bg-blue-50 p-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-600 font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handlePurchase(offer)}
              disabled={isProcessing}
              className={`w-full bg-gradient-to-r ${offer.color} text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-300 disabled:opacity-50`}
            >
              {isProcessing && selectedService?.id === offer.id ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Acheter avec mon solde
                  <Wallet className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Info Section */}
      <div className="mt-20 bg-blue-900 rounded-[3rem] p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-800 rounded-full -mr-48 -mt-48 opacity-50 blur-3xl" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-black mb-6">Pourquoi choisir nos services ?</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="bg-white/10 p-3 rounded-2xl h-fit">
                  <ShieldCheck className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-bold text-xl mb-2">Confiance & Crédibilité</h4>
                  <p className="text-blue-100/80 leading-relaxed">
                    Le badge vérifié rassure instantanément les clients, surtout les expatriés et étudiants qui ne peuvent pas visiter sur place.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-white/10 p-3 rounded-2xl h-fit">
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h4 className="font-bold text-xl mb-2">Visibilité Maximale</h4>
                  <p className="text-blue-100/80 leading-relaxed">
                    Nos algorithmes de boost garantissent que vos annonces restent en haut de liste, là où 80% des clics se produisent.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] p-8">
            <div className="flex items-center gap-3 mb-6">
              <Info className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-bold">Comment ça marche ?</h3>
            </div>
            <ol className="space-y-6">
              <li className="flex gap-4">
                <span className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-black flex-shrink-0">1</span>
                <p className="text-blue-100/80">Rechargez votre portefeuille via Wave ou Orange Money.</p>
              </li>
              <li className="flex gap-4">
                <span className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-black flex-shrink-0">2</span>
                <p className="text-blue-100/80">Choisissez votre service et cliquez sur "Acheter avec mon solde".</p>
              </li>
              <li className="flex gap-4">
                <span className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-black flex-shrink-0">3</span>
                <p className="text-blue-100/80">Le service est activé instantanément après déduction du solde.</p>
              </li>
            </ol>
            <button className="w-full mt-8 bg-white text-blue-900 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-50 transition-all">
              <MessageCircle className="w-5 h-5" />
              Contacter le support
            </button>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-20 max-w-4xl mx-auto">
        <h3 className="text-3xl font-black text-gray-900 mb-12 text-center">Questions & Paiement</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-blue-900/5 border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="text-xl font-black text-gray-900 mb-4">Comment payer ?</h4>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              Le paiement des services se fait via <span className="font-bold text-blue-600">Wave</span> ou <span className="font-bold text-orange-500">Orange Money</span>.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-sm font-bold text-gray-700">Wave : +221 78 578 34 43</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <span className="text-sm font-bold text-gray-700">Orange Money : +221 77 XXX XX XX</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-blue-900/5 border border-gray-100">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
              <Wallet className="w-6 h-6 text-emerald-600" />
            </div>
            <h4 className="text-xl font-black text-gray-900 mb-4">Activation du service</h4>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              Une fois le transfert effectué, envoyez la capture d'écran du reçu à notre support WhatsApp. Votre service sera activé en moins de 15 minutes.
            </p>
            <button 
              onClick={() => window.open('https://wa.me/221785783443', '_blank')}
              className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
            >
              <MessageCircle className="w-5 h-5" />
              Envoyer mon reçu
            </button>
          </div>
        </div>
      </div>

      {/* Listing Selector Modal */}
      <AnimatePresence>
        {showListingSelector && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowListingSelector(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setShowListingSelector(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <h3 className="text-2xl font-black text-gray-900 mb-4">Configuration du Boost</h3>
              <p className="text-gray-500 mb-6 text-sm">Personnalisez votre boost et planifiez son lancement.</p>

              <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-bold text-gray-700">Votre solde :</span>
                </div>
                <span className="text-lg font-black text-blue-600">{formatPrice(userProfile?.balance || 0)}</span>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">Sélectionner l'annonce</label>
                  <select
                    value={selectedListingId}
                    onChange={(e) => setSelectedListingId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-500 font-bold text-sm"
                  >
                    <option value="">-- Choisir une annonce --</option>
                    {userListings.map(listing => (
                      <option key={listing.id} value={listing.id}>
                        {listing.title} ({listing.neighborhood})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Date de début</label>
                    <input 
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-500 font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Heure de début</label>
                    <input 
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-500 font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">Durée (en jours)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number"
                      min="1"
                      value={selectedBoostDuration}
                      onChange={(e) => setSelectedBoostDuration(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-500 font-bold text-sm"
                    />
                    <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl font-black text-sm">
                      {selectedBoostDuration} {selectedBoostDuration > 1 ? 'jours' : 'jour'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">Code Promo</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Ex: DAKAR20"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-500 font-bold text-sm"
                    />
                    <button
                      onClick={handleApplyPromoCode}
                      className="bg-slate-900 text-white px-4 py-3 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all"
                    >
                      Appliquer
                    </button>
                  </div>
                  {promoError && <p className="text-[10px] font-bold text-red-500 ml-1">{promoError}</p>}
                  {appliedPromo && (
                    <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3 h-3 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-700">Code {appliedPromo.codeName} appliqué (-{appliedPromo.reduction}{appliedPromo.reductionType === 'percent' ? '%' : ' FCFA'})</span>
                      </div>
                      <button onClick={() => setAppliedPromo(null)} className="text-emerald-700 hover:text-emerald-900">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-900 rounded-2xl text-white">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-400">Prix unitaire</span>
                    <span className="text-sm font-bold">{formatPrice(BASE_BOOST_PRICE)} / jour</span>
                  </div>
                  {appliedPromo && (
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-emerald-400">Réduction</span>
                      <span className="text-sm font-bold">
                        -{appliedPromo.reductionType === 'percent' ? `${appliedPromo.reduction}%` : formatPrice(appliedPromo.reduction)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="text-sm font-black">Total à payer</span>
                    <span className="text-xl font-black text-amber-400">
                      {formatPrice(calculateTotal())}
                    </span>
                  </div>
                </div>
              </div>

              {selectedService && (userProfile?.balance || 0) < calculateTotal() && (
                <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100 flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  <p className="text-xs font-bold text-red-600">Solde insuffisante pour cette durée</p>
                </div>
              )}

              <div className="mt-6">
                <button
                  onClick={() => selectedService && handlePurchase(selectedService)}
                  disabled={!selectedListingId || isProcessing || (userProfile?.balance || 0) < calculateTotal()}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:bg-gray-400 disabled:shadow-none"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      Confirmer le Boost
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Modal (Insufficient Balance) */}
      <AnimatePresence>
        {error && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setError(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <DollarSign className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4">Solde insuffisant</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Votre solde actuel ({formatPrice(userProfile?.balance || 0)}) ne permet pas d'acheter ce service. Veuillez recharger votre portefeuille.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setError(null);
                    safeDispatchEvent('navigate', { view: 'profile' });
                    // We need a way to tell ProfilePage to open the earnings tab.
                    // I'll add a timeout to let the view change first.
                    setTimeout(() => {
                      safeDispatchEvent('open-recharge');
                    }, 100);
                  }}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Recharger mon Wallet
                </button>
                <button
                  onClick={() => setError(null)}
                  className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence mode="wait">
        {showSuccessModal && (
          <div key="success-modal-container" className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              key="success-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSuccessModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              key="success-modal-content"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <div className="text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-4">Service activé !</h3>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Votre achat pour le service <span className="font-bold text-blue-600">{selectedService?.title}</span> a été validé. Votre solde a été mis à jour.
                </p>

                <div className="bg-emerald-50 rounded-2xl p-6 text-left mb-8 border border-emerald-100">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-1 flex-shrink-0" />
                    <p className="text-sm text-emerald-900 font-medium leading-relaxed">
                      L'option est désormais active sur votre compte. Merci de votre confiance !
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
                >
                  Génial !
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
