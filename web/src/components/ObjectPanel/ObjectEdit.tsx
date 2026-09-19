'use client';
import { useState, useEffect } from 'react';
import { CustomField } from '../../lib/types';
import { X, Save, Building, Phone, MapPin, User, Send, Globe, Trash2, Tag, FileText, Calendar, Hash } from 'lucide-react';
import { getStoredCustomFields } from '../CustomFields/CustomFieldManager';

interface Props {
  sourceId: string;
  initialData: Record<string, any>;
  fields?: CustomField[];
  onSave: (data: Record<string, string>) => Promise<void>;
  onCancel: () => void;
  onClear?: () => Promise<void>;
}

export default function ObjectEdit({ sourceId, initialData, onSave, onCancel, onClear }: Props) {
  const [data, setData] = useState<Record<string, string>>({});
  const [allFields, setAllFields] = useState<(CustomField & { label?: string; desc?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const fieldsList = getStoredCustomFields();
    setAllFields(fieldsList);

    const initialMap: Record<string, string> = {};
    // Base default fields
    initialMap.tjm_name = initialData?.tjm_name || '';
    initialMap.phone = initialData?.phone || '';
    initialMap.sales_office = initialData?.sales_office || '';
    initialMap.manager_name = initialData?.manager_name || '';
    initialMap.manager_phone = initialData?.manager_phone || '';
    initialMap.telegram = initialData?.telegram || '';
    initialMap.instagram = initialData?.instagram || '';
    initialMap.notes = initialData?.notes || '';
    initialMap.priority = initialData?.priority || '';

    // Load any custom fields
    fieldsList.forEach(f => {
      if (initialData && initialData[f.field_name] !== undefined) {
        initialMap[f.field_name] = String(initialData[f.field_name] || '');
      } else if (!initialMap[f.field_name]) {
        initialMap[f.field_name] = '';
      }
    });

    setData(initialMap);
  }, [sourceId, initialData]);

  const handleChange = (name: string, value: string) => {
    setData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(data);
    } catch (err) {
      console.error(err);
      alert('Markaziy bazaga saqlashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Haqiqatan ham bu obyektning barcha B2B ma\'lumotlarini o\'chirmoqchimisiz?')) {
      return;
    }
    setClearing(true);
    try {
      if (onClear) {
        await onClear();
      } else {
        const emptyData: Record<string, string> = {};
        Object.keys(data).forEach(k => {
          emptyData[k] = '';
        });
        await onSave(emptyData);
      }
    } catch (err) {
      console.error(err);
      alert('O\'chirishda xatolik yuz berdi');
    } finally {
      setClearing(false);
    }
  };

  // Separate standard base fields from additional custom fields
  const standardFieldKeys = [
    'tjm_name', 'phone', 'sales_office', 'manager_name', 
    'manager_phone', 'telegram', 'instagram', 'priority', 'notes'
  ];

  const additionalCustomFields = allFields.filter(
    f => !standardFieldKeys.includes(f.field_name) && f.visible !== false
  );

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 z-20 shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Ichki B2B ma'lumotlarni tahrirlash</h2>
          <p className="text-[11px] text-slate-500">O'zgarishlar to'g'ridan-to'g'ri markaziy bazaga saqlanadi</p>
        </div>
        <button onClick={onCancel} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">TJM Nomi</label>
          <div className="relative">
            <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Masalan: Samarqand Residence"
              value={data.tjm_name || ''}
              onChange={(e) => handleChange('tjm_name', e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Aloqa telefoni</label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              placeholder="+998 90 123 45 67"
              value={data.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Sotuv ofisi manzili</label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Masalan: Registon ko'chasi 12-uy"
              value={data.sales_office || ''}
              onChange={(e) => handleChange('sales_office', e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Rahbar ismi</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ism Familiya"
                value={data.manager_name || ''}
                onChange={(e) => handleChange('manager_name', e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Rahbar telefoni</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="+998 90 ..."
                value={data.manager_phone || ''}
                onChange={(e) => handleChange('manager_phone', e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Telegram username / havola</label>
          <div className="relative">
            <Send className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="@username"
              value={data.telegram || ''}
              onChange={(e) => handleChange('telegram', e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Instagram havola</label>
          <div className="relative">
            <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="instagram.com/..."
              value={data.instagram || ''}
              onChange={(e) => handleChange('instagram', e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Ustuvorlik (Priority)</label>
          <select
            value={data.priority || ''}
            onChange={(e) => handleChange('priority', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">Tanlang...</option>
            <option value="Yuqori">Yuqori (5)</option>
            <option value="O'rta">O'rta (3)</option>
            <option value="Past">Past (1)</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Izoh / Eslatma</label>
          <div className="relative">
            <textarea
              placeholder="Obyekt bo'yicha maxsus eslatmalar..."
              value={data.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-none"
            />
          </div>
        </div>

        {/* Dynamic Custom Fields Section */}
        {additionalCustomFields.length > 0 && (
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              <span>Qo'shimcha maxsus maydonlar</span>
            </h3>

            {additionalCustomFields.map((f) => (
              <div key={f.field_name}>
                <label className="block font-semibold text-slate-700 mb-1">
                  {f.label || f.field_name}
                </label>
                {f.field_type === 'textarea' ? (
                  <textarea
                    placeholder={f.desc || `${f.label || f.field_name} kiriting...`}
                    value={data[f.field_name] || ''}
                    onChange={(e) => handleChange(f.field_name, e.target.value)}
                    rows={2}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-none"
                  />
                ) : f.field_type === 'number' ? (
                  <input
                    type="number"
                    placeholder={f.desc || `${f.label || f.field_name} kiriting...`}
                    value={data[f.field_name] || ''}
                    onChange={(e) => handleChange(f.field_name, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                  />
                ) : f.field_type === 'date' ? (
                  <input
                    type="date"
                    value={data[f.field_name] || ''}
                    onChange={(e) => handleChange(f.field_name, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none bg-white"
                  />
                ) : (
                  <input
                    type={f.field_type === 'phone' ? 'tel' : f.field_type === 'url' ? 'url' : 'text'}
                    placeholder={f.desc || `${f.label || f.field_name} kiriting...`}
                    value={data[f.field_name] || ''}
                    onChange={(e) => handleChange(f.field_name, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 px-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold transition-colors cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 shadow-xs shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saqlanmoqda...' : 'Saqlash'}</span>
            </button>
          </div>

          {/* Delete / Clear button */}
          <button
            type="button"
            onClick={handleClear}
            disabled={clearing}
            className="w-full py-2 px-3 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors text-xs disabled:opacity-50 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{clearing ? 'O\'chirilmoqda...' : 'B2B ma\'lumotlarini o\'chirish'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
