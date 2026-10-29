'use client';
import React from 'react';
import { 
  X, RotateCcw, Check, SlidersHorizontal, Home, Building2, 
  Layers, MapPin, PhoneCall, Award, Calendar, CheckCircle2, ArrowRight
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
                Obyektlarni qavatlar, xonalar soni va B2B holati bo'yicha aniq saralash
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
          
          {/* 1. Xonalar soni (Custom Input + Quick Presets) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-blue-600" />
                <span>Xonalar soni (Xona bo'yicha)</span>
              </label>
              {filters.roomCount && (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, roomCount: '' })}
                  className="text-[11px] text-slate-400 hover:text-rose-600 font-semibold cursor-pointer"
                >
                  Tozalash
                </button>
              )}
            </div>

            {/* Custom Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Xonalar sonini kiriting (masalan: 1, 2, 3 yoki 4)..."
                value={filters.roomCount}
                onChange={(e) => onChange({ ...filters, roomCount: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-xs font-semibold outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Quick Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Tezkor:</span>
              {['1 xonali', '2 xonali', '3 xonali', '4 xonali', '5+ xonali'].map(opt => {
                const num = opt.split(' ')[0];
                const isSelected = filters.roomCount === num || filters.roomCount.includes(num);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      if (filters.roomCount === num) {
                        onChange({ ...filters, roomCount: '' });
                      } else {
                        onChange({ ...filters, roomCount: num });
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Qavatlar soni (Custom Min - Max Inputs) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Qavatlar soni (Balandligi: Min - Max)</span>
              </label>
              {(filters.minFloors || filters.maxFloors) && (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, minFloors: '', maxFloors: '' })}
                  className="text-[11px] text-slate-400 hover:text-rose-600 font-semibold cursor-pointer"
                >
                  Tozalash
                </button>
              )}
            </div>

            {/* Min / Max Inputs */}
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <span className="block text-[11px] text-slate-500 font-medium mb-1">... dan (min qavat):</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  placeholder="Min (masalan: 5)"
                  value={filters.minFloors}
                  onChange={(e) => onChange({ ...filters, minFloors: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-xs font-semibold outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <span className="block text-[11px] text-slate-500 font-medium mb-1">... gacha (max qavat):</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  placeholder="Max (masalan: 12)"
                  value={filters.maxFloors}
                  onChange={(e) => onChange({ ...filters, maxFloors: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-xs font-semibold outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Quick Floor Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Tezkor:</span>
              {[
                { label: '1 - 5 qavat', min: '1', max: '5' },
                { label: '6 - 9 qavat', min: '6', max: '9' },
                { label: '10 - 16 qavat', min: '10', max: '16' },
                { label: '16+ qavat', min: '16', max: '' }
              ].map(opt => {
                const isSelected = filters.minFloors === opt.min && filters.maxFloors === opt.max;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        onChange({ ...filters, minFloors: '', maxFloors: '' });
                      } else {
                        onChange({ ...filters, minFloors: opt.min, maxFloors: opt.max });
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Xonadonlar umumiy hajmi (Custom Min - Max Inputs) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Xonadonlar umumiy hajmi (Min - Max xonadon)</span>
              </label>
              {(filters.minApartments || filters.maxApartments) && (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, minApartments: '', maxApartments: '' })}
                  className="text-[11px] text-slate-400 hover:text-rose-600 font-semibold cursor-pointer"
                >
                  Tozalash
                </button>
              )}
            </div>

            {/* Min / Max Inputs */}
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <span className="block text-[11px] text-slate-500 font-medium mb-1">... dan (min xonadon):</span>
                <input
                  type="number"
                  min="1"
                  placeholder="Min (masalan: 30)"
                  value={filters.minApartments}
                  onChange={(e) => onChange({ ...filters, minApartments: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-xs font-semibold outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <span className="block text-[11px] text-slate-500 font-medium mb-1">... gacha (max xonadon):</span>
                <input
                  type="number"
                  min="1"
                  placeholder="Max (masalan: 150)"
                  value={filters.maxApartments}
                  onChange={(e) => onChange({ ...filters, maxApartments: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-xs font-semibold outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Quick Apartment Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Tezkor:</span>
              {[
                { label: '1 - 50 ta', min: '1', max: '50' },
                { label: '51 - 100 ta', min: '51', max: '100' },
                { label: '101 - 200 ta', min: '101', max: '200' },
                { label: '200+ ta', min: '200', max: '' }
              ].map(opt => {
                const isSelected = filters.minApartments === opt.min && filters.maxApartments === opt.max;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        onChange({ ...filters, minApartments: '', maxApartments: '' });
                      } else {
                        onChange({ ...filters, minApartments: opt.min, maxApartments: opt.max });
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
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
                { id: 'all', label: 'Barchasi' },
                { id: 'visited', label: 'Borilgan (Tashrif qilingan)' },
                { id: 'not_visited', label: 'Borilmagan (Kutilmoqda)' }
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

          {/* 7. Topshirish muddati (Custom Year Input + Presets) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-600" />
                <span>Topshirish muddati (Yil bo'yicha)</span>
              </label>
              {filters.deadlineYear && (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, deadlineYear: '' })}
                  className="text-[11px] text-slate-400 hover:text-rose-600 font-semibold cursor-pointer"
                >
                  Tozalash
                </button>
              )}
            </div>

            <input
              type="text"
              placeholder="Yilni kiriting (masalan: 2025, 2026, 2027)..."
              value={filters.deadlineYear}
              onChange={(e) => onChange({ ...filters, deadlineYear: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-xs font-semibold outline-none transition-all placeholder:text-slate-400"
            />

            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Tezkor:</span>
              {['2024', '2025', '2026', '2027'].map(yr => {
                const isSelected = filters.deadlineYear === yr;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        onChange({ ...filters, deadlineYear: '' });
                      } else {
                        onChange({ ...filters, deadlineYear: yr });
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {yr}-yil
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
