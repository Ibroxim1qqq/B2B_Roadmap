'use client';
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { CustomField } from '../../lib/types';
import { SlidersHorizontal, Eye, EyeOff, ShieldCheck, Database, ExternalLink } from 'lucide-react';

export default function CustomFieldManager() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSettings().then(data => {
      setFields(data);
      setLoading(false);
    });
  }, []);

  const toggleVisibility = (index: number) => {
    setFields(prev => {
      const next = [...prev];
      next[index] = { ...next[index], visible: !next[index].visible };
      return next;
    });
  };

  const fieldLabels: Record<string, { label: string; desc: string }> = {
    tjm_name: { label: 'TJM Nomi', desc: 'Turar-joy majmuasining tijoriy brend nomi' },
    phone: { label: 'Aloqa telefoni', desc: 'Sotuv bo\'limi yoki obyekt mas\'uli telefoni' },
    sales_office: { label: 'Sotuv ofisi manzili', desc: 'Obyekt sotuv ofisi joylashuvi' },
    manager_name: { label: 'Rahbar / Menejer ismi', desc: 'Quruvchi yoki sotuv rahbari' },
    manager_phone: { label: 'Rahbar telefoni', desc: 'To\'g\'ridan-to\'g\'ri aloqa raqami' },
    telegram: { label: 'Telegram username', desc: 'Rasmiy kanal yoki menejer profili' },
    instagram: { label: 'Instagram havola', desc: 'Obyektning ijtimoiy tarmoq sahifasi' },
    notes: { label: 'Izoh / Eslatma', desc: 'Ichki B2B muzokaralar xotirasi' },
    priority: { label: 'Ustuvorlik darajasi', desc: 'Yuqori (5), O\'rta (3), Past (1)' },
    last_visit: { label: 'Oxirgi tashrif sanasi', desc: 'Joyiga borilgan vaqt tamg\'asi' }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        Sozlamalar yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-w-0 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <SlidersHorizontal className="w-6 h-6 text-blue-600" />
            <span>Qo'shimcha B2B Maydonlar Sozlamasi</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            B2B savdo va CRM maydonlarini boshqarish hamda ko'rinish holati
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4.5 flex items-start gap-3.5 text-xs text-blue-800">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-900">Himoyalangan ma'lumotlar arxitekturasi</p>
          <p className="text-slate-600">
            Davlat <strong>Shaffof Qurilish</strong> reyestridagi asosiy ma'lumotlar avtomatik yangilanadi. 
            Qo'shimcha maydonlar (aloqa, rahbar, muzokaralar) savdo bo'limi tomonidan to'ldiriladi va boshqariladi.
          </p>
        </div>
      </div>

      {/* Fields Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Maydon nomi</th>
                <th className="py-3.5 px-4">Tavsif</th>
                <th className="py-3.5 px-4">Turi</th>
                <th className="py-3.5 px-4 text-center">Holat</th>
                <th className="py-3.5 px-4 text-right pr-6">Ko'rinish</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fields.map((field, i) => {
                const meta = fieldLabels[field.field_name] || { label: field.field_name, desc: 'Ichki B2B maydoni' };
                return (
                  <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-slate-500 text-[11px] bg-slate-50/40">
                      {i + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {meta.label}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {meta.desc}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold">
                        {field.field_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        field.visible 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {field.visible ? "Ko'rinadi" : "Yashirilgan"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right pr-6">
                      <button
                        onClick={() => toggleVisibility(i)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          field.visible
                            ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                            : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'
                        }`}
                        title={field.visible ? "Yashirish" : "Ko'rsatish"}
                      >
                        {field.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
