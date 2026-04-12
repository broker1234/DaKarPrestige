import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Phone, Mail, Heart, Home, LogOut, ChevronRight, Edit2, Save, Trash2, Plus, MapPin, Zap, Clock, CheckCircle2, Package, ShieldCheck, Search, DollarSign, Camera, Loader2, Rocket, Users } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot, deleteDoc, orderBy, limit, getDocs, writeBatch, arrayUnion, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { UserProfile, Listing, COUNTRIES, ServiceRequest, HousingRequest, Transaction, LeadTransfer } from '../types';
import { closeListing } from '../lib/notifications';
import { formatPrice } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import ListingCard from './ListingCard';
import WalletCard from './WalletCard';

interface ProfilePageProps {
  userProfile: UserProfile | null;
  onAddListing: () => void;
  onEditListing: (listing: Listing) => void;
  onViewListing: (listing: Listing) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}

export default function ProfilePage({ 
  userProfile, 
  onAddListing, 
  onEditListing, 
  onViewListing, 
  isFavorite, 
  onToggleFavorite 
}: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<'share' | 'earnings' | 'profile' | 'leads'>(
    userProfile?.role === 'aide_courtier' ? 'share' : 'share'
  );
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userProfile?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [coverImage, setCoverImage] = useState(userProfile?.coverImage || '');
  const [agencyLogo, setAgencyLogo] = useState(userProfile?.agencyLogo || '');
  const [agencyDescription, setAgencyDescription] = useState(userProfile?.agencyDescription || '');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [myRequests, setMyRequests] = useState<HousingRequest[]>([]);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<LeadTransfer[]>([]);

  useEffect(() => {
    if (!userProfile) return;

    // Fetch service requests
    const srQuery = query(
      collection(db, 'service_requests'), 
      where('userId', '==', userProfile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeSR = onSnapshot(srQuery, (snapshot) => {
      setServiceRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ServiceRequest[]);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'service_requests');
    });

    // Fetch my listings if courtier
    if (userProfile.role === 'courtier') {
      const q = query(collection(db, 'listings'), where('courtierId', '==', userProfile.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMyListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Listing[]);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(auth, error, OperationType.LIST, 'listings');
      });
      return () => {
        unsubscribeSR();
        unsubscribe();
      };
    }

    // Fetch favorite listings if user
    if (userProfile.role === 'user') {
      // Fetch favorites
      if (userProfile.favorites?.length > 0) {
        const q = query(collection(db, 'listings'), where('__name__', 'in', userProfile.favorites));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          setFavoriteListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Listing[]);
        }, (error) => {
          handleFirestoreError(auth, error, OperationType.LIST, 'listings');
        });
      }

      // Fetch my housing requests
      const reqQuery = query(
        collection(db, 'housing_requests'),
        where('userId', '==', userProfile.uid),
        orderBy('createdAt', 'desc')
      );
      const unsubscribeReq = onSnapshot(reqQuery, (snapshot) => {
        setMyRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HousingRequest[]);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(auth, error, OperationType.LIST, 'housing_requests');
      });

      return () => {
        unsubscribeSR();
        unsubscribeReq();
      };
    } else if (userProfile.role === 'aide_courtier') {
      // Fetch all listings for Aide-Courtier to browse and share
      const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        let fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Listing[];
        // Filter out blocked listings
        fetched = fetched.filter(l => l.status !== 'Bloqué');
        setAllListings(fetched);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(auth, error, OperationType.LIST, 'listings');
      });
      return () => {
        unsubscribeSR();
        unsubscribe();
      };
    } else {
      setLoading(false);
      return () => unsubscribeSR();
    }
  }, [userProfile]);

  const handleUpdateProfile = async () => {
    if (!userProfile) return;
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        displayName: name,
        phone: phone,
        coverImage: coverImage,
        agencyLogo: agencyLogo,
        agencyDescription: agencyDescription,
        photoURL: photoURL,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.error("Cloudinary configuration missing");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      // Removed 'folder' and 'transformation' as they can cause "Upload failed" 
      // if the unsigned preset doesn't explicitly allow them.

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Cloudinary error details:", errorData);
        throw new Error(errorData.error?.message || "Upload failed");
      }

      const data = await response.json();
      // We can apply transformations via the URL instead
      let newPhotoURL = data.secure_url;
      
      // If it's a cloudinary URL, we can inject transformations
      if (newPhotoURL.includes('res.cloudinary.com')) {
        newPhotoURL = newPhotoURL.replace('/upload/', '/upload/c_fill,g_auto,ar_1:1,w_500,q_auto,f_auto/');
      }
      
      setPhotoURL(newPhotoURL);
      
      // Immediate update in Firestore
      await updateDoc(doc(db, 'users', userProfile.uid), {
        photoURL: newPhotoURL
      });

      // Update all listings of this broker to keep photo in sync
      if (userProfile.role === 'courtier') {
        const listingsQuery = query(collection(db, 'listings'), where('courtierId', '==', userProfile.uid));
        const listingsSnapshot = await getDocs(listingsQuery);
        const batch = writeBatch(db);
        listingsSnapshot.docs.forEach((listingDoc) => {
          batch.update(listingDoc.ref, { courtierPhoto: newPhotoURL });
        });
        await batch.commit();
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const [isProcessingBoost, setIsProcessingBoost] = useState<string | null>(null);
  const [listingToClose, setListingToClose] = useState<Listing | null>(null);
  const [listingToMarkSold, setListingToMarkSold] = useState<Listing | null>(null);
  const [affiliateToPay, setAffiliateToPay] = useState<{ id: string, name: string } | null>(null);
  const [proofImage, setProofImage] = useState<string>('');
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<string | null>(null);

  const handleBoostListing = async (listing: Listing) => {
    if (!userProfile) return;
    const BOOST_PRICE = 2500; // Price for 1 week boost

    if ((userProfile.balance || 0) < BOOST_PRICE) {
      alert("Solde insuffisant. Veuillez recharger votre portefeuille.");
      return;
    }

    if (!window.confirm(`Voulez-vous booster cette annonce pour 7 jours (${formatPrice(BOOST_PRICE)}) ?`)) return;

    setIsProcessingBoost(listing.id);
    try {
      const transactionId = Math.random().toString(36).substring(2, 15);
      const newTransaction: Transaction = {
        id: transactionId,
        type: 'purchase',
        amount: BOOST_PRICE,
        description: `Boost Annonce: ${listing.title}`,
        status: 'completed',
        createdAt: new Date()
      };

      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        balance: (userProfile.balance || 0) - BOOST_PRICE,
        transactions: arrayUnion(newTransaction)
      });

      const listingRef = doc(db, 'listings', listing.id);
      await updateDoc(listingRef, {
        isBoosted: true,
        boostExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      alert("Annonce boostée avec succès !");
    } catch (error) {
      console.error("Error boosting listing:", error);
      alert("Une erreur est survenue.");
    } finally {
      setIsProcessingBoost(null);
    }
  };
  const handleCloseListing = async () => {
    if (!listingToClose) return;
    try {
      await closeListing(listingToClose.id, listingToClose);
      setListingToClose(null);
    } catch (error) {
      console.error("Error closing listing:", error);
    }
  };

  const handleMarkAsSold = async () => {
    if (!listingToMarkSold || !userProfile) return;
    
    setIsSubmittingSale(true);
    try {
      // 1. Create the declaration
      await addDoc(collection(db, 'commission_claims'), {
        courtierId: userProfile.uid,
        courtierName: userProfile.displayName,
        listingId: listingToMarkSold.id,
        listingTitle: listingToMarkSold.title,
        promisedCommission: listingToMarkSold.commissionAideCourtier || 0,
        affiliateId: affiliateToPay?.id || '',
        affiliateName: affiliateToPay?.name || '',
        proofImageUrl: proofImage,
        status: "En attente",
        type: 'declaration',
        createdAt: serverTimestamp()
      });

      // 2. Mark listing as sold
      await updateDoc(doc(db, 'listings', listingToMarkSold.id), {
        status: 'Loué'
      });

      setListingToMarkSold(null);
      setAffiliateToPay(null);
      setProofImage('');
      alert("Vente déclarée avec succès ! L'admin va valider la commission.");
    } catch (error) {
      console.error("Error marking as sold:", error);
      alert("Une erreur est survenue.");
    } finally {
      setIsSubmittingSale(false);
    }
  };

  useEffect(() => {
    if (!auth.currentUser || userProfile?.role !== 'aide_courtier') return;

    const q = query(
      collection(db, 'lead_transfers'),
      where('affiliateId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTransfers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeadTransfer[];
      setTransfers(fetchedTransfers);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.GET, 'lead_transfers');
    });

    return () => unsubscribe();
  }, [userProfile?.role]);

  const handleTransferLead = async (listing: Listing) => {
    if (!auth.currentUser || !userProfile) return;

    const clientName = prompt("Quel est le nom du client ? (Optionnel)");
    
    const message = `Salut, j'ai un client (M. ${clientName || '[NOM_A_REMPLIR]'}) pour ton bien ${listing.id}. Je reste en attente pour la commission via Dakar Prestige.`;
    
    try {
      // Record in Firestore
      await addDoc(collection(db, 'lead_transfers'), {
        listingId: listing.id,
        listingTitle: listing.title,
        affiliateId: auth.currentUser.uid,
        affiliateName: userProfile.displayName || 'Aide-Courtier',
        courtierId: listing.courtierId,
        courtierName: listing.courtierName || 'Courtier',
        clientName: clientName || null,
        createdAt: serverTimestamp(),
      });

      // Open WhatsApp
      window.open(`https://wa.me/${listing.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.CREATE, 'lead_transfers');
    }
  };

  const checkAffiliate = async (listingId: string) => {
    try {
      const q = query(
        collection(db, 'affiliate_clicks'), 
        where('listingId', '==', listingId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const clickData = snapshot.docs[0].data();
        const affiliateDoc = await getDoc(doc(db, 'users', clickData.affiliateId));
        if (affiliateDoc.exists()) {
          setAffiliateToPay({
            id: clickData.affiliateId,
            name: affiliateDoc.data().displayName || 'Aide-Courtier'
          });
        }
      }
    } catch (error) {
      console.error("Error checking affiliate:", error);
    }
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (response.ok) {
        const data = await response.json();
        setProofImage(data.secure_url);
      }
    } catch (error) {
      console.error("Error uploading proof:", error);
    }
  };

  const handleDeleteListing = async () => {
    if (!listingToDelete) return;
    try {
      await deleteDoc(doc(db, 'listings', listingToDelete));
      setListingToDelete(null);
    } catch (error) {
      console.error("Error deleting listing:", error);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'housing_requests', id));
    } catch (error) {
      console.error("Error deleting request:", error);
    }
  };

  if (!userProfile) return null;

  const userCountry = COUNTRIES.find(c => c.name === userProfile.country);

  // Aide-Courtier Specific Layout with Tabs
  if (userProfile.role === 'aide_courtier') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 pb-24 md:pb-12">
        {/* Tab Navigation - Fixed on mobile bottom, top on desktop */}
        <div className="fixed bottom-0 left-0 right-0 z-[100] md:relative md:bottom-auto bg-white/80 backdrop-blur-xl border-t border-gray-100 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] md:border-t-0 md:bg-transparent md:mb-8 px-4 py-4 md:p-0">
          <div className="max-w-md mx-auto md:max-w-none flex items-center justify-between md:justify-start gap-2 bg-gray-100/50 p-1.5 rounded-[2rem] md:w-fit">
            <button
              onClick={() => setActiveTab('share')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'share' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 scale-[1.02]' : 'text-gray-500 hover:text-blue-600'
              }`}
            >
              <Zap className={`w-4 h-4 ${activeTab === 'share' ? 'animate-pulse' : ''}`} />
              <span>Partager</span>
            </button>
            <button
              onClick={() => setActiveTab('earnings')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'earnings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 scale-[1.02]' : 'text-gray-500 hover:text-blue-600'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Gains</span>
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'leads' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 scale-[1.02]' : 'text-gray-500 hover:text-blue-600'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Mises en relation</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'profile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 scale-[1.02]' : 'text-gray-500 hover:text-blue-600'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profil</span>
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'share' && (
            <motion.div
              key="share"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-blue-900/5 border border-gray-100">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                      <Zap className="w-6 h-6 text-amber-500" />
                      Annonces à Partager
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Gagnez des commissions en partageant ces biens.</p>
                  </div>
                  <div className="bg-amber-50 px-4 py-2 rounded-2xl border border-amber-100">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Clics Totaux</p>
                    <p className="text-xl font-black text-amber-900">{userProfile.affiliateClicks || 0}</p>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allListings.length > 0 ? (
                      allListings.map(listing => (
                        <ListingCard 
                          key={listing.id} 
                          listing={listing} 
                          onClick={onViewListing}
                          isFavorite={isFavorite(listing.id)}
                          onToggleFavorite={onToggleFavorite}
                          onTransfer={handleTransferLead}
                          userProfile={userProfile}
                        />
                      ))
                    ) : (
                      <EmptyState 
                        icon={<Zap className="w-12 h-12 text-gray-300" />}
                        title="Aucune annonce disponible"
                        description="Revenez plus tard pour découvrir de nouvelles annonces à partager."
                      />
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'earnings' && (
            <motion.div
              key="earnings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-2xl mx-auto"
            >
              <WalletCard userProfile={userProfile} />
            </motion.div>
          )}

          {activeTab === 'leads' && (
            <motion.div
              key="leads"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-blue-900/5 border border-gray-100">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                      <Users className="w-6 h-6 text-blue-500" />
                      Historique des Mises en Relation
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Retrouvez ici tous les clients que vous avez transférés aux courtiers.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {transfers.length > 0 ? (
                    transfers.map((transfer) => (
                      <div key={transfer.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                            <Rocket className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-black text-gray-900">{transfer.listingTitle}</p>
                            <p className="text-xs text-gray-500">Courtier: <span className="font-bold">{transfer.courtierName}</span></p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                              {transfer.createdAt?.toDate ? transfer.createdAt.toDate().toLocaleDateString('fr-FR') : 'Récemment'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-blue-600">{transfer.clientName || 'Client anonyme'}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Transféré</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-xs text-gray-400 font-black uppercase tracking-widest">Aucun transfert pour le moment</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-blue-900/5 border border-gray-100">
                <div className="flex flex-col items-center text-center mb-12">
                  <div className="relative group">
                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-lg overflow-hidden">
                      {isUploadingPhoto ? (
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      ) : photoURL ? (
                        <img src={photoURL} alt={userProfile.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-600 text-3xl font-black bg-blue-50">
                          {userProfile.displayName?.charAt(0).toUpperCase() || <User className="w-12 h-12" />}
                        </div>
                      )}
                    </div>
                    <label className="absolute bottom-4 right-0 bg-blue-600 p-2 rounded-full text-white shadow-lg cursor-pointer hover:bg-blue-700 transition-all border-2 border-white">
                      <Camera className="w-4 h-4" />
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
                    </label>
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 mb-1">{userProfile.displayName}</h2>
                  <span className="px-4 py-1.5 bg-amber-50 text-amber-600 rounded-full text-xs font-black uppercase tracking-wider">
                    Aide-Courtier Prestige
                  </span>
                </div>

                <div className="space-y-6 mb-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email</p>
                      <p className="font-bold text-gray-700">{userProfile.email}</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Téléphone</p>
                      {isEditing ? (
                        <input 
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 outline-none focus:border-blue-500 font-bold"
                        />
                      ) : (
                        <p className="font-bold text-gray-700">{userProfile.phone || 'Non renseigné'}</p>
                      )}
                    </div>
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pays</p>
                      <p className="font-bold text-gray-700 flex items-center gap-2">
                        {userCountry?.flag} {userProfile.country || 'Non renseigné'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Rôle</p>
                      <p className="font-bold text-gray-700">Aide-Courtier</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {isEditing ? (
                    <button 
                      onClick={handleUpdateProfile}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all"
                    >
                      <Save className="w-5 h-5" />
                      Enregistrer les modifications
                    </button>
                  ) : (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-black transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                      Modifier mon profil
                    </button>
                  )}
                  <button 
                    onClick={() => auth.signOut()}
                    className="w-full flex items-center justify-center gap-2 text-red-500 py-5 rounded-2xl font-black hover:bg-red-50 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    Se déconnecter
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Close Confirmation Modal */}
      <AnimatePresence>
        {listingToMarkSold && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setListingToMarkSold(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2 text-center">Marquer comme conclu</h3>
              
              <div className="space-y-6 mt-6">
                {affiliateToPay ? (
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-700 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Une commission est due à <span className="font-black underline">{affiliateToPay.name}</span>
                    </p>
                    <p className="text-[10px] text-emerald-600 mt-1">Montant : {formatPrice(listingToMarkSold.commissionAideCourtier || 0)}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-xs text-gray-500 text-center">Aucun aide-courtier identifié pour cette vente.</p>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Preuve de transfert Wave (Capture d'écran)
                  </label>
                  <div className="relative group">
                    {proofImage ? (
                      <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-blue-500">
                        <img src={proofImage} alt="Preuve" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setProofImage('')}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all">
                        <Camera className="w-8 h-8 text-gray-300 mb-2" />
                        <span className="text-xs font-bold text-gray-400">Cliquez pour uploader</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleProofUpload} />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setListingToMarkSold(null)}
                    className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleMarkAsSold}
                    disabled={isSubmittingSale || (affiliateToPay && !proofImage)}
                    className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-all disabled:opacity-50 shadow-xl shadow-blue-600/20"
                  >
                    {isSubmittingSale ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirmer'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {listingToClose && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setListingToClose(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Marquer comme Loué ?</h3>
              <p className="text-gray-500 mb-8">
                Cette action informera tous les aide-courtiers que ce logement n'est plus disponible.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setListingToClose(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCloseListing}
                  className="flex-1 bg-amber-600 text-white py-3 rounded-xl font-bold hover:bg-amber-700 transition-all"
                >
                  Confirmer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {listingToDelete && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setListingToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Supprimer l'annonce ?</h3>
              <p className="text-gray-500 mb-8">Cette action est irréversible. L'annonce sera définitivement supprimée.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setListingToDelete(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteListing}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Sidebar Profile Card */}
        <div className="lg:col-span-1">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl p-8 shadow-xl shadow-blue-900/5 border border-gray-100"
          >
            <div className="flex flex-col items-center text-center mb-8">
              <div className="relative group">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-lg overflow-hidden">
                  {isUploadingPhoto ? (
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  ) : photoURL ? (
                    <img src={photoURL} alt={userProfile.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-blue-600 text-3xl font-black bg-blue-50">
                      {userProfile.displayName?.charAt(0).toUpperCase() || <User className="w-12 h-12" />}
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full text-white shadow-lg cursor-pointer hover:bg-blue-700 transition-all border-2 border-white">
                  <Camera className="w-4 h-4" />
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
                </label>
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">{userProfile.displayName}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                userProfile.role === 'courtier' ? 'bg-blue-50 text-blue-600' :
                'bg-gray-50 text-gray-600'
              }`}>
                {userProfile.role === 'courtier' ? 'Courtier Vérifié' : 
                 'Chercheur de Logement'}
              </span>
            </div>

            {userProfile.role === 'courtier' && (
              <div className="mb-8 p-6 bg-brand-50 rounded-[2rem] border border-brand-100 shadow-inner">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-brand-500 rounded-xl text-white">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-black text-brand-900 uppercase tracking-widest">Performances</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-brand-100/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Annonces</p>
                    <p className="text-2xl font-black text-brand-600">{myListings.length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-brand-100/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vues Totales</p>
                    <p className="text-2xl font-black text-brand-600">
                      {myListings.reduce((acc, curr) => acc + (curr.views || 0), 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {userProfile.role === 'courtier' && (userProfile.plan === 'Prestige' || userProfile.plan === 'Agence') && (
                <div className="space-y-4 mb-6 pt-6 border-t border-gray-100">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Personnalisation Premium</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Couverture (URL)</label>
                      {isEditing ? (
                        <input 
                          type="text"
                          value={coverImage}
                          onChange={(e) => setCoverImage(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 text-xs"
                        />
                      ) : (
                        <p className="text-xs text-gray-500 truncate">{coverImage || 'Non définie'}</p>
                      )}
                    </div>

                    {userProfile.plan === 'Agence' && (
                      <div>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Logo Agence (URL)</label>
                        {isEditing ? (
                          <input 
                            type="text"
                            value={agencyLogo}
                            onChange={(e) => setAgencyLogo(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 text-xs"
                          />
                        ) : (
                          <p className="text-xs text-gray-500 truncate">{agencyLogo || 'Non défini'}</p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Description</label>
                      {isEditing ? (
                        <textarea 
                          value={agencyDescription}
                          onChange={(e) => setAgencyDescription(e.target.value)}
                          rows={2}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 text-xs resize-none"
                        />
                      ) : (
                        <p className="text-xs text-gray-500 line-clamp-2">{agencyDescription || 'Non définie'}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isEditing ? (
                <button 
                  onClick={handleUpdateProfile}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer
                </button>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                  Modifier le profil
                </button>
              )}
              <button 
                onClick={() => auth.signOut()}
                className="w-full flex items-center justify-center gap-2 text-red-500 py-3 rounded-xl font-bold hover:bg-red-50 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </motion.div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 shadow-xl shadow-blue-900/5 border border-gray-100 min-h-[600px]"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                {userProfile.role === 'courtier' ? (
                  <>
                    <Home className="w-6 h-6 text-blue-600" />
                    Mes Annonces
                  </>
                ) : (
                  <>
                    <Search className="w-6 h-6 text-blue-600" />
                    Mes Demandes
                  </>
                )}
              </h3>
              {userProfile.role === 'courtier' && (
                <button 
                  onClick={onAddListing}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {userProfile.role === 'courtier' ? (
                  myListings.length > 0 ? (
                    myListings.map(listing => (
                      <div key={listing.id} className="relative group">
                        <ListingCard 
                          listing={listing} 
                          onClick={onViewListing}
                          isFavorite={isFavorite(listing.id)}
                          onToggleFavorite={onToggleFavorite}
                          userProfile={userProfile}
                        />
                        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditListing(listing);
                            }}
                            className="bg-blue-500 text-white p-2 rounded-full md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg"
                            title="Modifier l'annonce"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setListingToDelete(listing.id);
                            }}
                            className="bg-red-500 text-white p-2 rounded-full md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg"
                            title="Supprimer l'annonce"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {listing.status !== 'Loué' && !listing.isBoosted && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBoostListing(listing);
                              }}
                              disabled={isProcessingBoost === listing.id}
                              className="bg-amber-500 text-white p-2 rounded-full md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg"
                              title="Booster l'annonce (2500 FCFA)"
                            >
                              {isProcessingBoost === listing.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Zap className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {listing.status !== 'Loué' && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setListingToMarkSold(listing);
                                checkAffiliate(listing.id);
                              }}
                              className="bg-blue-600 text-white p-2 rounded-full md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg"
                              title="Marquer comme conclu"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                          {listing.status !== 'Loué' && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setListingToClose(listing);
                              }}
                              className="bg-emerald-500 text-white p-2 rounded-full md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg"
                              title="Marquer comme Loué"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState 
                      icon={<Home className="w-12 h-12 text-gray-300" />}
                      title="Aucune annonce"
                      description="Commencez à publier vos biens immobiliers dès maintenant."
                    />
                  )
                ) : (
                  myRequests.length > 0 ? (
                    myRequests.map(request => (
                      <div key={request.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 relative group">
                        <div className="flex items-center justify-between mb-4">
                          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                            {request.type}
                          </span>
                          <button
                            onClick={() => handleDeleteRequest(request.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <h4 className="font-bold text-gray-900 mb-1">{request.neighborhood}</h4>
                        <p className="text-blue-600 font-black text-sm mb-3">{formatPrice(request.budget)}</p>
                        <p className="text-xs text-gray-500 line-clamp-2 italic mb-4">"{request.description}"</p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          <Clock className="w-3 h-3" />
                          {request.createdAt?.toDate ? request.createdAt.toDate().toLocaleDateString('fr-FR') : 'À l\'instant'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState 
                      icon={<Search className="w-12 h-12 text-gray-300" />}
                      title="Aucune demande"
                      description="Publiez ce que vous cherchez pour que les courtiers vous contactent."
                    />
                  )
                )}
              </div>
            )}
          </motion.div>

          {/* Favorites Section for Users */}
          {userProfile.role === 'user' && favoriteListings.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl p-8 shadow-xl shadow-blue-900/5 border border-gray-100 mt-8"
            >
              <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3 mb-8">
                <Heart className="w-6 h-6 text-red-500" />
                Mes Favoris
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {favoriteListings.map(listing => (
                  <ListingCard 
                    key={listing.id} 
                    listing={listing} 
                    onClick={onViewListing}
                    isFavorite={isFavorite(listing.id)}
                    onToggleFavorite={onToggleFavorite}
                    userProfile={userProfile}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Service Requests Section */}
          {userProfile.role === 'courtier' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl p-8 shadow-xl shadow-blue-900/5 border border-gray-100 mt-8"
            >
              <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3 mb-8">
                <Zap className="w-6 h-6 text-amber-500" />
                Mes Services Pro
              </h3>

              {serviceRequests.length > 0 ? (
                <div className="space-y-4">
                  {serviceRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${
                          request.serviceType === 'Badge VÉRIFIÉ' ? 'bg-blue-100 text-blue-600' :
                          request.serviceType === 'PACK Agence' ? 'bg-emerald-100 text-emerald-600' :
                          'bg-amber-100 text-amber-600'
                        }`}>
                          {request.serviceType === 'Badge VÉRIFIÉ' ? <ShieldCheck className="w-5 h-5" /> :
                           request.serviceType === 'PACK Agence' ? <Package className="w-5 h-5" /> :
                           <Zap className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{request.serviceType}</p>
                          <p className="text-xs text-gray-500">{formatPrice(request.price)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {request.status === 'En attente' ? (
                          <span className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-bold">
                            <Clock className="w-3 h-3" />
                            En attente
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            Validé
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                  <Zap className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Vous n'avez pas encore souscrit à nos services pro.</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4">{icon}</div>
      <h4 className="text-xl font-bold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-500 max-w-xs">{description}</p>
    </div>
  );
}
