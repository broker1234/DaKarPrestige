import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle, MessageCircle, ShieldCheck, Zap, Users, DollarSign } from 'lucide-react';

const FAQ_DATA = [
  {
    question: "Comment publier une annonce sur Dakar Prestige ?",
    answer: "Pour publier une annonce, vous devez d'abord créer un compte en tant que 'Courtier'. Une fois connecté, cliquez sur le bouton 'Publier' dans la barre de navigation. Vous pourrez alors ajouter des photos, une vidéo, la localisation et les détails de votre bien en 3 étapes simples.",
    icon: Zap,
    color: "text-brand-600",
    bg: "bg-brand-50"
  },
  {
    question: "Qu'est-ce que le badge 'Vérifié' ?",
    answer: "Le badge 'Vérifié' est un gage de confiance. Il indique que nos équipes ont physiquement visité le logement ou ont authentifié les documents du courtier. Les annonces vérifiées reçoivent généralement 3x plus de demandes.",
    icon: ShieldCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-50"
  },
  {
    question: "Comment fonctionne le programme Aide-Courtier ?",
    answer: "C'est notre programme d'affiliation. En tant qu'Aide-Courtier, vous pouvez partager les annonces de la plateforme avec votre lien unique. Si une personne loue un bien via votre lien, vous touchez une commission automatique fixée par le courtier principal.",
    icon: Users,
    color: "text-amber-600",
    bg: "bg-amber-50"
  },
  {
    question: "Les frais de visite sont-ils obligatoires ?",
    answer: "Certains courtiers appliquent des frais de visite (généralement entre 2000 et 5000 FCFA) pour couvrir leurs déplacements. Ces frais sont clairement indiqués sur chaque annonce. Dakar Prestige recommande de ne payer ces frais qu'au moment de la rencontre physique.",
    icon: DollarSign,
    color: "text-blue-600",
    bg: "bg-blue-50"
  },
  {
    question: "Comment contacter le support en cas de litige ?",
    answer: "En cas de problème avec une transaction ou un courtier, vous pouvez nous contacter directement via le bouton WhatsApp Support en bas de page ou utiliser le formulaire de litige disponible dans votre tableau de bord.",
    icon: MessageCircle,
    color: "text-red-600",
    bg: "bg-red-50"
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 text-brand-600 text-xs font-black uppercase tracking-[0.2em] mb-6">
            <HelpCircle className="w-4 h-4" />
            Centre d'aide
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
            Questions <span className="text-brand-600">Fréquentes</span>
          </h2>
          <p className="text-slate-500 font-medium max-w-2xl mx-auto">
            Tout ce que vous devez savoir sur l'immobilier de prestige à Dakar et le fonctionnement de notre plateforme.
          </p>
        </div>

        <div className="space-y-4">
          {FAQ_DATA.map((item, index) => (
            <div 
              key={index}
              className={`group rounded-[2rem] border transition-all duration-300 ${
                openIndex === index 
                  ? 'border-brand-200 bg-brand-50/30 shadow-xl shadow-brand-500/5' 
                  : 'border-slate-100 bg-white hover:border-brand-100 hover:shadow-lg'
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 md:p-8 text-left"
              >
                <div className="flex items-center gap-5">
                  <div className={`p-3 rounded-2xl transition-colors ${
                    openIndex === index ? 'bg-brand-500 text-white' : `${item.bg} ${item.color}`
                  }`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className={`text-lg font-black tracking-tight transition-colors ${
                    openIndex === index ? 'text-slate-900' : 'text-slate-700 group-hover:text-brand-600'
                  }`}>
                    {item.question}
                  </span>
                </div>
                <div className={`p-2 rounded-xl transition-all duration-300 ${
                  openIndex === index ? 'bg-brand-100 text-brand-600 rotate-180' : 'bg-slate-50 text-slate-400'
                }`}>
                  <ChevronDown className="w-5 h-5" />
                </div>
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-8 pb-8 md:px-20 md:pb-10">
                      <div className="h-px bg-brand-100 mb-6" />
                      <p className="text-slate-600 leading-relaxed font-medium">
                        {item.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="mt-16 p-8 rounded-[3rem] bg-slate-900 text-white text-center relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl group-hover:bg-brand-500/30 transition-colors" />
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-4">Vous avez encore des questions ?</h3>
            <p className="text-slate-400 mb-8 font-medium">Notre équipe est disponible 7j/7 pour vous accompagner dans votre recherche.</p>
            <a 
              href="https://wa.me/221770000000" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-xl shadow-brand-600/20 hover:scale-105 active:scale-95"
            >
              <MessageCircle className="w-5 h-5" />
              Nous contacter sur WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
