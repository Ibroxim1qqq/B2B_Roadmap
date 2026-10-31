'use client';
import React, { useMemo } from 'react';
import { 
  X, RotateCcw, SlidersHorizontal, Home, Building2, 
  Layers, MapPin, PhoneCall, Calendar, CheckCircle2, RefreshCw
} from 'lucide-react';
import { 
  AdvancedFilterState, 
  INITIAL_ADVANCED_FILTERS, 
  countActiveFilters 
} from '../../lib/filters';
import { getDistrictsForRegion } from '../../lib/regions';

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
  selectedDistrict?: string;
  onDistrictChange?: (district: string) => void;
  selectedStatus?: string;
  onStatusChange?: (status: string) => void;
  selectedRegion?: string;
  onRegionChange?: (regionSoato: string) => void;
}

export default function AdvancedFilterModal({
  isOpen,
  onClose,
  filters,
  onChange,
  onReset,
  filteredCount,
  totalCount,
  selectedDistrict = '',
  onDistrictChange,
  selectedStatus = '',
  onStatusChange,
  selectedRegion = ''
}: AdvancedFilterModalProps) {
  const activeCount = countActiveFilters(filters, selectedDistrict, selectedStatus);

  const districts = useMemo(() => {
    return getDistrictsForRegion(selectedRegion);
  }, [selectedRegion]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
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
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* 1. Tuman va Status (Tashqaridan ko'chirilgan filtrlari) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Tuman</span>
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => onDistrictChange?.(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-xs font-semibold outline-none transition-all text-slate-800 cursor-pointer"
              >
                <option value="">Barcha tumanlar</option>
                {districts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                <span>Qurilish holati</span>
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => onStatusChange?.(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-xs font-semibold outline-none transition-all text-slate-800 cursor-pointer"
              >
                <option value="">Barcha statuslar</option>
                <option value="Jarayonda">Jarayonda</option>
                <option value="To'xtatilgan">To&apos;xtatilgan</option>
                <option value="Muzlatilgan">Muzlatilgan</option>
                <option value="Topshirilgan">Topshirilgan</option>
              </select>
            </div>
          </div>

          {/* 2. Xonalar soni */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-blue-600" />
                <span>Xonalar soni</span>
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

            <input
              type="text"
              placeholder="Xonalar sonini kiriting (masalan: 1, 2, 3 yoki 4)..."
              value={filters.roomCount}
              onChange={(e) => onChange({ ...filters, roomCount: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-xs font-semibold outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* 3. Qavatlar soni */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Qavatlar soni</span>
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
          </div>

          {/* 4. Xonadonlar soni (User: soni.) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Xonadonlar soni</span>
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
          </div>

          {/* 5. Tashrif holati (Selected Dropdown) */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tashrif holati</span>
            </label>
            <select
              value={filters.visitStatus}
              onChange={(e) => onChange({ ...filters, visitStatus: e.target.value as any })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-xs font-semibold outline-none transition-all text-slate-800 cursor-pointer"
            >
              <option value="all">Barchasi</option>
              <option value="visited">Borilgan (Tashrif qilingan)</option>
              <option value="not_visited">Borilmagan (Kutilmoqda)</option>
            </select>
          </div>

          {/* 6. B2B Ma'lumot holati (Selected Dropdown) */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
              <span>B2B ma&apos;lumot holati</span>
            </label>
            <select
              value={filters.crmStatus}
              onChange={(e) => onChange({ ...filters, crmStatus: e.target.value as any })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-xs font-semibold outline-none transition-all text-slate-800 cursor-pointer"
            >
              <option value="all">Barchasi</option>
              <option value="filled">Ma&apos;lumot to&apos;ldirilgan</option>
              <option value="empty">To&apos;ldirilmagan (Bo&apos;sh)</option>
            </select>
          </div>

          {/* 7. Topshirish muddati */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-600" />
                <span>Topshirish muddati</span>
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
            <span>Ko&apos;rsatish ({filteredCount.toLocaleString()} ta obyekt)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
