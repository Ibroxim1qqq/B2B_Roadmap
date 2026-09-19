'use client';
import { useState, useEffect } from 'react';
import { CustomField } from '../../lib/types';
import { 
  SlidersHorizontal, Eye, EyeOff, ShieldCheck, Plus, 
  Trash2, Check, X, Sparkles, Database, FileSpreadsheet
} from 'lucide-react';

const DEFAULT_FIELDS: (CustomField & { label?: string; desc?: string })[] = [
  { field_name: 'tjm_name', field_type: 'text', required: false, visible: true, column_letter: 'W', label: 'TJM Nomi', desc: 'Turar-joy majmuasining tijoriy brend nomi' },
  { field_name: 'phone', field_type: 'phone', required: false, visible: true, column_letter: 'X', label: 'Aloqa telefoni', desc: 'Sotuv bo\'limi yoki obyekt mas\'uli telefoni' },
  { field_name: 'sales_office', field_type: 'text', required: false, visible: true, column_letter: 'Y', label: 'Sotuv ofisi manzili', desc: 'Obyekt sotuv ofisi joylashuvi' },
  { field_name: 'manager_name', field_type: 'text', required: false, visible: true, column_letter: 'Z', label: 'Rahbar / Menejer ismi', desc: 'Quruvchi yoki sotuv rahbari' },
  { field_name: 'manager_phone', field_type: 'phone', required: false, visible: true, column_letter: 'AA', label: 'Rahbar telefoni', desc: 'To\'g\'ridan-to\'g\'ri aloqa raqami' },
  { field_name: 'telegram', field_type: 'url', required: false, visible: true, column_letter: 'AB', label: 'Telegram username / havola', desc: 'Rasmiy kanal yoki menejer profili' },
  { field_name: 'instagram', field_type: 'url', required: false, visible: true, column_letter: 'AC', label: 'Instagram havola', desc: 'Obyektning ijtimoiy tarmoq sahifasi' },
  { field_name: 'notes', field_type: 'textarea', required: false, visible: true, column_letter: 'AD', label: 'Izoh / Eslatma', desc: 'Ichki B2B muzokaralar xotirasi' },
  { field_name: 'priority', field_type: 'select', required: false, visible: true, column_letter: 'AE', label: 'Ustuvorlik darajasi', desc: 'Yuqori (5), O\'rta (3), Past (1)' },
  { field_name: 'last_visit', field_type: 'date', required: false, visible: true, column_letter: 'AF', label: 'Oxirgi tashrif sanasi', desc: 'Joyiga borilgan vaqt tamg\'asi' }
];

export function getStoredCustomFields(): (CustomField & { label?: string; desc?: string })[] {
  if (typeof window === 'undefined') return DEFAULT_FIELDS;
  try {
    const saved = localStorage.getItem('b2b_custom_fields');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}
  return DEFAULT_FIELDS;
}

export function saveStoredCustomFields(fields: (CustomField & { label?: string; desc?: string })[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('b2b_custom_fields', JSON.stringify(fields));
  } catch (e) {}
}

export default function CustomFieldManager() {
  const [fields, setFields] = useState<(CustomField & { label?: string; desc?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newType, setNewType] = useState<'text' | 'phone' | 'url' | 'textarea' | 'date' | 'number'>('text');
  const [newDesc, setNewDesc] = useState('');
  const [savedAlert, setSavedAlert] = useState(false);

  useEffect(() => {
    const stored = getStoredCustomFields();
    setFields(stored);
    setLoading(false);
  }, []);

  const toggleVisibility = (index: number) => {
    const updated = [...fields];
    updated[index].visible = !updated[index].visible;
    setFields(updated);
    saveStoredCustomFields(updated);
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const generatedKey = newKey.trim() 
      ? newKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : newLabel.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Prevent duplicate key
    if (fields.some(f => f.field_name === generatedKey)) {
      alert(`"${generatedKey}" nomli maydon allaqachon mavjud!`);
      return;
    }

    const newFieldObj: CustomField & { label?: string; desc?: string } = {
      field_name: generatedKey,
      label: newLabel.trim(),
      desc: newDesc.trim() || 'Foydalanuvchi tomonidan qo\'shilgan maxsus maydon',
      field_type: newType,
      required: false,
      visible: true
    };

    const updated = [...fields, newFieldObj];
    setFields(updated);
    saveStoredCustomFields(updated);

    // Reset form
    setNewLabel('');
    setNewKey('');
    setNewDesc('');
    setNewType('text');
    setIsAddOpen(false);

    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
  };

  const handleDeleteCustomField = (index: number) => {
    const field = fields[index];
    // Don't delete system default fields
    if (DEFAULT_FIELDS.some(df => df.field_name === field.field_name)) {
      alert("Tizimning asosiy maydonini o'chirish mumkin emas. O'rniga ko'rinishini yashirishingiz mumkin.");
      return;
    }

    if (confirm(`"${field.label || field.field_name}" maydonini o'chirmoqchimisiz?`)) {
      const updated = fields.filter((_, idx) => idx !== index);
      setFields(updated);
      saveStoredCustomFields(updated);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        Sozlamalar yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-w-0 overflow-y-auto p-6 space-y-5">
      {/* 1. Header with Add Button */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <SlidersHorizontal className="w-6 h-6 text-blue-600" />
            <span>Qo'shimcha B2B Maydonlar Sozlamasi</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            TJM kartochkalarida ko'rinadigan barcha qo'shimcha ma'lumotlar maydonlarini boshqarish va yangi maydonlar qo'shish
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi maydon qo'shish</span>
        </button>
      </div>

      {savedAlert && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Yangi maydon muvaffaqiyatli saqlandi va TJM tahrirlash oynasiga qo'shildi!</span>
        </div>
      )}



      {/* 3. Fields Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Maydon nomi</th>
                <th className="py-3.5 px-4">Tizim Kaliti (Key)</th>
                <th className="py-3.5 px-4">Tavsif</th>
                <th className="py-3.5 px-4">Turi</th>
                <th className="py-3.5 px-4 text-center">Holat</th>
                <th className="py-3.5 px-4 text-right pr-6">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fields.map((field, i) => {
                const isSystemField = DEFAULT_FIELDS.some(df => df.field_name === field.field_name);

                return (
                  <tr key={field.field_name} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400 text-[11px] bg-slate-50/40">
                      {i + 1}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {field.label || field.field_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {field.field_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-[11px] max-w-xs truncate">
                      {field.desc || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-[10px] font-mono uppercase font-bold">
                        {field.field_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        field.visible 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {field.visible ? "Ko'rinadi" : "Yashirilgan"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleVisibility(i)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            field.visible
                              ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                              : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'
                          }`}
                          title={field.visible ? "Yashirish" : "Ko'rsatish"}
                        >
                          {field.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

                        {!isSystemField && (
                          <button
                            onClick={() => handleDeleteCustomField(i)}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="O'chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Add Custom Field Modal */}
      {isAddOpen && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddOpen(false);
          }}
        >
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>Yangi maydon qo'shish</span>
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddField} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Maydon sarlavhasi (Ko'rinadigan nom)</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Qurilish litsenziyasi, Bosh muhandis..."
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ma'lumot turi (Type)</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl outline-none"
                >
                  <option value="text">Matn (Oddiy qisqa matn)</option>
                  <option value="phone">Telefon raqam</option>
                  <option value="url">Havola / Veb-sayt / Link</option>
                  <option value="textarea">Katta matn / Izoh</option>
                  <option value="number">Raqam</option>
                  <option value="date">Sana</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tavsif (Ixtiyoriy)</label>
                <input
                  type="text"
                  placeholder="Maydon nima haqidaligi haqida qisqa izoh..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
