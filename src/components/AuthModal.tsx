import React, { useState } from 'react';
import { loginWithEmail, registerWithEmail, loginWithGoogle } from '../lib/auth';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, LogIn, UserPlus, ShieldCheck, AlertCircle, KeyRound } from 'lucide-react';
import { auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

interface AuthModalProps {
  key?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (isNewUser: boolean) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let result;
      const trimmedEmail = email.trim();
      if (isLogin) {
        result = await loginWithEmail(trimmedEmail, password);
      } else {
        result = await registerWithEmail(trimmedEmail, password);
      }
      onSuccess(result.isNewUser);
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Email ou mot de passe incorrect. \n\nNote: Si c'est un nouveau compte, utilisez 'S'inscrire'. Assurez-vous aussi que la méthode 'Email/Mot de passe' est activée dans votre console Firebase.");
      } else if (err.code === 'auth/invalid-email') {
        setError("L'adresse email n'est pas valide.");
      } else if (err.code === 'auth/user-disabled') {
        setError("Ce compte a été désactivé. Veuillez contacter le support.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("La connexion par email n'est pas activée. Veuillez contacter l'administrateur.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Cet email est déjà utilisé.");
      } else if (err.code === 'auth/weak-password') {
        setError("Le mot de passe doit contenir au moins 6 caractères.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Trop de tentatives infructueuses. Veuillez réessayer plus tard.");
      } else {
        setError("Une erreur est survenue. Veuillez vérifier vos informations.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Veuillez entrer votre email pour réinitialiser votre mot de passe.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err: any) {
      console.error("Reset error:", err);
      if (err.code === 'auth/user-not-found') {
        setError("Aucun compte n'est associé à cet email.");
      } else {
        setError("Erreur lors de l'envoi de l'email de réinitialisation.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      onSuccess(result.isNewUser);
    } catch (err: any) {
      if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
        setError("Erreur lors de la connexion avec Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        key="auth-modal-content"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-2xl mb-4">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">
              {isLogin ? 'Bon retour !' : 'Créer un compte'}
            </h2>
            <p className="text-gray-500">
              {isLogin ? 'Connectez-vous pour gérer vos annonces ou vos favoris' : 'Rejoignez la communauté Dakar Prestige'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-gray-700">Mot de passe</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                  >
                    Oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <AnimatePresence>
              {resetSent && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-50 p-3 rounded-xl"
                >
                  <KeyRound className="w-4 h-4 flex-shrink-0" />
                  <span>Email de réinitialisation envoyé !</span>
                </motion.div>
              )}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-red-600 text-sm font-bold bg-red-50 p-3 rounded-xl"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  {isLogin ? 'Se connecter' : "S'inscrire"}
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400 font-medium">Ou continuer avec</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border-2 border-gray-100 hover:border-gray-200 text-gray-700 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" />
            Google
          </button>

          <p className="mt-8 text-center text-sm text-gray-500 font-medium">
            {isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-blue-600 font-black hover:underline"
            >
              {isLogin ? "S'inscrire" : "Se connecter"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
