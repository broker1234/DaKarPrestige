import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { LogIn, LogOut, Plus, User, ShieldCheck, Globe, MapPin, ChevronRight, Zap, Bell, CheckCircle2, Search, Menu, X, HelpCircle, Rocket } from 'lucide-react';
import { UserProfile, UserRole, COUNTRIES, Notification } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import AuthModal from './AuthModal';
import BannerPromo from './BannerPromo';
import { useCurrency, Currency } from '../lib/currency';
import { safeDispatchEvent } from '../lib/utils';

interface NavbarProps {
  onAddListing: () => void;
  onProfileClick: () => void;
  onHomeClick: () => void;
  onAdminClick: () => void;
  onServicesClick: () => void;
  onRequestsClick: () => void;
  onMissionsClick: () => void;
  onAuthClick: () => void;
  userProfile: UserProfile | null;
  notifications: Notification[];
  isAdmin?: boolean;
  adminAlertsCount?: number;
}

export default function Navbar({ onAddListing, onProfileClick, onHomeClick, onAdminClick, onServicesClick, onRequestsClick, onMissionsClick, onAuthClick, userProfile, notifications, isAdmin, adminAlertsCount = 0 }: NavbarProps) {
  const [user] = useAuthState(auth);
  const { currency, setCurrency } = useCurrency();
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleInscriptionClick = () => {
    safeDispatchEvent('navigate', { view: 'inscription' });
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="fixed top-0 left-0 w-full z-[100]">
      <BannerPromo userProfile={userProfile} />
      <nav className="w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onHomeClick}>
          <div className="bg-brand-600 p-2 rounded-2xl text-white shadow-lg shadow-brand-600/20 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">Dakar<span className="text-brand-600">Prestige</span></span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
            {(userProfile?.role === 'courtier' || userProfile?.role === 'aide_courtier') && (
              <button
                onClick={onServicesClick}
                className="flex items-center gap-2 text-slate-600 hover:text-brand-600 px-5 py-2.5 rounded-xl font-bold transition-all text-xs uppercase tracking-widest"
              >
                <Zap className="w-4 h-4" />
                Services
              </button>
            )}

            <button
              onClick={() => {
                onHomeClick();
                setTimeout(() => {
                  document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="flex items-center gap-2 text-slate-600 hover:text-brand-600 px-5 py-2.5 rounded-xl font-bold transition-all text-xs uppercase tracking-widest"
            >
              <HelpCircle className="w-4 h-4" />
              FAQ
            </button>

            <button
              onClick={onMissionsClick}
              className="flex items-center gap-2 text-slate-600 hover:text-brand-600 px-5 py-2.5 rounded-xl font-bold transition-all text-xs uppercase tracking-widest"
            >
              <Rocket className="w-4 h-4" />
              Missions
            </button>

            <button
              onClick={onRequestsClick}
              className="flex items-center gap-2 text-slate-600 hover:text-brand-600 px-5 py-2.5 rounded-xl font-bold transition-all text-xs uppercase tracking-widest"
            >
              <Search className="w-4 h-4" />
              Demandes
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200" />

          {/* Currency Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
              className="flex items-center gap-2 bg-slate-100/50 hover:bg-slate-200/50 text-slate-700 px-4 py-2.5 rounded-xl font-bold transition-all text-sm border border-slate-200/50"
            >
              <Globe className="w-4 h-4" />
              {currency}
            </button>
            <AnimatePresence>
              {showCurrencyMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCurrencyMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-32 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 overflow-hidden"
                  >
                    {(['FCFA', 'EUR', 'USD'] as Currency[]).map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setCurrency(c);
                          setShowCurrencyMenu(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 transition-colors ${
                          currency === c ? 'text-brand-600 bg-brand-50/50' : 'text-slate-700'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {user ? (
            <div className="flex items-center gap-4">
              {isAdmin && (
                <button
                  onClick={onAdminClick}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-slate-900/10 relative"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin
                  {adminAlertsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                  )}
                </button>
              )}
              {(userProfile?.role === 'courtier' || userProfile?.role === 'aide_courtier') && (
                <button
                  onClick={onAddListing}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-brand-600/20"
                >
                  <Plus className="w-4 h-4" />
                  Publier
                </button>
              )}
              
              <div className="flex items-center gap-2">
                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all relative"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showNotifications && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 py-4 z-50 overflow-hidden"
                        >
                          <div className="px-5 mb-4 flex items-center justify-between">
                            <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Notifications</h3>
                            {unreadCount > 0 && (
                              <span className="text-[10px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full font-black">
                                {unreadCount} nouvelles
                              </span>
                            )}
                          </div>

                          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {notifications.length > 0 ? (
                              notifications.map((n) => (
                                <div
                                  key={n.id}
                                  onClick={() => markAsRead(n.id)}
                                  className={`px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer border-l-4 ${
                                    n.read ? 'border-transparent opacity-60' : 'border-brand-600 bg-brand-50/30'
                                  }`}
                                >
                                  <div className="flex gap-3">
                                    <div className={`mt-1 p-1.5 rounded-lg ${n.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-100 text-brand-600'}`}>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-xs font-bold text-slate-900 mb-0.5">{n.title}</p>
                                      <p className="text-[11px] text-slate-600 leading-relaxed mb-1">{n.message}</p>
                                      <p className="text-[9px] text-slate-400 font-medium mt-2">
                                        {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString('fr-FR') : 'À l\'instant'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="py-12 text-center">
                                <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                <p className="text-xs text-slate-400 italic">Aucune notification</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                <button 
                  onClick={onProfileClick}
                  className="flex items-center gap-3 hover:bg-slate-50 p-1.5 pr-4 rounded-2xl transition-all border border-transparent hover:border-slate-200"
                >
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center text-brand-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-900 leading-none mb-1">{user.displayName || user.email?.split('@')[0]}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">{userProfile?.role || 'Membre'}</p>
                  </div>
                </button>

                <button
                  onClick={() => signOut(auth)}
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Déconnexion"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={onAuthClick}
                className="text-slate-600 hover:text-slate-900 px-5 py-2.5 rounded-xl font-bold transition-all text-sm"
              >
                Se connecter
              </button>
              <button
                onClick={handleInscriptionClick}
                className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-brand-600/20"
              >
                S'inscrire
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="lg:hidden flex items-center gap-2">
          {user && (
             <div className="relative">
             <button
               onClick={() => setShowNotifications(!showNotifications)}
               className="p-2 text-slate-400 hover:text-brand-600 relative"
             >
               <Bell className="w-5 h-5" />
               {unreadCount > 0 && (
                 <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">
                   {unreadCount}
                 </span>
               )}
             </button>
           </div>
          )}
          <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            <Search className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-[90] lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[80%] max-w-sm bg-white z-[100] lg:hidden shadow-2xl p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-12">
                <span className="text-xl font-black text-slate-900">Menu</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 flex-1">
                {(userProfile?.role === 'courtier' || userProfile?.role === 'aide_courtier') && (
                  <button
                    onClick={() => { onServicesClick(); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-900 font-bold hover:bg-brand-50 hover:text-brand-600 transition-all"
                  >
                    <Zap className="w-5 h-5" />
                    Services Pro
                  </button>
                )}
                <button
                  onClick={() => { 
                    onHomeClick(); 
                    setIsMobileMenuOpen(false);
                    setTimeout(() => {
                      document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-900 font-bold hover:bg-brand-50 hover:text-brand-600 transition-all"
                >
                  <HelpCircle className="w-5 h-5" />
                  FAQ
                </button>
                <button
                  onClick={() => { onMissionsClick(); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-900 font-bold hover:bg-brand-50 hover:text-brand-600 transition-all"
                >
                  <Rocket className="w-5 h-5" />
                  Missions Urgentes
                </button>
                <button
                  onClick={() => { onRequestsClick(); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-900 font-bold hover:bg-brand-50 hover:text-brand-600 transition-all"
                >
                  <Search className="w-5 h-5" />
                  Demandes
                </button>
                
                <div className="h-px bg-slate-100 my-6" />

                {user ? (
                  <>
                    <button
                      onClick={() => { onProfileClick(); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-900 font-bold"
                    >
                      <User className="w-5 h-5" />
                      Mon Profil
                    </button>
                    {(userProfile?.role === 'courtier' || userProfile?.role === 'aide_courtier') && (
                      <button
                        onClick={() => { onAddListing(); setIsMobileMenuOpen(false); }}
                        className="w-full flex items-center justify-center gap-4 p-5 rounded-2xl bg-brand-600 text-white font-black shadow-lg shadow-brand-600/20"
                      >
                        <Plus className="w-5 h-5" />
                        Publier une annonce
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => { onAdminClick(); setIsMobileMenuOpen(false); }}
                        className="w-full flex items-center gap-4 p-5 rounded-2xl bg-slate-900 text-white font-bold relative"
                      >
                        <ShieldCheck className="w-5 h-5" />
                        Administration
                        {adminAlertsCount > 0 && (
                          <span className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse" />
                        )}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={() => { onAuthClick(); setIsMobileMenuOpen(false); }}
                      className="w-full p-5 rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-900 font-black text-lg"
                    >
                      Se connecter
                    </button>
                    <button
                      onClick={handleInscriptionClick}
                      className="w-full p-5 rounded-2xl bg-brand-600 text-white font-black text-lg shadow-xl shadow-brand-600/20"
                    >
                      S'inscrire
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-8 border-t border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Devise</span>
                  <div className="flex gap-2">
                    {(['FCFA', 'EUR', 'USD'] as Currency[]).map((c) => (
                      <button
                        key={c}
                        onClick={() => setCurrency(c)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          currency === c ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                {user && (
                  <button
                    onClick={() => { signOut(auth); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-center gap-2 text-red-500 font-bold py-4 rounded-2xl hover:bg-red-50 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    Déconnexion
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </nav>
    </div>
  );
}
