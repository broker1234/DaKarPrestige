import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, Home, DollarSign, MessageCircle, Clock, User, Search, Lock } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { HousingRequest } from '../types';
import { formatPrice, timeAgo, safeDispatchEvent } from '../lib/utils';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function HousingRequestsSection() {
  const [user] = useAuthState(auth);
  const [requests, setRequests] = useState<HousingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'housing_requests'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HousingRequest[]);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching housing requests:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-900/5 p-10">
        <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-brand-600" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-4">Connexion requise</h3>
        <p className="text-slate-500 max-w-md mx-auto mb-8 font-medium">
          Vous devez être connecté pour consulter les demandes de logement des clients.
        </p>
        <button
          onClick={() => safeDispatchEvent('open-auth')}
          className="bg-brand-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-brand-600/20 hover:bg-brand-700 transition-all"
        >
          Se connecter maintenant
        </button>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
        <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900">Aucune demande pour le moment</h3>
        <p className="text-slate-500">Les demandes des clients s'afficheront ici.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {requests.map((request) => (
        <motion.div
          key={request.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -8 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-900/5 border border-slate-100 hover:shadow-2xl hover:shadow-brand-900/10 transition-all group relative overflow-hidden"
        >
          {/* Decorative background element */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-50 rounded-full blur-3xl opacity-50 group-hover:bg-brand-100 transition-colors" />

          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center overflow-hidden border border-brand-100 shadow-inner">
              {request.userPhoto ? (
                <img src={request.userPhoto} alt={request.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-600 text-white font-black text-xl">
                  {request.userName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-lg leading-tight">{request.userName}</h4>
              <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                <Clock className="w-3 h-3 text-brand-500" />
                {isMounted ? timeAgo(request.createdAt?.toDate()) : '...'}
              </div>
            </div>
            <div className="ml-auto">
              <div className="flex flex-col items-end gap-1">
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                  Actif
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8 relative z-10">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100 group-hover:bg-white group-hover:border-brand-100 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white shadow-sm text-brand-500">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-700">{request.neighborhood}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100 group-hover:bg-white group-hover:border-brand-100 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white shadow-sm text-brand-500">
                  <Home className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-700">{request.type}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-brand-50/30 border border-brand-100 group-hover:bg-brand-50 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white shadow-sm text-brand-600">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest leading-none mb-1">Budget Max</p>
                  <p className="font-black text-brand-700 text-lg">{formatPrice(request.budget)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-[1.5rem] p-5 mb-8 relative z-10 border border-slate-100 min-h-[100px]">
            <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
              "{request.description}"
            </p>
          </div>

          <a
            href={`https://wa.me/${request.whatsapp}?text=Bonjour ${request.userName}, je vous contacte concernant votre demande de logement à ${request.neighborhood} sur Dakar Prestige.`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-5 rounded-2xl bg-slate-900 hover:bg-brand-600 text-white font-black shadow-xl shadow-slate-900/10 hover:shadow-brand-600/20 transition-all flex items-center justify-center gap-3 relative z-10 group-hover:scale-[1.02]"
          >
            <MessageCircle className="w-5 h-5" />
            Proposer un bien
          </a>
        </motion.div>
      ))}
    </div>
  );
}
