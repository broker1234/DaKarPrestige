import { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, query, orderBy, onSnapshot, where, limit, doc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Listing, UserProfile, Notification } from './types';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import PromoBanner from './components/PromoBanner';
import ListingGrid from './components/ListingGrid';

import AddListingModal from './components/AddListingModal';
import ListingDetailModal from './components/ListingDetailModal';
import ProfilePage from './components/ProfilePage';
import PublicProfilePage from './components/PublicProfilePage';
import ServicesPro from './components/ServicesPro';
import RegistrationPage from './components/RegistrationPage';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import CommissionClaimForm from './components/CommissionClaimForm';
import HousingRequestModal from './components/HousingRequestModal';
import HousingRequestsSection from './components/HousingRequestsSection';
import FAQ from './components/FAQ';
import { Plus, MessageCircle, Trash2, Shield, Search, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';

import { CurrencyProvider } from './lib/currency';

type View = 'home' | 'profile' | 'services' | 'inscription' | 'requests' | 'public-profile';

export default function App() {
  return (
    <CurrencyProvider>
      <AppContent />
    </CurrencyProvider>
  );
}

function AppContent() {
  const [user] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const adminEmails = ["peter2005ngouala@gmail.com", "peterngouala@gmail.com", "peter25ngouala@gmail.com"];
  const isUserAdmin = userProfile?.role === 'admin' || (user?.email && adminEmails.includes(user.email) && user.emailVerified);

  // Fetch notifications
  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[]);
      }, (error) => {
        handleFirestoreError(auth, error, OperationType.LIST, 'notifications');
      });
      return () => unsubscribe();
    }
  }, [user]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [listingToEdit, setListingToEdit] = useState<Listing | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedBrokerId, setSelectedBrokerId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('home');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Handle navigation from Navbar or other components
  useEffect(() => {
    const handleNavigate = (e: any) => {
      if (e.detail?.view) {
        setCurrentView(e.detail.view);
        if (e.detail.brokerId) {
          setSelectedBrokerId(e.detail.brokerId);
        }
      }
    };
    window.addEventListener('navigate', handleNavigate);
    
    const handleOpenAuth = () => setIsAuthModalOpen(true);
    window.addEventListener('open-auth', handleOpenAuth);

    return () => {
      window.removeEventListener('navigate', handleNavigate);
      window.removeEventListener('open-auth', handleOpenAuth);
    };
  }, []);
  const [claimModal, setClaimModal] = useState<{ isOpen: boolean; listingId: string; listingTitle: string }>({
    isOpen: false,
    listingId: '',
    listingTitle: ''
  });

  // Handle custom event for commission claim
  useEffect(() => {
    const handleOpenClaim = (e: any) => {
      setClaimModal({
        isOpen: true,
        listingId: e.detail.listingId,
        listingTitle: e.detail.listingTitle
      });
    };
    window.addEventListener('open-commission-claim', handleOpenClaim);
    return () => window.removeEventListener('open-commission-claim', handleOpenClaim);
  }, []);
  const [filters, setFilters] = useState<any>({});

  // Handle Affiliate Clicks and Deep Linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refId = params.get('ref');
    const listingId = params.get('listing');
    const profileId = params.get('profile');

    const trackClick = async () => {
      if (refId) {
        // Prevent self-clicking if logged in
        if (auth.currentUser?.uid === refId) return;

        // Check if we already tracked this click in this session to avoid spam
        const sessionKey = `click_tracked_${refId}_${listingId || 'general'}`;
        if (sessionStorage.getItem(sessionKey)) return;

        try {
          const userRef = doc(db, 'users', refId);
          await updateDoc(userRef, {
            affiliateClicks: increment(1)
          });
          
          // Track specific listing click for notifications
          if (listingId) {
            await addDoc(collection(db, 'affiliate_clicks'), {
              listingId,
              affiliateId: refId,
              createdAt: serverTimestamp()
            });
          }

          sessionStorage.setItem(sessionKey, 'true');
        } catch (error) {
          console.error("Error tracking affiliate click:", error);
        }
      }
    };

    trackClick();

    if (listingId) {
      const fetchListing = async () => {
        try {
          const listingDoc = await getDoc(doc(db, 'listings', listingId));
          if (listingDoc.exists()) {
            setSelectedListing({ id: listingDoc.id, ...listingDoc.data() } as Listing);
          }
        } catch (error) {
          console.error("Error fetching deep-linked listing:", error);
        }
      };
      fetchListing();
    }

    if (profileId) {
      setSelectedBrokerId(profileId);
      setCurrentView('public-profile');
    }
  }, []);

  // Fetch user profile
  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        if (doc.exists()) {
          setUserProfile(doc.data() as UserProfile);
        } else {
          // If user exists in Auth but not in Firestore, redirect to registration
          setCurrentView('inscription');
          setUserProfile(null);
        }
      }, (error) => {
        handleFirestoreError(auth, error, OperationType.GET, `users/${user.uid}`);
      });
      return () => unsubscribe();
    } else {
      setUserProfile(null);
    }
  }, [user]);

  // Fetch listings with filters
  useEffect(() => {
    setLoading(true);
    // Note: To sort by plan, we would ideally have the plan on the listing itself.
    // Since it's on the user profile, we'll fetch and then sort in memory for now.
    let q = query(collection(db, 'listings'), orderBy('isBoosted', 'desc'), orderBy('createdAt', 'desc'), limit(100));

    if (filters.neighborhood) {
      q = query(q, where('neighborhood', '==', filters.neighborhood));
    }
    if (filters.type) {
      q = query(q, where('type', '==', filters.type));
    }
    if (filters.proximity) {
      q = query(q, where('proximity', 'array-contains', filters.proximity));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedListings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Listing[];

      // Filter out blocked listings in UI for non-admins and non-owners
      fetchedListings = fetchedListings.filter(l => {
        if (userProfile?.role === 'admin') return true;
        if (user && l.courtierId === user.uid) return true;
        return l.status !== 'Bloqué';
      });

      if (filters.minPrice) {
        fetchedListings = fetchedListings.filter(l => l.price >= filters.minPrice);
      }
      if (filters.maxPrice) {
        fetchedListings = fetchedListings.filter(l => l.price <= filters.maxPrice);
      }

      // Sort by plan priority (Agence > Prestige > Gratuit)
      // We'll need to fetch the courtier's plan if not present, but for now we'll use a simplified sort
      // if the courtier info is denormalized. If not, we'll just keep the current sort.
      // To implement this properly, we should denormalize the courtierPlan on the listing.
      
      setListings(fetchedListings);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'listings');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filters, user, userProfile]);

  const isFavorite = (id: string) => {
    return userProfile?.favorites?.includes(id) || false;
  };

  const handleAuthSuccess = (isNewUser: boolean) => {
    setIsAuthModalOpen(false);
  };

  const toggleFavorite = async (id: string) => {
    if (!user || !userProfile) {
      alert("Veuillez vous connecter pour ajouter des favoris.");
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    try {
      if (isFavorite(id)) {
        await updateDoc(userRef, {
          favorites: arrayRemove(id)
        });
      } else {
        await updateDoc(userRef, {
          favorites: arrayUnion(id)
        });
      }
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const [listingToDelete, setListingToDelete] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const { loginWithGoogle } = await import('./lib/auth');
      await loginWithGoogle();
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        console.error("Login error:", error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!listingToDelete) return;
    try {
      await deleteDoc(doc(db, 'listings', listingToDelete));
      setListingToDelete(null);
      setSelectedListing(null);
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.DELETE, `listings/${listingToDelete}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Global Delete Confirmation Modal */}
      <AnimatePresence>
        {listingToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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

      <Navbar 
        onAddListing={() => setIsModalOpen(true)} 
        onProfileClick={() => setCurrentView('profile')}
        onHomeClick={() => setCurrentView('home')}
        onAdminClick={() => setIsAdminOpen(true)}
        onServicesClick={() => setCurrentView('services')}
        onRequestsClick={() => setCurrentView('requests')}
        onAuthClick={() => setIsAuthModalOpen(true)}
        userProfile={userProfile}
        notifications={notifications}
        isAdmin={!!isUserAdmin}
      />
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={handleAuthSuccess}
      />

      <CommissionClaimForm
        isOpen={claimModal.isOpen}
        onClose={() => setClaimModal(prev => ({ ...prev, isOpen: false }))}
        listingId={claimModal.listingId}
        listingTitle={claimModal.listingTitle}
        userProfile={userProfile}
      />

      <AnimatePresence>
        {isAdminOpen && isUserAdmin && (
          <AdminDashboard isAdmin={!!isUserAdmin} onClose={() => setIsAdminOpen(false)} />
        )}
      </AnimatePresence>

      <main className="pt-20">
        {currentView === 'inscription' ? (
          <RegistrationPage 
            onSuccess={() => setCurrentView('home')} 
            onBack={() => setCurrentView('home')} 
          />
        ) : currentView === 'home' ? (
          <>
            <Hero 
              onFilterChange={setFilters} 
              onAuthClick={() => setIsAuthModalOpen(true)} 
              boostedListings={listings.filter(l => l.isBoosted)}
              onViewListing={setSelectedListing}
            />
            
            {/* Categories Horizontal Scroll */}
            <div className="max-w-7xl mx-auto px-4 py-8 relative z-20">
              <div className="flex items-center justify-center">
                <div className="flex overflow-x-auto pb-2 gap-3 scroll-smooth bg-white/80 backdrop-blur-md p-2 rounded-[2rem] shadow-xl border border-gray-100 custom-scrollbar">
                  {['Tous', 'Studios', 'Appartements', 'Villas', 'Meublés', 'Chambre étudiant'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilters({ ...filters, type: cat === 'Tous' ? undefined : (cat === 'Meublés' ? 'Appartement' : cat) })}
                      className={`flex-shrink-0 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                        (filters.type === cat || (cat === 'Tous' && !filters.type)) 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                          : 'bg-transparent text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="max-w-[1600px] mx-auto px-4 md:px-8 pb-20 relative z-20 space-y-12">
              <PromoBanner 
                boostedListings={listings.filter(l => l.isBoosted)}
                onViewListing={setSelectedListing}
              />

              {/* Featured Section */}
              {listings.filter(l => l.isBoosted).length > 0 && (
                <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl shadow-blue-900/5">
                  <ListingGrid 
                    title="Exclusivité Prestige ✨"
                    layout="scroll"
                    listings={listings.filter(l => l.isBoosted)}
                    loading={loading}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    onViewListing={setSelectedListing}
                    userProfile={userProfile}
                    autoScroll={true}
                  />
                </div>
              )}

              {/* Student Housing Section */}
              {listings.filter(l => l.type === 'Colocation').length > 0 && (
                <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl shadow-blue-900/5">
                  <ListingGrid 
                    title="Logements Étudiants 🎓"
                    layout="scroll"
                    listings={listings.filter(l => l.type === 'Colocation')}
                    loading={loading}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    onViewListing={setSelectedListing}
                    userProfile={userProfile}
                  />
                </div>
              )}

              {/* Main Grid */}
              <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl shadow-blue-900/5 min-h-[400px]">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Toutes les Annonces</h2>
                    <p className="text-gray-500 text-sm">Découvrez les meilleures opportunités à Dakar</p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                    {listings.length} annonces disponibles
                  </div>
                </div>

                <ListingGrid 
                  listings={listings} 
                  loading={loading} 
                  isFavorite={isFavorite}
                  onToggleFavorite={toggleFavorite}
                  onViewListing={setSelectedListing}
                  userProfile={userProfile}
                />
              </div>
            </div>
            <FAQ />
          </>
        ) : currentView === 'services' ? (
          <ServicesPro />
        ) : currentView === 'requests' ? (
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Demandes de Logement</h2>
                <p className="text-slate-500 font-medium">Les clients recherchent activement ces biens</p>
              </div>
              {userProfile?.role === 'user' && (
                <button
                  onClick={() => setIsRequestModalOpen(true)}
                  className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-600/20 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Publier ma demande
                </button>
              )}
            </div>
            <HousingRequestsSection />
          </div>
        ) : currentView === 'public-profile' ? (
          <PublicProfilePage 
            brokerId={selectedBrokerId || ''}
            onBack={() => setCurrentView('home')}
            onViewListing={setSelectedListing}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            currentUserProfile={userProfile}
          />
        ) : (
          <ProfilePage 
            userProfile={userProfile}
            onAddListing={() => {
              setListingToEdit(null);
              setIsModalOpen(true);
            }}
            onEditListing={(listing) => {
              setListingToEdit(listing);
              setIsModalOpen(true);
            }}
            onViewListing={setSelectedListing}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </main>

      {/* Floating Action Button for Mobile */}
      <AnimatePresence>
        {(userProfile?.role === 'courtier' || userProfile?.role === 'aide_courtier') && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsModalOpen(true)}
            className="md:hidden fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-2xl shadow-2xl z-40"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-slate-950 text-white pt-20 pb-10 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="bg-brand-600 p-2 rounded-xl text-white shadow-lg shadow-brand-600/20">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black tracking-tight">Dakar<span className="text-brand-500">Prestige</span></span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              L'excellence immobilière au Sénégal. Nous connectons les meilleurs courtiers avec les clients les plus exigeants pour une expérience sans compromis.
            </p>
            <div className="flex items-center gap-4">
              {['facebook', 'instagram', 'twitter', 'linkedin'].map((social) => (
                <button key={social} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-brand-600 hover:border-brand-600 transition-all">
                  <span className="sr-only">{social}</span>
                  <div className="w-4 h-4 bg-slate-400 group-hover:bg-white" />
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8">Navigation</h4>
            <ul className="space-y-4">
              {['Accueil', 'Services Pro', 'Demandes', 'FAQ', 'Mon Profil', 'Inscription'].map((item) => (
                <li key={item}>
                  <button 
                    onClick={() => {
                      if (item === 'FAQ') {
                        setCurrentView('home');
                        setTimeout(() => {
                          document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                        return;
                      }
                      const viewMap: Record<string, View> = {
                        'Accueil': 'home',
                        'Services Pro': 'services',
                        'Demandes': 'requests',
                        'Mon Profil': 'profile',
                        'Inscription': 'inscription'
                      };
                      setCurrentView(viewMap[item]);
                      window.scrollTo(0, 0);
                    }}
                    className="text-slate-400 hover:text-brand-500 font-bold transition-colors"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8">Quartiers</h4>
            <ul className="grid grid-cols-1 gap-4">
              {['Almadies', 'Plateau', 'Ouest Foire', 'Mermoz', 'Ngor Virage'].map((q) => (
                <li key={q}>
                  <button 
                    onClick={() => {
                      setFilters({ neighborhood: q as any });
                      setCurrentView('home');
                      window.scrollTo(0, 0);
                    }}
                    className="text-slate-400 hover:text-brand-500 font-bold transition-colors"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8">Contact</h4>
            <div className="space-y-6">
              <a 
                href="https://wa.me/221789619088" 
                className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-brand-600/10 hover:border-brand-600/50 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-white transition-all">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">WhatsApp Support</p>
                  <p className="text-sm font-black">+221 78 961 90 88</p>
                </div>
              </a>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Newsletter</p>
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    placeholder="Votre email" 
                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-500 transition-all"
                  />
                  <button className="bg-brand-600 p-2 rounded-xl hover:bg-brand-700 transition-all">
                    <Rocket className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-10 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-slate-500 text-xs font-bold">
            © 2026 Dakar Prestige. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Propulsé par</span>
              <a 
                href="#" 
                className="text-brand-500 font-black text-xs hover:underline"
              >
                CRYNANCE
              </a>
            </div>
            <div className="h-4 w-px bg-white/10 hidden md:block" />
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <button className="hover:text-white transition-colors">Confidentialité</button>
              <button className="hover:text-white transition-colors">Conditions</button>
            </div>
          </div>
        </div>
      </footer>

      <AddListingModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setListingToEdit(null);
        }} 
        listingToEdit={listingToEdit}
      />

      <HousingRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        userProfile={userProfile}
      />

      <ListingDetailModal 
        listing={selectedListing}
        isOpen={!!selectedListing}
        onClose={() => setSelectedListing(null)}
        isFavorite={selectedListing ? isFavorite(selectedListing.id) : false}
        onToggleFavorite={toggleFavorite}
        isOwner={selectedListing?.courtierId === user?.uid}
        onDelete={(id) => setListingToDelete(id)}
        onEdit={(listing) => {
          setListingToEdit(listing);
          setIsModalOpen(true);
        }}
        userProfile={userProfile}
      />
    </div>
  );
}
