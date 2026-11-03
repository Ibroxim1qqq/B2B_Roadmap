'use client';
import { Building, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useRef } from 'react';

interface FilterToolbarProps {
  selectedDistrict: string;
  onDistrictChange: (district: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  onMyLocation: () => void;
  locating?: boolean;
  onOpenAdvancedFilters?: () => void;
  activeAdvancedFilterCount?: number;
}

export default function FilterToolbar({
  selectedDistrict,
  onDistrictChange,
  selectedStatus,
  onStatusChange,
  onMyLocation,
  locating = false,
  onOpenAdvancedFilters,
  activeAdvancedFilterCount = 0
}: FilterToolbarProps) {
  const districtRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2 md:px-6 md:py-3 flex items-center justify-between gap-2 shrink-0">
      {/* Filters Pill Row */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 overflow-visible">
        {/* Category (Fixed) */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs shrink-0 select-none">
          <Building className="w-3.5 h-3.5 text-[#1b815f] shrink-0" />
          <span>Ko'p xonadonli uy-joylar</span>
        </div>

        {/* District & Status Selectors - Integrated inside Filter Icon Modal */}
        <div className="hidden" aria-hidden="true">
          <div ref={districtRef}>
            <span>{selectedDistrict || 'Tuman'}</span>
            <button type="button" onClick={() => onDistrictChange(selectedDistrict === 'Barcha tumanlar' ? '' : selectedDistrict)}>
              Barcha tumanlar
            </button>
            <ChevronDown />
          </div>
          <div ref={statusRef}>
            <span>{selectedStatus || 'Status'}</span>
            <button type="button" onClick={() => onStatusChange(selectedStatus === 'Barcha statuslar' ? '' : selectedStatus)}>
              Barcha statuslar
            </button>
            <ChevronDown />
          </div>
        </div>

        {/* Advanced Filters Button */}
        {onOpenAdvancedFilters && (
          <button
            type="button"
            onClick={onOpenAdvancedFilters}
            className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 border rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer shrink-0 ${
              activeAdvancedFilterCount > 0
                ? 'bg-[#1b815f] border-[#1b815f] text-white hover:bg-[#15674c]'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
            title="Kengaytirilgan filtrlar (Xonalar, qavatlar, tashrif va B2B holati)"
          >
            <SlidersHorizontal className={`w-3.5 h-3.5 shrink-0 ${activeAdvancedFilterCount > 0 ? 'text-white' : 'text-[#1b815f]'}`} />
            <span className="hidden sm:inline">Filtrlar</span>
            {activeAdvancedFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-emerald-700 text-[10px] font-semibold flex items-center justify-center shrink-0">
                {activeAdvancedFilterCount}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
