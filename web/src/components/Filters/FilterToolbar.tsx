'use client';
import { MapPin, RefreshCw, Building, ChevronDown, Navigation, Check, Globe, SlidersHorizontal } from 'lucide-react';
import { useState, useRef, useMemo } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { REGION_LIST, getDistrictsForRegion, getRegionName } from '../../lib/regions';

interface FilterToolbarProps {
  selectedRegion: string;
  onRegionChange: (regionSoato: string) => void;
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
  selectedRegion,
  onRegionChange,
  selectedDistrict,
  onDistrictChange,
  selectedStatus,
  onStatusChange,
  onMyLocation,
  locating = false,
  onOpenAdvancedFilters,
  activeAdvancedFilterCount = 0
}: FilterToolbarProps) {
  const [regionOpen, setRegionOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const regionRef = useRef<HTMLDivElement>(null);
  const districtRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useClickOutside(regionRef, () => setRegionOpen(false), regionOpen);
  useClickOutside(districtRef, () => setDistrictOpen(false), districtOpen);
  useClickOutside(statusRef, () => setStatusOpen(false), statusOpen);

  const districts = useMemo(() => {
    return ['Barcha tumanlar', ...getDistrictsForRegion(selectedRegion)];
  }, [selectedRegion]);

  const statuses = [
    'Barcha statuslar',
    'Jarayonda',
    'To\'xtatilgan',
    'Muzlatilgan',
    'Topshirilgan'
  ];

  return (
    <div className="relative z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2 md:px-6 md:py-3 flex items-center justify-between gap-2 shrink-0">
      {/* Filters Pill Row */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 overflow-visible">
        {/* Region Selector Dropdown */}
        <div ref={regionRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => { setRegionOpen(!regionOpen); setDistrictOpen(false); setStatusOpen(false); }}
            className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 border rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer ${
              selectedRegion
                ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            {selectedRegion ? <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" /> : <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
            <span className="truncate max-w-[120px] sm:max-w-none">{selectedRegion ? getRegionName(selectedRegion) : "Barcha viloyatlar"}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {regionOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-60 max-w-[calc(100vw-24px)] bg-white border border-slate-200 rounded-2xl shadow-2xl p-1.5 z-50 max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  onRegionChange('');
                  onDistrictChange('');
                  setRegionOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                  !selectedRegion
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span>🇺🇿 Barcha viloyatlar</span>
                </div>
                {!selectedRegion && <Check className="w-3.5 h-3.5" />}
              </button>
              <div className="my-1 border-t border-slate-100"></div>
              {REGION_LIST.map((r) => (
                <button
                  key={r.soato}
                  type="button"
                  onClick={() => {
                    onRegionChange(r.soato);
                    onDistrictChange('');
                    setRegionOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    selectedRegion === r.soato
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{r.name}</span>
                  </div>
                  {selectedRegion === r.soato && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category (Fixed) */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs shrink-0 select-none">
          <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
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
                ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
            title="Kengaytirilgan filtrlar (Xonalar, qavatlar, tashrif va B2B holati)"
          >
            <SlidersHorizontal className={`w-3.5 h-3.5 shrink-0 ${activeAdvancedFilterCount > 0 ? 'text-white' : 'text-blue-600'}`} />
            <span className="hidden sm:inline">Filtrlar</span>
            {activeAdvancedFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-blue-700 text-[10px] font-black flex items-center justify-center shrink-0">
                {activeAdvancedFilterCount}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
