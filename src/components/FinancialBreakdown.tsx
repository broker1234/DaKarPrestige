import React from 'react';
import { Calculator, Info, CheckCircle2, Home, ShieldCheck, Users } from 'lucide-react';
import { useCurrency } from '../lib/currency';

interface FinancialBreakdownProps {
  rent: number;
}

export default function FinancialBreakdown({ rent }: FinancialBreakdownProps) {
  const { formatPrice } = useCurrency();
  const deposit = rent * 2;
  const agencyFee = rent;
  const total = rent + deposit + agencyFee;

  return (
    <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 shadow-inner">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-brand-600 rounded-2xl text-white shadow-xl shadow-brand-600/20">
          <Calculator className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-black text-slate-900 leading-none mb-1.5">Budget d'emménagement</h3>
          <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em]">Estimation Standard</p>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { label: 'Loyer du 1er mois', value: rent, icon: Home, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Caution (2 mois)', value: deposit, icon: ShieldCheck, info: true, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: "Frais d'agence (1 mois)", value: agencyFee, icon: Users, info: true, color: 'text-orange-500', bg: 'bg-orange-50' }
        ].map((item, i) => (
          <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group gap-3">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}>
                <item.icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-black text-slate-600 flex items-center gap-2">
                {item.label}
                {item.info && <Info className="w-3.5 h-3.5 text-slate-300" />}
              </span>
            </div>
            <span className="font-black text-slate-900 text-lg sm:text-right break-all">{formatPrice(item.value)}</span>
          </div>
        ))}

        <div className="pt-8 mt-8 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-900/20 relative overflow-hidden group gap-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl group-hover:bg-brand-500/20 transition-colors" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-white/10 rounded-2xl text-white border border-white/10">
                <Calculator className="w-6 h-6" />
              </div>
              <span className="font-black text-white text-xl tracking-tight">Total estimé</span>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-brand-400 relative z-10 tracking-tighter break-all sm:text-right">{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-start gap-4 bg-white/60 p-6 rounded-[2rem] text-[11px] text-slate-500 leading-relaxed border border-slate-100">
        <div className="p-1.5 bg-brand-50 rounded-lg text-brand-500 flex-shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <p className="font-bold">
          Ce calcul est une estimation basée sur les standards du marché dakarois (2 mois de caution + 1 mois de commission). 
          Vérifiez toujours les conditions exactes avec le courtier avant toute transaction.
        </p>
      </div>
    </div>
  );
}
