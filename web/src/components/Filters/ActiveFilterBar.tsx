'use client';
import { SlidersHorizontal } from 'lucide-react';
import { AdvancedFilterState, countActiveFilters, INITIAL_ADVANCED_FILTERS } from '../../lib/filters';
import { getRegionName } from '../../lib/regions';

interface ActiveFilterBarProps {
  filters: AdvancedFilterState;
  onChange: (filters: AdvancedFilterState) => void;
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  selectedDistrict: string;
  onDistrictChange: (district: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function Pill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold shadow-2xs max-w-[240px]">
      <span className="truncate">{label}</span>
      <button type="button" onClick={onRemove} aria-label={`${label} filtrini olib tashlash`} className="hover:text-rose-600 cursor-pointer font-bold ml-0.5 shrink-0">×</button>
    </span>
  );
}

export default function ActiveFilterBar({
  filters,
  onChange,
  selectedRegion,
  onRegionChange,
  selectedDistrict,
  onDistrictChange,
  selectedStatus,
  onStatusChange,
  searchQuery,
  onSearchChange
}: ActiveFilterBarProps) {
  const hasSearch = searchQuery.trim() !== '';
  if (countActiveFilters(filters, selectedDistrict, selectedStatus) === 0 && !hasSearch && !selectedRegion) return null;

  const clear = (patch: Partial<AdvancedFilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className="bg-emerald-50/90 border-b border-emerald-200/60 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto text-xs shrink-0 select-none">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="font-bold text-emerald-950 flex items-center gap-1 text-[11px] uppercase tracking-wider">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#1b815f]" />
          <span>Filtrlar:</span>
        </span>
        {hasSearch && <Pill label={`Qidiruv: ${searchQuery}`} onRemove={() => onSearchChange('')} />}
        {selectedRegion && <Pill label={getRegionName(selectedRegion)} onRemove={() => onRegionChange('')} />}
        {filters.tjmName.trim() !== '' && <Pill label={`TJM: ${filters.tjmName}`} onRemove={() => clear({ tjmName: '' })} />}
        {filters.brandName.trim() !== '' && <Pill label={`Brend: ${filters.brandName}`} onRemove={() => clear({ brandName: '' })} />}
        {filters.companyName.trim() !== '' && <Pill label={`MChJ: ${filters.companyName}`} onRemove={() => clear({ companyName: '' })} />}
        {filters.clientOwner.trim() !== '' && <Pill label={`Klient: ${filters.clientOwner}`} onRemove={() => clear({ clientOwner: '' })} />}
        {selectedDistrict && selectedDistrict !== 'Barcha tumanlar' && <Pill label={`Tuman: ${selectedDistrict}`} onRemove={() => onDistrictChange('')} />}
        {selectedStatus && selectedStatus !== 'Barcha statuslar' && <Pill label={`Status: ${selectedStatus}`} onRemove={() => onStatusChange('')} />}
        {filters.roomCount.trim() !== '' && <Pill label={`Xona: ${filters.roomCount}`} onRemove={() => clear({ roomCount: '' })} />}
        {(filters.minApartments || filters.maxApartments) && (
          <Pill label={`Xonadon: ${filters.minApartments || '0'} - ${filters.maxApartments || '∞'}`} onRemove={() => clear({ minApartments: '', maxApartments: '' })} />
        )}
        {(filters.minFloors || filters.maxFloors) && (
          <Pill label={`Qavat: ${filters.minFloors || '0'} - ${filters.maxFloors || '∞'}`} onRemove={() => clear({ minFloors: '', maxFloors: '' })} />
        )}
        {filters.visitStatus !== 'all' && (
          <Pill label={filters.visitStatus === 'visited' ? 'Borilgan' : 'Borilmagan'} onRemove={() => clear({ visitStatus: 'all' })} />
        )}
        {filters.crmStatus !== 'all' && (
          <Pill label={filters.crmStatus === 'filled' ? "B2B to'ldirilgan" : 'B2B kiritilmagan'} onRemove={() => clear({ crmStatus: 'all' })} />
        )}
        {filters.difficulty !== 'all' && <Pill label={`Toifa: ${filters.difficulty}`} onRemove={() => clear({ difficulty: 'all' })} />}
        {filters.deadlineYear.trim() !== '' && filters.deadlineYear !== 'all' && (
          <Pill label={`Muddati: ${filters.deadlineYear}`} onRemove={() => clear({ deadlineYear: '' })} />
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          onChange(INITIAL_ADVANCED_FILTERS);
          onRegionChange('');
          onDistrictChange('');
          onStatusChange('');
          onSearchChange('');
        }}
        className="text-rose-600 hover:text-rose-800 font-bold hover:underline shrink-0 cursor-pointer ml-auto text-xs"
      >
        Tozalash
      </button>
    </div>
  );
}
