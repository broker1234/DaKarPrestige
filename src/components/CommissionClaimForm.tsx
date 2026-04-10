import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, CheckCircle2, User, DollarSign, AlertCircle } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types';

interface CommissionClaimFormProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  userProfile: UserProfile | null;
}

export default function CommissionClaimForm({ isOpen, onClose, listingId, listingTitle, userProfile }: CommissionClaimFormProps) {
  const [clientName, setClientName] = useState('');
  const [commission, setCommission] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !userProfile || !clientName || !commission) return;

    setIsSubmitting(true);
    try {
      // 1. Create the claim in Firestore
      await addDoc(collection(db, 'commission_claims'), {
        affiliateId: auth.currentUser.uid,
        affiliateName: userProfile.displayName,
        affiliateEmail: userProfile.email,
        listingId,
        listingTitle,
        clientName: clientName.trim(),
        promisedCommission: parseFloat(commission),
        status: "En attente",
        createdAt: serverTimestamp()
      });

      // 2. Simulate email alert to Peter (in a real app, this would be a cloud function)
      console.log("Email alert sent to peter25ngouala@gmail.com with claim details.");

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        setClientName('');
        setCommission('');
      }, 3000);
    } catch (error) {
      console.error("Error submitting commission claim:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-hidden"
          >
            {isSuccess ? (
              <div className="text-center py-8">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Déclaration envoyée !</h3>
                <p className="text-gray-500">
                  Peter a été informé. Votre demande est en cours de traitement par le "Juge de Paix".
                </p>
              </div>
            ) : (
              <>
                <button 
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>

                <div className="mb-8">
                  <div className="bg-amber-100 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Juge de Paix</h3>
                  <p className="text-gray-500 text-sm">
                    Déclarez votre vente pour l'annonce <span className="font-bold text-gray-900">"{listingTitle}"</span> pour garantir votre commission.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Nom du client envoyé
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Ex: Jean Dupont"
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Commission promise (FCFA)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        required
                        value={commission}
                        onChange={(e) => setCommission(e.target.value)}
                        placeholder="Ex: 50000"
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-700"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Confirmer ma vente
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
  );
}
