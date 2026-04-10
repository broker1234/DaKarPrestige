import React from 'react';
import { motion } from 'motion/react';
import { UserPlus, ShieldCheck, Rocket, ArrowRight, Sparkles } from 'lucide-react';

interface RegistrationCTAProps {
  onRegister: () => void;
}

export default function RegistrationCTA({ onRegister }: RegistrationCTAProps) {
  return (
    <section className="relative overflow-hidden rounded-[3rem] bg-slate-950 p-8 md:p-16 shadow-2xl shadow-brand-900/20">
      {/* Background Effects */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-600/20 to-transparent z-0" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl z-0" />
      
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="text-left space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-brand-400 text-xs font-black uppercase tracking-widest"
          >
            <Sparkles className="w-3 h-3" />
            Rejoignez l'élite immobilière
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tight"
          >
            Prêt à trouver votre <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-200">prochain chez-vous ?</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-lg max-w-lg font-medium leading-relaxed"
          >
            Créez un compte gratuitement pour accéder aux meilleures offres, sauvegarder vos favoris et contacter directement les courtiers.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <button
              onClick={onRegister}
              className="group flex items-center gap-3 bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-brand-600/20 transition-all hover:scale-105"
            >
              <UserPlus className="w-5 h-5" />
              S'inscrire gratuitement
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FeatureCard 
            icon={<ShieldCheck className="w-6 h-6 text-emerald-400" />}
            title="Annonces Vérifiées"
            desc="Tous nos biens sont rigoureusement contrôlés."
            delay={0.4}
          />
          <FeatureCard 
            icon={<Rocket className="w-6 h-6 text-brand-400" />}
            title="Accès Prioritaire"
            desc="Soyez le premier informé des nouvelles offres."
            delay={0.5}
          />
          <FeatureCard 
            icon={<Sparkles className="w-6 h-6 text-amber-400" />}
            title="Service Premium"
            desc="Un accompagnement personnalisé pour votre recherche."
            delay={0.6}
          />
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex flex-col justify-center items-center text-center space-y-2">
            <p className="text-3xl font-black text-white">100%</p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Gratuit pour les clients</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode, title: string, desc: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl space-y-3 hover:bg-white/10 transition-colors group"
    >
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-white font-black tracking-tight">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
}
