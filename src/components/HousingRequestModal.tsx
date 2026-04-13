import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Home, Phone, DollarSign, Send, Sparkles } from 'lucide-react';
import { NEIGHBORHOODS, PROPERTY_TYPES, Neighborhood, PropertyType, UserProfile } from '../types';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useAuthState } from 'react-firebase-hooks/auth';

interface HousingRequestModalProps {
  key?: string;
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
}

export default function HousingRequestModal({ isOpen, onClose, userProfile }: HousingRequestModalProps) {
  const [user] = useAuthState(auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    neighborhood: '' as Neighborhood,
    type: 'Appartement' as PropertyType,
    budget: '',
    description: '',
    whatsapp: userProfile?.phone || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'housing_requests'), {
        userId: user.uid,
        userName: userProfile.displayName || 'Client',
        userPhoto: user.photoURL || '',
        neighborhood: formData.neighborhood,
        type: formData.type,
        budget: parseInt(formData.budget),
        description: formData.description,
        whatsapp: formData.whatsapp,
        status: 'Ouvert',
        createdAt: serverTimestamp(),
      });
      
      setFormData({
        neighborhood: '' as Neighborhood,
        type: 'Appartement' as PropertyType,
        budget: '',
        description: '',
        whatsapp: userProfile?.phone || '',
      });
      onClose();
    } catch (error) {
      handleFirestoreError(auth, error, OperationType.CREATE, 'housing_requests');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        key="housing-request-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />
      <motion.div
        key="housing-request-modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div>
                <h2 className="text-2xl font-black">Ma Demande</h2>
                <p className="text-blue-100 text-sm font-medium">Dites-nous ce que vous cherchez</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Quartier souhaité</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        required
                        className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-blue-500 outline-none font-bold transition-all appearance-none"
                        value={formData.neighborhood}
                        onChange={e => setFormData({ ...formData, neighborhood: e.target.value as Neighborhood })}
                      >
                        <option value="">Sélectionner un quartier</option>
                        {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-500">Type</label>
                      <select
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-blue-500 outline-none font-bold transition-all appearance-none"
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value as PropertyType })}
                      >
                        {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-500">Budget Max (FCFA)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          required
                          type="number"
                          className="w-full pl-10 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-blue-500 outline-none font-bold transition-all"
                          value={formData.budget}
                          onChange={e => setFormData({ ...formData, budget: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">Précisions (Chambres, étage...)</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Ex: Je cherche un studio avec balcon au 1er étage..."
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-blue-500 outline-none font-bold transition-all resize-none"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500">WhatsApp pour vous contacter</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      required
                      type="tel"
                      placeholder="Ex: 221771234567"
                      className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:border-blue-500 outline-none font-bold transition-all"
                      value={formData.whatsapp}
                      onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Envoi...' : (
                  <>
                    Publier ma demande
                    <Send className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
    </div>
  );
}
