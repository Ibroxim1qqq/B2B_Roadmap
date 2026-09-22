'use client';
import { MapPin, RefreshCw, Building, ChevronDown, Navigation, Check, Globe, Sparkles } from 'lucide-react';
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
  filterOnlyNew?: boolean;
  onToggleOnlyNew?: () => void;
  newObjectsCount?: number;
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
  filterOnlyNew = false,
  onToggleOnlyNew,
  newObjectsCount = 0
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
    <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
      {/* Filters Pill Row */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Region Selector Dropdown */}
        <div ref={regionRef} className="relative">
          <button
            onClick={() => { setRegionOpen(!regionOpen); setDistrictOpen(false); setStatusOpen(false); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 border rounded-xl text-xs font-semibold shadow-2xs transition-colors ${
              selectedRegion
                ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            {selectedRegion ? <MapPin className="w-3.5 h-3.5 text-blue-600" /> : <Globe className="w-3.5 h-3.5 text-blue-600" />}
            <span>{selectedRegion ? getRegionName(selectedRegion) : "Barcha viloyatlar"}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {regionOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-50 max-h-72 overflow-y-auto">
              <button
                onClick={() => {
                  onRegionChange('');
                  onDistrictChange('');
                  setRegionOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors ${
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
                  onClick={() => {
                    onRegionChange(r.soato);
                    onDistrictChange('');
                    setRegionOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors ${
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
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
          <Building className="w-3.5 h-3.5 text-blue-600" />
          <span>Ko'p xonadonli uy-joylar</span>
        </div>

        {/* District Dropdown */}
        <div ref={districtRef} className="relative">
          <button
            onClick={() => { setDistrictOpen(!districtOpen); setStatusOpen(false); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 border rounded-xl text-xs font-semibold shadow-2xs transition-colors ${
              selectedDistrict
                ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <span>{selectedDistrict || 'Tuman'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {districtOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-40 max-h-60 overflow-y-auto">
              {districts.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    onDistrictChange(d === 'Barcha tumanlar' ? '' : d);
                    setDistrictOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors ${
                    (selectedDistrict === d || (!selectedDistrict && d === 'Barcha tumanlar'))
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{d}</span>
                  {(selectedDistrict === d || (!selectedDistrict && d === 'Barcha tumanlar')) && (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status Dropdown (Default: Jarayonda) */}
        <div ref={statusRef} className="relative">
          <button
            onClick={() => { setStatusOpen(!statusOpen); setDistrictOpen(false); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 border rounded-xl text-xs font-semibold shadow-2xs transition-colors ${
              selectedStatus
                ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>{selectedStatus ? `Status: ${selectedStatus}` : 'Barcha statuslar'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {statusOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-40">
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onStatusChange(s === 'Barcha statuslar' ? '' : s);
                    setStatusOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors ${
                    (selectedStatus === s || (!selectedStatus && s === 'Barcha statuslar'))
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{s}</span>
                  {(selectedStatus === s || (!selectedStatus && s === 'Barcha statuslar')) && (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Yangi qo'shilganlar Filter Button */}
        {onToggleOnlyNew && (
          <button
            type="button"
            onClick={onToggleOnlyNew}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
              filterOnlyNew
                ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                : 'bg-white border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-700'
            }`}
            title="Haftalik yangilanishda yangi qo'shilgan binolar"
          >
            <Sparkles className={`w-3.5 h-3.5 ${filterOnlyNew ? 'text-white' : 'text-amber-500'}`} />
            <span>Yangi qo'shilganlar</span>
            {newObjectsCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filterOnlyNew ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {newObjectsCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Locate Me Action Button */}
      <button
        onClick={onMyLocation}
        disabled={locating}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs shadow-blue-500/25 transition-all"
      >
        <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
        <span>{locating ? 'Aniqlanmoqda...' : 'Mening joylashuvim'}</span>
      </button>
    </div>
  );
}
