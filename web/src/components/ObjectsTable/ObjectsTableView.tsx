'use client';
import { useState, useMemo, useRef } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { MapObject } from '../../lib/types';
import { 
  Building, Phone, MapPin, Search, ChevronLeft, ChevronRight, 
  Map as MapIcon, Send, CheckCircle2, ArrowUpDown, Eye, ChevronDown, Check, X,
  Building2, Clock, ShieldCheck, Layers, Tag
} from 'lucide-react';
import { getNavigationUrl, getCallUrl } from '../../lib/utils';

interface ObjectsTableViewProps {
  objects: (MapObject & { distance?: number })[];
  totalCount: number;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onViewOnMap: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedDistrict: string;
  onDistrictChange: (d: string) => void;
  selectedStatus: string;
  onStatusChange: (s: string) => void;
}

export default function ObjectsTableView({
  objects,
  totalCount,
  onSelect,
  selectedId,
  onViewOnMap,
  searchQuery,
  onSearchChange,
  selectedDistrict,
  onDistrictChange,
  selectedStatus,
  onStatusChange
}: ObjectsTableViewProps) {
  const [dataFilter, setDataFilter] = useState<'all' | 'visited' | 'filled' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'district' | 'floors' | 'apartments' | 'visit'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const districtRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useClickOutside(districtRef, () => setDistrictOpen(false), districtOpen);
  useClickOutside(statusRef, () => setStatusOpen(false), statusOpen);
  const pageSize = 15;

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

  // Stats calculation
  const visitedCount = useMemo(() => objects.filter(o => Boolean(o.last_visit || o.is_visited)).length, [objects]);
  const filledCount = useMemo(() => objects.filter(o => Boolean(o.has_internal || o.phone || o.tjm_name || o.manager_name)).length, [objects]);
  const pendingCount = useMemo(() => objects.filter(o => !o.last_visit && !o.is_visited).length, [objects]);
  const totalObjectsCount = objects.length;

  // Filter based on data completeness and card selection
  const filtered = useMemo(() => {
    return objects.filter(obj => {
      if (dataFilter === 'visited') return Boolean(obj.is_visited || obj.last_visit);
      if (dataFilter === 'filled') return Boolean(obj.has_internal || obj.phone || obj.tjm_name || obj.manager_name);
      if (dataFilter === 'pending') return !obj.is_visited && !obj.last_visit;
      return true;
    });
  }, [objects, dataFilter]);

  // Sort objects
  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        const nameA = (a.tjm_name || a.object_name || '').toLowerCase();
        const nameB = (b.tjm_name || b.object_name || '').toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortBy === 'district') {
        comparison = (a.district_name || '').localeCompare(b.district_name || '');
      } else if (sortBy === 'floors') {
        const flA = parseInt(a.floors || '0') || 0;
        const flB = parseInt(b.floors || '0') || 0;
        comparison = flA - flB;
      } else if (sortBy === 'apartments') {
        const apA = parseInt(a.apartment_count || '0') || 0;
        const apB = parseInt(b.apartment_count || '0') || 0;
        comparison = apA - apB;
      } else if (sortBy === 'visit') {
        const vA = a.last_visit || '';
        const vB = b.last_visit || '';
        comparison = vA.localeCompare(vB);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filtered, sortBy, sortOrder]);

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (col: 'name' | 'district' | 'floors' | 'apartments' | 'visit') => {
    if (sortBy === col) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  const hasActiveFilters = Boolean(searchQuery || selectedDistrict || selectedStatus || dataFilter !== 'all');

  const clearAllFilters = () => {
    onSearchChange('');
    onDistrictChange('');
    onStatusChange('');
    setDataFilter('all');
    setCurrentPage(1);
  };

  const handleCardFilterClick = (type: 'all' | 'visited' | 'filled' | 'pending') => {
    setDataFilter(type);
    setCurrentPage(1);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-w-0 overflow-y-auto p-5 space-y-4">
      
      {/* 1. Interactive 4 Summary Filter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Jami TJM-lar */}
        <div
          onClick={() => handleCardFilterClick('all')}
          className={`rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all flex items-center gap-3.5 ${
            dataFilter === 'all'
              ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/30'
          }`}
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${
            dataFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
          }`}>
            <Building2 className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-600 truncate">Jami TJM-lar</div>
            <div className="text-xl font-black text-slate-900 leading-tight mt-0.5">
              {totalObjectsCount} <span className="text-xs font-normal text-slate-400">ta</span>
            </div>
          </div>
        </div>

        {/* Card 2: Tashrif qilingan */}
        <div
          onClick={() => handleCardFilterClick('visited')}
          className={`rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all flex items-center gap-3.5 ${
            dataFilter === 'visited'
              ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/30'
          }`}
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${
            dataFilter === 'visited' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
          }`}>
            <MapPin className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-600 truncate">Tashrif qilingan</div>
            <div className="text-xl font-black text-emerald-700 leading-tight mt-0.5">
              {visitedCount} <span className="text-xs font-normal text-slate-400">ta</span>
            </div>
          </div>
        </div>

        {/* Card 3: Ma'lumot to'ldirilgan */}
        <div
          onClick={() => handleCardFilterClick('filled')}
          className={`rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all flex items-center gap-3.5 ${
            dataFilter === 'filled'
              ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
              : 'bg-white border-slate-200/90 hover:border-indigo-300 hover:bg-indigo-50/30'
          }`}
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${
            dataFilter === 'filled' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'
          }`}>
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-600 truncate">Ma'lumot to'ldirilgan</div>
            <div className="text-xl font-black text-indigo-700 leading-tight mt-0.5">
              {filledCount} <span className="text-xs font-normal text-slate-400">ta</span>
            </div>
          </div>
        </div>

        {/* Card 4: Tashrif qilinmagan */}
        <div
          onClick={() => handleCardFilterClick('pending')}
          className={`rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all flex items-center gap-3.5 ${
            dataFilter === 'pending'
              ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white border-slate-200/90 hover:border-amber-300 hover:bg-amber-50/30'
          }`}
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${
            dataFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'
          }`}>
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-600 truncate">Tashrif qilinmagan</div>
            <div className="text-xl font-black text-amber-700 leading-tight mt-0.5">
              {pendingCount} <span className="text-xs font-normal text-slate-400">ta</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filters & Search Toolbar Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Table Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Jadval bo'yicha qidirish..."
              value={searchQuery}
              onChange={(e) => { onSearchChange(e.target.value); setCurrentPage(1); }}
              className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-xs outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* District Selector */}
          <div ref={districtRef} className="relative">
            <button
              onClick={() => { setDistrictOpen(!districtOpen); setStatusOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <span>{selectedDistrict || 'Barcha tumanlar'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {districtOpen && (
              <div className="absolute left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1.5 max-h-56 overflow-y-auto animate-in fade-in duration-150">
                {districts.map(d => (
                  <button
                    key={d}
                    onClick={() => {
                      onDistrictChange(d === 'Barcha tumanlar' ? '' : d);
                      setDistrictOpen(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl flex items-center justify-between text-xs font-medium cursor-pointer ${
                      (selectedDistrict === d || (!selectedDistrict && d === 'Barcha tumanlar'))
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{d}</span>
                    {(selectedDistrict === d || (!selectedDistrict && d === 'Barcha tumanlar')) && (
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Selector */}
          <div ref={statusRef} className="relative">
            <button
              onClick={() => { setStatusOpen(!statusOpen); setDistrictOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <span>{selectedStatus ? `Status: ${selectedStatus}` : 'Barcha statuslar'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {statusOpen && (
              <div className="absolute left-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1.5 animate-in fade-in duration-150">
                {statuses.map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      onStatusChange(s === 'Barcha statuslar' ? '' : s);
                      setStatusOpen(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl flex items-center justify-between text-xs font-medium cursor-pointer ${
                      (selectedStatus === s || (!selectedStatus && s === 'Barcha statuslar'))
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{s}</span>
                    {(selectedStatus === s || (!selectedStatus && s === 'Barcha statuslar')) && (
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>


        </div>

        {/* Found Count */}
        <div className="text-slate-500 font-semibold text-xs whitespace-nowrap">
          Ko'rsatilmoqda: <strong className="text-slate-900">{sorted.length}</strong> ta obyekt
        </div>
      </div>

      {/* 3. Objects Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex-1 flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12"># ID</th>
                <th 
                  onClick={() => toggleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Obyekt / TJM nomi</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('district')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tuman</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Status</th>
                <th 
                  onClick={() => toggleSort('floors')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Qavat</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Pudratchi / Buyurtmachi</th>
                <th className="py-3 px-4">B2B Kontaktlar</th>
                <th 
                  onClick={() => toggleSort('visit')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Oxirgi Tashrif</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Obyektlar topilmadi. Qidiruv parametrlarini o'zgartirib ko'ring.
                  </td>
                </tr>
              ) : (
                paginated.map((obj) => {
                  const isVisited = Boolean(obj.is_visited || obj.last_visit);
                  const hasInternal = Boolean(obj.has_internal || obj.phone || obj.tjm_name);

                  return (
                    <tr
                      key={obj.source_id}
                      onClick={() => onSelect(obj.source_id)}
                      className={`hover:bg-blue-50/50 transition-colors cursor-pointer group ${
                        selectedId === obj.source_id ? 'bg-blue-50/80 font-medium' : ''
                      }`}
                    >
                      {/* ID */}
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {obj.source_id}
                      </td>

                      {/* Name & TJM */}
                      <td className="py-3 px-4 min-w-[200px] max-w-[280px]">
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {obj.tjm_name ? obj.tjm_name : obj.object_name}
                        </div>
                        {obj.tjm_name && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {obj.object_name}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {obj.address || 'Manzil kiritilmagan'}
                        </div>
                      </td>

                      {/* District */}
                      <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {obj.district_name || 'Samarqand'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          obj.status_id === 2 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : obj.status_id === 3
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {obj.status || 'Jarayonda'}
                        </span>
                      </td>

                      {/* Floors & Apartments */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div>{obj.floors && obj.floors !== '—' ? `${obj.floors} qavat` : '—'}</div>
                        <div className="text-[10px] text-slate-400">{obj.apartment_count && obj.apartment_count !== '0' ? `${obj.apartment_count} xonadon` : ''}</div>
                      </td>

                      {/* Builder / Customer */}
                      <td className="py-3 px-4 text-slate-600 max-w-[200px]">
                        <div className="font-semibold text-slate-800 text-[11px] truncate">
                          {obj.builder || '—'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {obj.customer || '—'}
                        </div>
                      </td>

                      {/* Internal Contacts */}
                      <td className="py-3 px-4 min-w-[150px]">
                        {obj.phone ? (
                          <div className="space-y-0.5">
                            <a
                              href={getCallUrl(obj.phone)}
                              onClick={(e) => e.stopPropagation()}
                              className="font-bold text-emerald-700 hover:underline flex items-center gap-1 text-[11px]"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{obj.phone}</span>
                            </a>
                            {obj.manager_name && (
                              <div className="text-[10px] text-slate-500 truncate">
                                {obj.manager_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Kiritilmagan</span>
                        )}
                      </td>

                      {/* Last Visit */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isVisited ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[130px]">{obj.last_visit}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelect(obj.source_id)}
                            className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                            title="Tafsilot"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onViewOnMap(obj.source_id)}
                            className="p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Xaritada ko'rish"
                          >
                            <MapIcon className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={getNavigationUrl(obj.latitude, obj.longitude)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                            title="Google Maps Navigatsiya"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Table Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Ko'rsatilmoqda: {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sorted.length)} / jami {sorted.length} ta
            </span>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">
                Sahifa {currentPage} / {totalPages}
              </span>
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-600 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-600 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
