import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { PromoCode } from '../types';
import { Plus, Trash2, Calendar, Tag, CheckCircle2, XCircle, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PromoCodeManager() {
  const [user] = useAuthState(auth);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newPromo, setNewPromo] = useState({
    codeName: '',
    reduction: 0,
    reductionType: 'percent' as 'percent' | 'fixed',
    dateExpiration: '',
    estActif: true,
    afficherBarreDefilante: true
  });

  useEffect(() => {
    if (!user || !auth.currentUser) return;
    const q = query(collection(db, 'promo_codes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPromoCodes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PromoCode[]);
    }, (error) => {
      console.error("PromoCodeManager Snapshot Error:", error);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'promo_codes'), {
        ...newPromo,
        reduction: Number(newPromo.reduction),
        dateExpiration: new Date(newPromo.dateExpiration),
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewPromo({
        codeName: '',
        reduction: 0,
        reductionType: 'percent',
        dateExpiration: '',
        estActif: true,
        afficherBarreDefilante: true
      });
    } catch (error) {
      console.error("Error adding promo code:", error);
    }
  };

  const toggleStatus = async (promo: PromoCode) => {
    try {
      await updateDoc(doc(db, 'promo_codes', promo.id), {
        estActif: !promo.estActif
      });
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const toggleMarquee = async (promo: PromoCode) => {
    try {
      await updateDoc(doc(db, 'promo_codes', promo.id), {
        afficherBarreDefilante: !promo.afficherBarreDefilante
      });
    } catch (error) {
      console.error("Error toggling marquee:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'promo_codes', id));
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting promo code:", error);
    }
  };

  const deleteExpired = async () => {
    const expired = promoCodes.filter(p => {
      const expiration = p.dateExpiration?.toDate ? p.dateExpiration.toDate() : new Date(p.dateExpiration);
      return expiration < new Date();
    });
    
    if (expired.length === 0) {
      alert("Aucun code expiré à supprimer.");
      return;
    }
    
    if (window.confirm(`Supprimer les ${expired.length} codes expirés ?`)) {
      try {
        const batch = writeBatch(db);
        expired.forEach(p => {
          batch.delete(doc(db, 'promo_codes', p.id));
        });
        await batch.commit();
      } catch (error) {
        console.error("Error deleting expired promos:", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Gestion des Codes Promos</h2>
        <div className="flex items-center gap-3">
          {promoCodes.some(p => {
            const exp = p.dateExpiration?.toDate ? p.dateExpiration.toDate() : new Date(p.dateExpiration);
            return exp < new Date();
          }) && (
            <button
              onClick={deleteExpired}
              className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-100 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Nettoyer Expirés
            </button>
          )}
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-brand-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nouveau Code
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-50 p-6 rounded-3xl border border-slate-200"
          >
            <form onSubmit={handleAddPromo} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Code</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: DAKAR20"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 outline-none font-bold"
                  value={newPromo.codeName}
                  onChange={e => setNewPromo({ ...newPromo, codeName: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Réduction</label>
                <div className="flex gap-2">
                  <input
                    required
                    type="number"
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 outline-none font-bold"
                    value={newPromo.reduction}
                    onChange={e => setNewPromo({ ...newPromo, reduction: Number(e.target.value) })}
                  />
                  <select
                    className="px-4 py-3 rounded-xl border border-slate-200 font-bold outline-none"
                    value={newPromo.reductionType}
                    onChange={e => setNewPromo({ ...newPromo, reductionType: e.target.value as 'percent' | 'fixed' })}
                  >
                    <option value="percent">%</option>
                    <option value="fixed">FCFA</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Expiration (Date & Heure)</label>
                <input
                  required
                  type="datetime-local"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 outline-none font-bold"
                  value={newPromo.dateExpiration}
                  onChange={e => setNewPromo({ ...newPromo, dateExpiration: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-6 mt-4 md:col-span-2 lg:col-span-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPromo.afficherBarreDefilante}
                    onChange={e => setNewPromo({ ...newPromo, afficherBarreDefilante: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs font-bold text-slate-600">Afficher sur la barre défilante</span>
                </label>
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 rounded-xl bg-brand-600 text-white font-black hover:bg-brand-700 transition-all"
                  >
                    Créer le Code
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promoCodes.map((promo) => {
          const expiration = promo.dateExpiration?.toDate ? promo.dateExpiration.toDate() : new Date(promo.dateExpiration);
          const isExpired = expiration < new Date();

          return (
            <div key={promo.id} className={`bg-white p-6 rounded-[2rem] border-2 transition-all ${promo.estActif && !isExpired ? 'border-brand-100 shadow-lg shadow-brand-100/20' : 'border-slate-100 opacity-60'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${promo.estActif && !isExpired ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg leading-none mb-1">{promo.codeName}</h3>
                    <p className="text-xs font-bold text-brand-600">
                      -{promo.reduction}{promo.reductionType === 'percent' ? '%' : ' FCFA'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <AnimatePresence mode="wait">
                    {deletingId === promo.id ? (
                      <motion.div
                        key="confirm"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center gap-2"
                      >
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                        >
                          Non
                        </button>
                        <button
                          onClick={() => handleDelete(promo.id)}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all"
                        >
                          Oui
                        </button>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="delete-btn"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setDeletingId(promo.id)}
                        className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                        title="Supprimer le code promo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Calendar className="w-4 h-4" />
                  Expire le : {expiration.toLocaleString('fr-FR')}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleStatus(promo)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                      promo.estActif && !isExpired ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {promo.estActif && !isExpired ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {isExpired ? 'Expiré' : promo.estActif ? 'Actif' : 'Inactif'}
                  </button>
                  <button
                    onClick={() => toggleMarquee(promo)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                      promo.afficherBarreDefilante ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <Megaphone className="w-3 h-3" />
                    {promo.afficherBarreDefilante ? 'En Marquee' : 'Masqué'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
