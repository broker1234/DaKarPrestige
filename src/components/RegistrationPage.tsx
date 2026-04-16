import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Share2, User, Mail, Lock, Phone, ArrowRight, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserRole } from '../types';

interface RegistrationPageProps {
  onSuccess: () => void;
  onBack: () => void;
}

export default function RegistrationPage({ onSuccess, onBack }: RegistrationPageProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<UserRole | null>(null);
  const [formData, setFormData] = useState({
    fullName: auth.currentUser?.displayName || '',
    email: auth.currentUser?.email || '',
    whatsapp: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;

    setLoading(true);
    setError(null);

    try {
      let user = auth.currentUser;
      const trimmedEmail = formData.email.trim();

      if (!user) {
        // 1. Create user in Firebase Auth if not already logged in
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, formData.password);
        user = userCredential.user;

        // 2. Update profile with display name
        await updateProfile(user, {
          displayName: formData.fullName,
        });
      }

      // 3. Save user profile in Firestore
      const isSystemAdmin = (user.email === 'peter25ngouala@gmail.com' || 
                           user.email === 'peter2005ngouala@gmail.com' ||
                           user.email === 'peterngouala@gmail.com');
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: formData.fullName || user.displayName || 'Utilisateur',
        email: user.email || trimmedEmail,
        phone: formData.whatsapp,
        role: isSystemAdmin ? 'admin' : role,
        createdAt: serverTimestamp(),
        favorites: [],
        affiliateClicks: 0,
      });

      onSuccess();
    } catch (err: any) {
      console.error("Registration error:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/operation-not-allowed') {
        setError("L'inscription par email a échoué. \n\nNote: Assurez-vous que la méthode 'Email/Mot de passe' est bien activée dans votre console Firebase (Authentification > Sign-in method).");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Cet email est déjà utilisé par un autre compte. Essayez de vous connecter.");
      } else if (err.code === 'auth/weak-password') {
        setError("Le mot de passe est trop faible (6 caractères minimum).");
      } else if (err.code === 'auth/invalid-email') {
        setError("L'adresse email n'est pas valide.");
      } else {
        setError(err.message || "Une erreur est survenue lors de l'inscription.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full"
      >
        <button 
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-bold"
        >
          <ChevronLeft className="w-5 h-5" />
          Retour à l'accueil
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            Rejoignez <span className="text-blue-600">Dakar Prestige</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            {step === 1 
              ? "Choisissez votre rôle pour commencer l'aventure." 
              : "Complétez vos informations pour créer votre compte."}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <RoleCard 
                title="Client"
                description="Je cherche un logement"
                icon={<User className="w-8 h-8" />}
                color="emerald"
                onClick={() => handleRoleSelect('user')}
              />
              <RoleCard 
                title="Courtier"
                description="Je propose des logements"
                icon={<Home className="w-8 h-8" />}
                color="blue"
                onClick={() => handleRoleSelect('courtier')}
              />
              <RoleCard 
                title="Aide-Courtier"
                description="Je partage et je gagne"
                icon={<Share2 className="w-8 h-8" />}
                color="indigo"
                onClick={() => handleRoleSelect('aide_courtier')}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-[2rem] p-8 md:p-12 shadow-2xl shadow-blue-100 max-w-lg mx-auto border border-gray-100"
            >
              <div className="flex items-center gap-4 mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className={`p-3 rounded-xl ${
                  role === 'courtier' ? 'bg-brand-600' : 
                  role === 'user' ? 'bg-emerald-600' : 
                  'bg-indigo-600'
                } text-white`}>
                  {role === 'courtier' ? <Home className="w-6 h-6" /> : role === 'user' ? <User className="w-6 h-6" /> : <Share2 className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Rôle choisi</p>
                  <p className="text-lg font-black text-gray-900">
                    {role === 'courtier' ? 'Courtier Immobilier' : role === 'user' ? 'Chercheur de Logement' : 'Aide-Courtier'}
                  </p>
                </div>
                <button 
                  onClick={() => setStep(1)}
                  className="ml-auto text-blue-600 text-xs font-black uppercase tracking-widest hover:underline"
                >
                  Changer
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6 pb-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nom complet</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      placeholder="Ex: Jean Dupont"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">WhatsApp (Dakar)</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="tel"
                      required
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                      placeholder="Ex: +221 78 578 34 43"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="Ex: jean@email.com"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-700"
                    />
                  </div>
                </div>

                {!auth.currentUser && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Mot de passe</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="••••••••"
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-700"
                      />
                    </div>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={loading}
                  className={`w-full disabled:opacity-50 text-white py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 ${
                    role === 'courtier' ? 'bg-brand-600 hover:bg-brand-700 shadow-xl shadow-brand-100' : 
                    role === 'user' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-100' : 
                    'bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100'
                  }`}
                >
                  {loading ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Créer mon compte
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function RoleCard({ title, description, icon, color, onClick }: { title: string, description: string, icon: React.ReactNode, color: 'blue' | 'indigo' | 'emerald', onClick: () => void }) {
  const colorClasses = {
    blue: 'bg-brand-50 text-brand-600 group-hover:bg-brand-600',
    indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600'
  };

  const textColorClasses = {
    blue: 'text-brand-600',
    indigo: 'text-indigo-600',
    emerald: 'text-emerald-600'
  };

  return (
    <motion.button
      whileHover={{ y: -10, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-[2.5rem] p-10 text-left shadow-xl shadow-gray-200/50 border border-gray-100 group transition-all hover:border-blue-200"
    >
      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 group-hover:text-white transition-all duration-500 ${colorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">{title}</h3>
      <p className="text-gray-500 font-medium text-lg leading-relaxed">{description}</p>
      <div className={`mt-8 flex items-center gap-2 font-black uppercase tracking-widest text-sm ${textColorClasses[color]}`}>
        Choisir ce rôle
        <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
      </div>
    </motion.button>
  );
}
