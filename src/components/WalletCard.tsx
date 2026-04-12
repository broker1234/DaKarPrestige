import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, ArrowUpRight, History, CreditCard, Send, CheckCircle2, Clock, XCircle, ChevronRight, Smartphone, Eye, EyeOff, Filter, Globe, User as UserIcon } from 'lucide-react';
import { UserProfile, Transaction, COUNTRIES } from '../types';
import { useCurrency } from '../lib/currency';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

interface WalletCardProps {
  userProfile: UserProfile;
}

export default function WalletCard({ userProfile }: WalletCardProps) {
  const { formatPrice } = useCurrency();
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(userProfile.phone || '');
  const [fullName, setFullName] = useState(userProfile.displayName || '');
  const [country, setCountry] = useState(userProfile.country || '');
  const [paymentMethod, setPaymentMethod] = useState<'Wave' | 'Orange Money'>('Wave');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'Tous' | 'Validés' | 'En attente' | 'Retraits'>('Tous');

  useEffect(() => {
    const savedPrivacy = sessionStorage.getItem('walletPrivacy');
    if (savedPrivacy !== null) {
      setIsPrivate(savedPrivacy === 'true');
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('walletPrivacy', isPrivate.toString());
  }, [isPrivate]);

  const balance = userProfile.balance || 0;
  const WITHDRAWAL_THRESHOLD = 5000;
  const progress = Math.min((balance / WITHDRAWAL_THRESHOLD) * 100, 100);
  const remaining = Math.max(WITHDRAWAL_THRESHOLD - balance, 0);

  const transactions = [...(userProfile.transactions || [])]
    .filter(tx => {
      if (activeFilter === 'Validés') return tx.status === 'completed';
      if (activeFilter === 'En attente') return tx.status === 'pending';
      if (activeFilter === 'Retraits') return tx.type === 'withdrawal';
      return true;
    })
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(withdrawAmount);
    if (isNaN(amount) || amount < WITHDRAWAL_THRESHOLD || amount > balance) return;

    setIsSubmitting(true);
    try {
      const transactionId = Math.random().toString(36).substring(2, 15);
      const newTransaction: Transaction = {
        id: transactionId,
        type: 'withdrawal',
        amount: amount,
        description: `Retrait ${paymentMethod} - ${fullName} (${country})`,
        status: 'pending',
        createdAt: new Date()
      };

      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        balance: balance - amount,
        transactions: arrayUnion(newTransaction)
      });

      const adminPhone = "221789619088";
      const message = `Demande de retrait Portefeuille\n\nUtilisateur: ${fullName}\nPays: ${country}\nMode: ${paymentMethod}\nMontant: ${formatPrice(amount)}\nNuméro: ${phoneNumber}\nID Transaction: ${transactionId}`;
      const whatsappUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`;
      
      setSuccess(true);
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
        setIsWithdrawModalOpen(false);
        setSuccess(false);
        setWithdrawAmount('');
      }, 2000);

    } catch (error) {
      console.error("Error requesting withdrawal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Wallet Card - Gradient Blue/Black */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-slate-900 to-black rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-900/20 group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl group-hover:bg-brand-500/20 transition-colors" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                <Wallet className="w-6 h-6 text-brand-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mon Solde</p>
                <h3 className="text-sm font-bold text-white">Gains Aide-Courtier</h3>
              </div>
            </div>
            <button 
              onClick={() => setIsPrivate(!isPrivate)}
              className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all"
              title={isPrivate ? "Afficher le solde" : "Masquer le solde"}
            >
              {isPrivate ? <EyeOff className="w-5 h-5 text-slate-400" /> : <Eye className="w-5 h-5 text-white" />}
            </button>
          </div>

          <div className="mb-8">
            <h2 className="text-5xl font-black tracking-tighter mb-4">
              {isPrivate ? '•••• FCFA' : formatPrice(balance)}
            </h2>
            
            {/* Progress Bar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-400">Progression retrait</span>
                <span className={balance >= WITHDRAWAL_THRESHOLD ? "text-emerald-400" : "text-brand-400"}>
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className={`h-full transition-all duration-1000 ${
                    balance >= WITHDRAWAL_THRESHOLD ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-brand-500"
                  }`}
                />
              </div>
              {remaining > 0 ? (
                <p className="text-[10px] text-slate-400 font-bold italic">
                  Plus que <span className="text-brand-400">{formatPrice(remaining)}</span> avant votre prochain retrait !
                </p>
              ) : (
                <p className="text-[10px] text-emerald-400 font-bold italic">
                  Seuil de retrait atteint ! Vous pouvez retirer vos gains.
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsWithdrawModalOpen(true)}
            disabled={balance < WITHDRAWAL_THRESHOLD}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white py-5 rounded-2xl font-black shadow-xl shadow-brand-600/20 transition-all flex items-center justify-center gap-3 group/btn"
          >
            <Smartphone className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
            Retirer via Wave / Orange
            <ArrowUpRight className="w-5 h-5 opacity-50" />
          </button>
        </div>
      </div>

      {/* Transaction History - Jumia Style */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600">
                <History className="w-5 h-5" />
              </div>
              <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest">Historique des Gains</h4>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {(['Tous', 'Validés', 'En attente', 'Retraits'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeFilter === filter
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {isPrivate ? (
            <div className="py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <EyeOff className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-xs text-slate-400 font-bold italic">Historique masqué en mode confidentialité</p>
              <button 
                onClick={() => setIsPrivate(false)}
                className="mt-4 text-brand-600 text-[10px] font-black uppercase tracking-widest hover:underline"
              >
                Afficher les détails
              </button>
            </div>
          ) : transactions.length > 0 ? (
            transactions.slice(0, 15).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-5 rounded-2xl bg-white border border-slate-100 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/5 transition-all group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    tx.type === 'commission' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600'
                  }`}>
                    {tx.type === 'commission' ? <CheckCircle2 className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 mb-1">{tx.description}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Récemment'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-base font-black ${
                    tx.type === 'commission' ? 'text-emerald-600' : 'text-slate-900'
                  }`}>
                    {tx.type === 'commission' ? '+' : '-'}{formatPrice(tx.amount)}
                  </p>
                  <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-md ${
                    tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                    tx.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                    'bg-red-100 text-red-700'
                  }`}>
                    {tx.status === 'completed' ? 'Payé' : tx.status === 'pending' ? 'En attente' : 'Rejeté'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-slate-200" />
              </div>
              <p className="text-xs text-slate-400 font-bold italic">Aucune transaction pour le moment</p>
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setIsWithdrawModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              {success ? (
                <div className="py-12 text-center">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Demande Envoyée !</h3>
                  <p className="text-slate-500 font-medium">Redirection vers WhatsApp pour confirmer avec l'admin...</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-brand-50 rounded-2xl text-brand-600">
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-black text-slate-900">Demande de Retrait</h3>
                    </div>
                    <button 
                      onClick={() => setIsWithdrawModalOpen(false)}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <XCircle className="w-6 h-6 text-slate-300" />
                    </button>
                  </div>

                  <form onSubmit={handleWithdrawRequest} className="space-y-5 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Payment Method Selection */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mode de paiement</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('Wave')}
                          className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                            paymentMethod === 'Wave' 
                            ? 'border-blue-600 bg-blue-50 text-blue-600' 
                            : 'border-slate-100 bg-slate-50 text-slate-400'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'Wave' ? 'border-blue-600' : 'border-slate-300'}`}>
                            {paymentMethod === 'Wave' && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                          </div>
                          <span className="font-black text-sm">Wave</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('Orange Money')}
                          className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                            paymentMethod === 'Orange Money' 
                            ? 'border-orange-500 bg-orange-50 text-orange-600' 
                            : 'border-slate-100 bg-slate-50 text-slate-400'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'Orange Money' ? 'border-orange-500' : 'border-slate-300'}`}>
                            {paymentMethod === 'Orange Money' && <div className="w-2 h-2 bg-orange-500 rounded-full" />}
                          </div>
                          <span className="font-black text-sm">Orange</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom & Prénom complet</label>
                      <div className="relative">
                        <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          required
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ex: Jean Dupont"
                          className="w-full pl-14 pr-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-brand-500 outline-none font-bold text-sm transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pays</label>
                      <div className="relative">
                        <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <select
                          required
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full pl-14 pr-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-brand-500 outline-none font-bold text-sm transition-all appearance-none"
                        >
                          <option value="">Sélectionner votre pays</option>
                          {COUNTRIES.map(c => (
                            <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant du retrait (FCFA)</label>
                      <div className="relative">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400">FCFA</div>
                        <input
                          required
                          type="number"
                          min={WITHDRAWAL_THRESHOLD}
                          max={balance}
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder={`Min: ${WITHDRAWAL_THRESHOLD}`}
                          className="w-full pl-16 pr-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-brand-500 outline-none font-black text-lg transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold">Solde disponible: {formatPrice(balance)}</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Numéro de téléphone</label>
                      <input
                        required
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Ex: 77 000 00 00"
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-brand-500 outline-none font-black text-lg transition-all"
                      />
                    </div>

                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
                      <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
                        Les retraits sont traités manuellement par l'administrateur sous 24h à 48h.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !withdrawAmount || parseInt(withdrawAmount) > balance}
                      className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          Confirmer le retrait
                          <ChevronRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
