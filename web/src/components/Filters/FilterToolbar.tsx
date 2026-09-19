'use client';
import { MapPin, RefreshCw, Building, ChevronDown, Navigation, Check } from 'lucide-react';
import { useState, useRef } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

interface FilterToolbarProps {
  selectedDistrict: string;
  onDistrictChange: (district: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  onMyLocation: () => void;
  locating?: boolean;
}

export default function FilterToolbar({
  selectedDistrict,
  onDistrictChange,
  selectedStatus,
  onStatusChange,
  onMyLocation,
  locating = false
}: FilterToolbarProps) {
  const [districtOpen, setDistrictOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const districtRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useClickOutside(districtRef, () => setDistrictOpen(false), districtOpen);
  useClickOutside(statusRef, () => setStatusOpen(false), statusOpen);

  const districts = [
    'Barcha tumanlar',
    'Samarqand shahar',
    'Samarqand tumani',
    'Urgut tumani',
    'Toyloq tumani',
    'Oqdaryo tumani',
    'Jomboy tumani',
    'Ishtixon tumani',
    'Payariq tumani',
    'Kattaqo\'rg\'on tumani',
    'Bulung\'ur tumani',
    'Pastdarg\'om tumani',
    'Narpay tumani',
    'Qo\'shrabot tumani',
    'Nurobod tumani'
  ];

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
        {/* Region (Fixed) */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <span>Samarqand viloyati</span>
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
