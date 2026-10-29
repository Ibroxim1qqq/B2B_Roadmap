'use client';
import React from 'react';
import { 
  X, RotateCcw, Check, SlidersHorizontal, Home, Building2, 
  Layers, MapPin, PhoneCall, Award, Calendar, CheckCircle2 
} from 'lucide-react';
import { 
  AdvancedFilterState, 
  INITIAL_ADVANCED_FILTERS, 
  countActiveFilters 
} from '../../lib/filters';

export type { AdvancedFilterState };
export { INITIAL_ADVANCED_FILTERS, countActiveFilters };

interface AdvancedFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AdvancedFilterState;
  onChange: (filters: AdvancedFilterState) => void;
  onReset: () => void;
  filteredCount: number;
  totalCount: number;
}

export default function AdvancedFilterModal({
  isOpen,
  onClose,
  filters,
  onChange,
  onReset,
  filteredCount,
  totalCount
}: AdvancedFilterModalProps) {
  if (!isOpen) return null;

  const activeCount = countActiveFilters(filters);

  const toggleRoom = (room: string) => {
    const exists = filters.roomCount.includes(room);
    const updated = exists 
      ? filters.roomCount.filter(r => r !== room)
      : [...filters.roomCount, room];
    onChange({ ...filters, roomCount: updated });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Kengaytirilgan filtrlar</h3>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-blue-700">
                    {activeCount} ta faol
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Obyektlarni qavatlar, xonalar soni va B2B holati bo'yicha saralash
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            title="Yopish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          
          {/* 1. Xonalar soni (Multi-select) */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-blue-600" />
              <span>Xonalar soni (Xonalar bo'yicha)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: '1', label: '1 xonali' },
                { id: '2', label: '2 xonali' },
                { id: '3', label: '3 xonali' },
                { id: '4+', label: '4+ xonali' }
              ].map(opt => {
                const isSelected = filters.roomCount.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleRoom(opt.id)}
                    className={`px-3 py-2.5 rounded-xl border font-semibold text-xs flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-500/20'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-1 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Xonadonlar umumiy soni */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Xonadonlar umumiy hajmi</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'all', label: 'Barchasi' },
                { id: '1-50', label: '1 - 50 ta' },
                { id: '51-100', label: '51 - 100 ta' },
                { id: '101-200', label: '101 - 200 ta' },
                { id: '200+', label: '200+ ta' }
              ].map(opt => {
                const isSelected = filters.apartmentRange === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ ...filters, apartmentRange: opt.id })}
                    className={`px-2.5 py-2 rounded-xl border font-semibold text-xs text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Qavatlar soni */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Qavatlar soni (Balandligi)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'all', label: 'Barchasi' },
                { id: '1-5', label: '1 - 5 qavat' },
                { id: '6-9', label: '6 - 9 qavat' },
                { id: '10-16', label: '10 - 16 qavat' },
                { id: '16+', label: '16+ qavat' }
              ].map(opt => {
                const isSelected = filters.floorRange === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ ...filters, floorRange: opt.id })}
                    className={`px-2.5 py-2 rounded-xl border font-semibold text-xs text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Tashrif holati */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tashrif holati (Field Sales)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'Barchasi', icon: null },
                { id: 'visited', label: 'Borilgan (Tashrif qilingan)', color: 'emerald' },
                { id: 'not_visited', label: 'Borilmagan (Kutilmoqda)', color: 'amber' }
              ].map(opt => {
                const isSelected = filters.visitStatus === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ ...filters, visitStatus: opt.id as any })}
                    className={`px-3 py-2 rounded-xl border font-semibold text-xs text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. B2B Ma'lumot to'liqligi */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
              <span>B2B Ma'lumot holati (Telefon / Mas'ul menejer)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'Barchasi' },
                { id: 'filled', label: 'Ma\'lumot to\'ldirilgan' },
                { id: 'empty', label: 'To\'ldirilmagan (Bo\'sh)' }
              ].map(opt => {
                const isSelected = filters.crmStatus === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ ...filters, crmStatus: opt.id as any })}
                    className={`px-3 py-2 rounded-xl border font-semibold text-xs text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Qurilish toifasi */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-purple-600" />
              <span>Qurilish murakkablik toifasi</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'all', label: 'Barchasi' },
                { id: 'II', label: 'II-toifa' },
                { id: 'III', label: 'III-toifa' },
                { id: 'IV', label: 'IV-toifa' }
              ].map(opt => {
                const isSelected = filters.difficulty === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ ...filters, difficulty: opt.id })}
                    className={`px-3 py-2 rounded-xl border font-semibold text-xs text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7. Topshirish muddati (Yil) */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-600" />
              <span>Topshirish muddati (Yil bo'yicha)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'all', label: 'Barchasi' },
                { id: '2024', label: '2024-yil' },
                { id: '2025', label: '2025-yil' },
                { id: '2026', label: '2026-yil' },
                { id: '2027+', label: '2027+ yil' }
              ].map(opt => {
                const isSelected = filters.deadlineYear === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ ...filters, deadlineYear: opt.id })}
                    className={`px-2.5 py-2 rounded-xl border font-semibold text-xs text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onReset}
            disabled={activeCount === 0}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeCount > 0
                ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                : 'text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Filtrlarni tozalash</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Ko'rsatish ({filteredCount.toLocaleString()} ta obyekt)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
