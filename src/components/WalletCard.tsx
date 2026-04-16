import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, Plus, X, Upload, CheckCircle2, Info, ArrowRight, AlertCircle, Clock, Eye, EyeOff, ChevronDown, ChevronUp, Landmark, Loader2, Phone, History } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useCurrency } from '../lib/currency';

interface WalletCardProps {
  userProfile?: UserProfile | null;
}

export default function WalletCard({ userProfile: propUserProfile }: WalletCardProps) {
  const [user] = useAuthState(auth);
  const [internalUserProfile, setInternalUserProfile] = useState<UserProfile | null>(null);
  const userProfile = propUserProfile || internalUserProfile;
  const { formatPrice } = useCurrency();
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawFirstName, setWithdrawFirstName] = useState('');
  const [withdrawLastName, setWithdrawLastName] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'Wave' | 'Orange Money'>('Wave');

  const [formData, setFormData] = useState({
    amount: '',
    captureUrl: '',
  });

  const tariffs = [2000, 5000, 10000];

  useEffect(() => {
    if (user && !propUserProfile) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        if (doc.exists()) {
          setInternalUserProfile(doc.data() as UserProfile);
        }
      }, (error) => {
        handleFirestoreError(auth, error, OperationType.GET, `users/${user.uid}`);
      });
      return () => unsubscribe();
    }
  }, [user, propUserProfile]);

  useEffect(() => {
    const handleOpenRecharge = () => {
      setIsRechargeModalOpen(true);
    };
    window.addEventListener('open-recharge', handleOpenRecharge);
    return () => window.removeEventListener('open-recharge', handleOpenRecharge);
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("L'image est trop lourde (max 5MB)");
      return;
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      setUploadError("Configuration Cloudinary manquante.");
      return;
    }

    setIsUploading(true);
    try {
      const formDataCloudinary = new FormData();
      formDataCloudinary.append('file', file);
      formDataCloudinary.append('upload_preset', uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formDataCloudinary,
        }
      );

      if (!response.ok) throw new Error("Erreur upload");

      const data = await response.json();
      setFormData(prev => ({ ...prev, captureUrl: data.secure_url }));
    } catch (err) {
      setUploadError("Échec de l'envoi de l'image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.captureUrl || !formData.amount) return;

    const amount = parseInt(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setUploadError("Veuillez saisir un montant valide");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'recharge_requests'), {
        userId: user.uid,
        userName: userProfile?.displayName || user.email,
        userEmail: user.email,
        montant: amount,
        tarifChoisi: amount,
        amount: amount, // Adding amount for consistency with AdminPaymentManagement
        captureUrl: formData.captureUrl,
        status: 'en_attente',
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      setSuccessMessage("Votre demande de recharge a été envoyée avec succès. Elle sera validée par un administrateur sous peu.");
      setFormData({ amount: '', captureUrl: '' });
      setTimeout(() => {
        setIsRechargeModalOpen(false);
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.CREATE, 'recharge_requests');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !withdrawAmount || !withdrawPhone || !withdrawFirstName || !withdrawLastName) return;
    const amount = parseInt(withdrawAmount);
    if (isNaN(amount) || amount < 5000) {
      alert("Le montant minimum est de 5 000 FCFA");
      return;
    }
    if (amount > (userProfile?.balance || 0)) {
      alert("Solde insuffisant");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'withdrawal_requests'), {
        userId: user.uid,
        userName: userProfile?.displayName || user.email,
        userEmail: user.email,
        firstName: withdrawFirstName,
        lastName: withdrawLastName,
        amount: amount,
        method: withdrawMethod,
        phoneNumber: withdrawPhone,
        status: 'en_attente',
        createdAt: serverTimestamp(),
      });

      setSuccessMessage("Votre demande de retrait a été envoyée avec succès.");
      setWithdrawAmount('');
      setWithdrawPhone('');
      setWithdrawFirstName('');
      setWithdrawLastName('');
      setTimeout(() => {
        setIsWithdrawModalOpen(false);
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.CREATE, 'withdrawal_requests');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isIdentityComplete = !!(userProfile?.nom && userProfile?.prenom);

  if (!userProfile) return null;

  return (
    <div className="space-y-6">
      {/* Wallet Card - Fintech Prestige Design */}
      <div className="bg-[#0a0a0a] rounded-[2.5rem] p-8 sm:p-10 text-white shadow-[0_40px_80px_rgba(0,0,0,0.4)] relative overflow-hidden border border-white/5 group">
        {/* Subtle Carbon Fiber Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay" />
        
        {/* Suble Radial Gradient: Deep Night Blue to Ebony Black */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#1a2a4a_0%,#0a0a0a_70%)] opacity-80" />
        
        {/* Decorative Senegal Map Stylized (Subtle) */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 opacity-[0.03] pointer-events-none">
          <svg viewBox="0 0 200 200" fill="currentColor" className="w-full h-full text-white">
            <path d="M10,100 Q50,10 100,100 T190,100" />
          </svg>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 backdrop-blur-md">
                <Wallet className="w-6 h-6 text-[#d4af37]" />
              </div>
              <span className="font-Montserrat font-light uppercase tracking-[0.4em] text-gray-300 text-[10px] sm:text-[11px]">Dakar Prestige Wallet</span>
            </div>
            <button 
              onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              className="p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-90 text-gray-400"
            >
              {isBalanceVisible ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
            </button>
          </div>
          
          <div className="mb-12">
            <span className="text-gray-500 text-[10px] font-bold block mb-3 uppercase tracking-[0.2em]">Solde Disponible</span>
            <div className="relative inline-block">
              <h2 className="text-5xl sm:text-7xl font-black bg-gradient-to-b from-[#f3e7ad] via-[#d4af37] to-[#8a6d3b] bg-clip-text text-transparent tracking-tighter drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                {isBalanceVisible ? formatPrice(userProfile.balance || 0) : '•••••• FCFA'}
              </h2>
              {isBalanceVisible && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1500 pointer-events-none" />
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <button
              onClick={() => {
                if (!isIdentityComplete) {
                  alert("Veuillez renseigner votre Nom et Prénom dans votre profil avant de recharger.");
                  return;
                }
                setIsRechargeModalOpen(true);
              }}
              className="flex-1 bg-gradient-to-r from-[#d4af37] via-[#f3e7ad] to-[#d4af37] text-[#0a192f] py-4 sm:py-5 rounded-full font-black flex items-center justify-center gap-3 hover:brightness-110 transition-all shadow-[0_20px_40px_rgba(212,175,55,0.2)] active:scale-95 text-xs sm:text-sm uppercase tracking-widest relative overflow-hidden group/btn"
            >
              <Plus className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Recharger</span>
            </button>
            <button
              onClick={() => setIsWithdrawModalOpen(true)}
              disabled={(userProfile.balance || 0) < 5000 || !isIdentityComplete}
              className="flex-1 bg-white/5 text-gray-300 py-4 sm:py-5 rounded-full font-black flex items-center justify-center gap-3 hover:bg-white/10 transition-all border border-white/10 disabled:opacity-20 disabled:cursor-not-allowed active:scale-95 text-xs sm:text-sm uppercase tracking-widest backdrop-blur-sm"
            >
              <ArrowRight className="w-5 h-5 rotate-[-45deg]" />
              Retrait
            </button>
          </div>
          {!isIdentityComplete ? (
            <p className="text-[10px] text-red-400 mt-6 text-center font-bold uppercase tracking-[0.1em] flex items-center justify-center gap-2">
              <AlertCircle className="w-3 h-3" /> Identité incomplète : Accès restreint
            </p>
          ) : (userProfile.balance || 0) < 5000 && (
            <p className="text-[9px] text-gray-500 mt-6 text-center font-bold uppercase tracking-[0.2em] opacity-60">
              Retrait possible à partir de 5 000 FCFA
            </p>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-blue-900/5">
        <button 
          onClick={() => setIsHistoryVisible(!isHistoryVisible)}
          className="w-full flex items-center justify-between mb-6 group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-xl text-gray-400 group-hover:text-blue-600 transition-colors">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-gray-900">Historique des transactions</h3>
          </div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
            {isHistoryVisible ? 'Masquer' : 'Afficher les détails'}
            {isHistoryVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        <AnimatePresence>
          {isHistoryVisible && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-4">
                {(!userProfile.transactions || userProfile.transactions.length === 0) ? (
                  <div className="text-center py-12 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                    <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm font-bold italic">Aucune transaction pour le moment.</p>
                  </div>
                ) : (
                  userProfile.transactions.slice().reverse().map((tx, idx) => (
                    <div key={tx.id || idx} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-gray-50/30 border border-gray-100 hover:bg-gray-50 hover:border-blue-100 transition-all group/tx">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                          tx.type === 'deposit' || tx.type === 'commission' 
                            ? 'bg-emerald-50 text-emerald-600 group-hover/tx:bg-emerald-500 group-hover/tx:text-white' 
                            : 'bg-red-50 text-red-600 group-hover/tx:bg-red-500 group-hover/tx:text-white'
                        }`}>
                          {tx.type === 'deposit' || tx.type === 'commission' ? <Plus className="w-5 h-5" /> : <ArrowRight className="w-5 h-5 rotate-45" />}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-sm mb-1">{tx.description}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                              tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                              tx.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {tx.status === 'completed' ? 'Validé' : tx.status === 'rejected' ? 'Rejeté' : 'En attente'}
                            </span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                              {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString('fr-FR') : 
                               tx.createdAt instanceof Date ? tx.createdAt.toLocaleDateString('fr-FR') :
                               new Date(tx.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-black text-base ${
                          tx.type === 'deposit' || tx.type === 'commission' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {tx.type === 'deposit' || tx.type === 'commission' ? '+' : '-'}{formatPrice(tx.amount)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recharge Modal */}
      <AnimatePresence>
        {isRechargeModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setIsRechargeModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2rem] p-5 sm:p-8 max-w-md w-full shadow-2xl overflow-y-auto max-h-[95vh] no-scrollbar"
            >
              <button
                onClick={() => setIsRechargeModalOpen(false)}
                className="absolute top-3 right-3 sm:top-6 sm:right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <div className="mb-4 sm:mb-8">
                <h3 className="text-lg sm:text-2xl font-black text-gray-900 mb-0.5 sm:mb-2">Recharger mon compte</h3>
                <p className="text-gray-500 text-[10px] sm:text-sm font-medium">Effectuez un transfert manuel pour recharger votre solde.</p>
              </div>

              {successMessage ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center"
                >
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <p className="text-emerald-900 font-bold leading-relaxed">{successMessage}</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-6">
                  {/* Instructions */}
                  <div className="bg-blue-50 border border-blue-100 p-3 sm:p-5 rounded-xl sm:rounded-2xl">
                    <div className="flex items-start gap-2 sm:gap-3 mb-1 sm:mb-3">
                      <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5" />
                      <h4 className="font-black text-blue-900 text-[10px] sm:text-sm uppercase tracking-tight">Instructions de paiement</h4>
                    </div>
                    <p className="text-blue-800 text-[10px] sm:text-sm leading-relaxed">
                      Envoyez <span className="font-bold">{formData.amount || '0'} FCFA</span> par <span className="font-bold">Wave</span> au :
                      <br />
                      <span className="text-sm sm:text-lg font-black block mt-0.5">+221 78 578 34 43</span>
                      Puis uploadez la capture du reçu.
                    </p>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-1.5 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Montant (FCFA)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="Ex: 2000"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl px-4 py-2.5 sm:px-6 sm:py-4 outline-none focus:border-blue-500 font-black text-base sm:text-xl"
                        required
                      />
                      <span className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs sm:text-base">FCFA</span>
                    </div>
                  </div>

                  {/* Upload Receipt */}
                  <div className="space-y-1.5 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Preuve de paiement</label>
                    {formData.captureUrl ? (
                      <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border-2 border-emerald-100 aspect-video">
                        <img src={formData.captureUrl} alt="Reçu" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, captureUrl: '' })}
                          className="absolute top-2 right-2 p-1 bg-white/90 hover:bg-white rounded-full text-red-500 shadow-lg"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className={`flex flex-col items-center justify-center gap-1.5 sm:gap-3 p-3 sm:p-8 rounded-xl sm:rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                        isUploading ? 'bg-gray-50 border-gray-200' : 'bg-gray-50 border-gray-200 hover:border-blue-400 hover:bg-blue-50/30'
                      }`}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={isUploading}
                        />
                        {isUploading ? (
                          <div className="w-5 h-5 sm:w-8 sm:h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <div className="p-1.5 sm:p-3 bg-white rounded-lg sm:rounded-xl shadow-sm">
                              <Upload className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                            </div>
                            <span className="text-[10px] sm:text-sm font-bold text-gray-500 text-center">Uploader le reçu</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.captureUrl || isUploading}
                    className="w-full bg-blue-600 text-white py-2.5 sm:py-4 rounded-xl sm:rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 text-xs sm:text-base"
                  >
                    {isSubmitting ? 'Envoi...' : (
                      <>
                        Confirmer la recharge
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Withdrawal Modal */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setIsWithdrawModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2rem] p-5 sm:p-8 max-w-md w-full shadow-2xl overflow-y-auto max-h-[95vh] no-scrollbar"
            >
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="absolute top-3 right-3 sm:top-6 sm:right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <div className="mb-4 sm:mb-8">
                <h3 className="text-lg sm:text-2xl font-black text-gray-900 mb-0.5 sm:mb-2">Demander un retrait</h3>
                <p className="text-gray-500 text-[10px] sm:text-sm font-medium">Récupérez vos gains sur votre compte mobile money.</p>
              </div>

              {successMessage ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center"
                >
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <p className="text-emerald-900 font-bold leading-relaxed">{successMessage}</p>
                </motion.div>
              ) : (
                <form onSubmit={handleWithdrawSubmit} className="space-y-3 sm:space-y-6">
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Prénom</label>
                      <input
                        type="text"
                        value={withdrawFirstName}
                        onChange={(e) => setWithdrawFirstName(e.target.value)}
                        placeholder="Ex: Jean"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl px-4 py-2.5 sm:px-6 sm:py-4 outline-none focus:border-blue-500 font-bold text-xs sm:text-base"
                        required
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Nom</label>
                      <input
                        type="text"
                        value={withdrawLastName}
                        onChange={(e) => setWithdrawLastName(e.target.value)}
                        placeholder="Ex: Dupont"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl px-4 py-2.5 sm:px-6 sm:py-4 outline-none focus:border-blue-500 font-bold text-xs sm:text-base"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Montant (FCFA)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="Min. 5000"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl px-4 py-2.5 sm:px-6 sm:py-4 outline-none focus:border-blue-500 font-black text-base sm:text-xl"
                        min="5000"
                        max={userProfile.balance}
                        required
                      />
                      <span className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs sm:text-base">FCFA</span>
                    </div>
                    {parseInt(withdrawAmount) > (userProfile.balance || 0) && (
                      <p className="text-[9px] font-bold text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Solde insuffisant
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Téléphone</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={withdrawPhone}
                        onChange={(e) => setWithdrawPhone(e.target.value)}
                        placeholder="7x xxx xx xx"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl px-4 py-2.5 sm:px-6 sm:py-4 outline-none focus:border-blue-500 font-bold text-xs sm:text-base"
                        required
                      />
                      <Phone className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-5 sm:h-5" />
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Méthode</label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setWithdrawMethod('Wave')}
                        className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 flex flex-col items-center gap-1 sm:gap-2 transition-all ${
                          withdrawMethod === 'Wave' ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${withdrawMethod === 'Wave' ? 'bg-blue-600 text-white' : 'bg-white text-gray-400'}`}>
                          <Landmark className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        </div>
                        <span className={`text-[9px] sm:text-xs font-black ${withdrawMethod === 'Wave' ? 'text-blue-600' : 'text-gray-400'}`}>Wave</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWithdrawMethod('Orange Money')}
                        className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 flex flex-col items-center gap-1 sm:gap-2 transition-all ${
                          withdrawMethod === 'Orange Money' ? 'border-orange-500 bg-orange-50' : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${withdrawMethod === 'Orange Money' ? 'bg-orange-500 text-white' : 'bg-white text-gray-400'}`}>
                          <Landmark className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        </div>
                        <span className={`text-[9px] sm:text-xs font-black ${withdrawMethod === 'Orange Money' ? 'text-orange-500' : 'text-gray-400'}`}>Orange</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !withdrawAmount || !withdrawPhone || parseInt(withdrawAmount) < 5000 || parseInt(withdrawAmount) > (userProfile.balance || 0)}
                    className="w-full bg-[#0a192f] text-[#d4af37] py-2.5 sm:py-4 rounded-xl sm:rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl hover:bg-black transition-all disabled:opacity-50 text-xs sm:text-base"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : (
                      <>
                        Confirmer le retrait
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Historique des Transactions */}
      <div className="mt-8 sm:mt-12">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-sm sm:text-lg font-black text-gray-900 flex items-center gap-2">
            <History className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            Mon Historique
          </h3>
          <span className="text-[10px] sm:text-xs font-bold text-gray-400">
            {userProfile.transactions?.length || 0} opérations
          </span>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-bottom border-gray-100">
                  <th className="px-4 py-3 sm:px-6 sm:py-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Type</th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Montant</th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {userProfile.transactions && userProfile.transactions.length > 0 ? (
                  [...userProfile.transactions].sort((a: any, b: any) => {
                    const dateA = a.createdAt?.seconds || 0;
                    const dateB = b.createdAt?.seconds || 0;
                    return dateB - dateA;
                  }).map((tx: any, idx: number) => (
                    <tr key={tx.id || idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-500">
                          {tx.createdAt ? new Date(tx.createdAt.seconds * 1000).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          }) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <div className="flex flex-col">
                          <span className={`text-[10px] sm:text-xs font-black ${
                            tx.type === 'RECHARGE' ? 'text-emerald-600' : 
                            tx.type === 'ACHAT_SERVICE' ? 'text-blue-600' : 'text-gray-900'
                          }`}>
                            {tx.type}
                          </span>
                          <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 truncate max-w-[120px]">
                            {tx.description}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <span className={`text-[10px] sm:text-xs font-black ${
                          tx.type === 'RECHARGE' ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          {tx.type === 'RECHARGE' ? '+' : '-'}{tx.amount.toLocaleString()} F
                        </span>
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase ${
                          tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                          tx.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {tx.status === 'completed' ? 'Réussi' : tx.status === 'pending' ? 'En cours' : tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 sm:px-6 sm:py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <History className="w-6 h-6 sm:w-8 sm:h-8 text-gray-200" />
                        <p className="text-[10px] sm:text-xs font-bold text-gray-400">Aucune transaction pour le moment</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
