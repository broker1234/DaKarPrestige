import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Eye, Clock, DollarSign, User, Calendar, ExternalLink, AlertCircle, Search, Filter, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { db, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, arrayUnion, increment } from 'firebase/firestore';
import { RechargeRequest, Transaction } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useCurrency } from '../lib/currency';

export default function AdminPaymentManagement() {
  const [user] = useAuthState(auth);
  const [requests, setRequests] = useState<RechargeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { formatPrice } = useCurrency();
  const [filter, setFilter] = useState<'en_attente' | 'valide' | 'rejete'>('en_attente');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !auth.currentUser) return;

    const q = query(
      collection(db, 'recharge_requests'),
      where('status', '==', filter)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RechargeRequest[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(auth, error, OperationType.LIST, 'recharge_requests');
    });

    return () => unsubscribe();
  }, [filter, user]);

  const handleApprove = async (request: RechargeRequest) => {
    try {
      setActionLoading(request.id);
      const transactionId = Math.random().toString(36).substring(2, 15);
      const newTransaction: Transaction = {
        id: transactionId,
        type: 'deposit',
        amount: request.amount,
        description: `Recharge Portefeuille (Wave)`,
        status: 'completed',
        createdAt: new Date()
      };

      // 1. Update user balance and transactions
      const userRef = doc(db, 'users', request.userId);
      await updateDoc(userRef, {
        balance: increment(request.amount),
        transactions: arrayUnion(newTransaction)
      });

      // 2. Update request status
      await updateDoc(doc(db, 'recharge_requests', request.id), {
        status: 'valide',
        processedAt: serverTimestamp(),
      });

    } catch (error) {
      handleFirestoreError(auth, error, OperationType.UPDATE, 'recharge_requests');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (request: RechargeRequest) => {
    try {
      setActionLoading(request.id);
      await updateDoc(doc(db, 'recharge_requests', request.id), {
        status: 'rejete',
        rejectionReason: 'Rejeté par l\'administrateur',
        processedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.UPDATE, 'recharge_requests');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Gestion des Paiements</h2>
          <p className="text-gray-500 font-medium">Validez les demandes de recharge des utilisateurs.</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-2xl">
          {(['en_attente', 'valide', 'rejete'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === s
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'en_attente' ? 'En attente' : s === 'valide' ? 'Validés' : 'Rejetés'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-20 text-center border border-dashed border-gray-200">
          <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">Aucune demande</h3>
          <p className="text-gray-500">Il n'y a aucune demande de recharge avec ce statut pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((request) => (
            <motion.div
              key={request.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-xl shadow-blue-900/5 hover:shadow-blue-900/10 transition-all"
            >
              {/* Receipt Preview */}
              <div className="relative aspect-video group cursor-pointer" onClick={() => setSelectedImage(request.captureUrl)}>
                <img src={request.captureUrl} alt="Reçu" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white/20 backdrop-blur-md p-3 rounded-full">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="absolute top-4 left-4">
                  <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-600 shadow-lg">
                    {formatPrice(request.amount)}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-black text-gray-900 leading-tight mb-1">{request.userName || 'Utilisateur'}</h4>
                    <p className="text-xs text-gray-500 font-medium">{request.userEmail}</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-xl">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">
                  <Calendar className="w-3 h-3" />
                  {request.createdAt?.toDate ? request.createdAt.toDate().toLocaleString('fr-FR') : 'Récemment'}
                </div>

                {request.status === 'en_attente' && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleReject(request)}
                      disabled={actionLoading === request.id}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 text-red-600 font-black text-xs hover:bg-red-100 transition-all disabled:opacity-50"
                    >
                      {actionLoading === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Rejeter
                    </button>
                    <button
                      onClick={() => handleApprove(request)}
                      disabled={actionLoading === request.id}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-black text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                    >
                      {actionLoading === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Valider
                    </button>
                  </div>
                )}

                {request.status === 'valide' && (
                  <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-50 text-emerald-600 font-black text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    Paiement Validé
                  </div>
                )}

                {request.status === 'rejete' && (
                  <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 text-red-600 font-black text-xs">
                    <XCircle className="w-4 h-4" />
                    Paiement Rejeté
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center"
            >
              <img src={selectedImage} alt="Reçu Plein Écran" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
