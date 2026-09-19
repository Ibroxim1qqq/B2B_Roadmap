'use client';
import { useState, useMemo, useRef } from 'react';
import { MapObject, UserProfile } from '../../lib/types';
import { useClickOutside } from '../../hooks/useClickOutside';
import { 
  MapPin, Phone, Calendar, Clock, User, CheckCircle2, 
  Send, Map as MapIcon, Plus, Eye, Search, AlertCircle,
  ChevronLeft, ChevronRight, X, Building2, Layers, ChevronDown, Check, ShieldCheck, Tag
} from 'lucide-react';
import { getNavigationUrl, getCallUrl } from '../../lib/utils';

export interface VisitsViewProps {
  objects: (MapObject & { distance?: number })[];
  totalCount: number;
  onSelect: (id: string) => void;
  onViewOnMap: (id: string) => void;
  onRecordVisit: (id: string) => void;
  currentUser?: UserProfile | null;
}

export default function VisitsView({
  objects,
  totalCount,
  onSelect,
  onViewOnMap,
  onRecordVisit,
  currentUser
}: VisitsViewProps) {
  const [filterType, setFilterType] = useState<'visited' | 'filled' | 'pending' | 'all'>('visited');
  const [query, setQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('Barcha tumanlar');
  const [districtOpen, setDistrictOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const districtRef = useRef<HTMLDivElement>(null);
  useClickOutside(districtRef, () => setDistrictOpen(false), districtOpen);

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

  // Stats calculation
  const visitedCount = useMemo(() => objects.filter(o => Boolean(o.last_visit || o.is_visited)).length, [objects]);
  const filledCount = useMemo(() => objects.filter(o => Boolean(o.has_internal || o.tjm_name || o.phone || o.manager_name)).length, [objects]);
  const pendingCount = useMemo(() => objects.filter(o => !o.last_visit && !o.is_visited).length, [objects]);
  const totalObjectsCount = objects.length;

  // Filter based on active card filter
  const activeList = useMemo(() => {
    return objects.filter(obj => {
      // Card type filter
      if (filterType === 'visited' && !obj.last_visit && !obj.is_visited) return false;
      if (filterType === 'filled' && !obj.has_internal && !obj.phone && !obj.tjm_name && !obj.manager_name) return false;
      if (filterType === 'pending' && (obj.last_visit || obj.is_visited)) return false;

      // District filter
      if (selectedDistrict && selectedDistrict !== 'Barcha tumanlar') {
        const d = selectedDistrict.toLowerCase().trim();
        const mDistrict = (obj.district_name || '').toLowerCase().trim();
        if (!mDistrict.includes(d) && !d.includes(mDistrict)) return false;
      }

      // Search query filter
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const match = 
          (obj.object_name || '').toLowerCase().includes(q) ||
          (obj.tjm_name || '').toLowerCase().includes(q) ||
          (obj.district_name || '').toLowerCase().includes(q) ||
          (obj.address || '').toLowerCase().includes(q) ||
          (obj.phone || '').toLowerCase().includes(q) ||
          (obj.manager_name || '').toLowerCase().includes(q) ||
          (obj.visited_by || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [objects, filterType, selectedDistrict, query]);

  const totalPages = Math.ceil(activeList.length / pageSize) || 1;
  const paginated = activeList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCardFilterClick = (type: 'visited' | 'filled' | 'pending' | 'all') => {
    setFilterType(type);
    setCurrentPage(1);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-w-0 overflow-y-auto p-5 space-y-4">
      
      {/* 1. Interactive Filter Stat Cards (Ustiga bossa filtrlash) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Tashrif qilinganlar */}
        <div
          onClick={() => handleCardFilterClick('visited')}
          className={`rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all flex items-center gap-3.5 ${
            filterType === 'visited'
              ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/30'
          }`}
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${
            filterType === 'visited' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
          }`}>
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-600 truncate">Tashrif qilinganlar</div>
            <div className="text-xl font-black text-emerald-700 leading-tight mt-0.5">
              {visitedCount} <span className="text-xs font-normal text-slate-400">ta</span>
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              {filterType === 'visited' ? '● Tanlangan' : 'Filtrlash uchun bosing'}
            </div>
          </div>
        </div>

        {/* Card 2: Ma'lumoti to'ldirilganlar */}
        <div
          onClick={() => handleCardFilterClick('filled')}
          className={`rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all flex items-center gap-3.5 ${
            filterType === 'filled'
              ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
              : 'bg-white border-slate-200/90 hover:border-indigo-300 hover:bg-indigo-50/30'
          }`}
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${
            filterType === 'filled' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'
          }`}>
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-600 truncate">Ma'lumoti to'ldirilganlar</div>
            <div className="text-xl font-black text-indigo-700 leading-tight mt-0.5">
              {filledCount} <span className="text-xs font-normal text-slate-400">ta</span>
            </div>
            <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">
              {filterType === 'filled' ? '● Tanlangan' : 'Filtrlash uchun bosing'}
            </div>
          </div>
        </div>

        {/* Card 3: Tashrif qilinmaganlar */}
        <div
          onClick={() => handleCardFilterClick('pending')}
          className={`rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all flex items-center gap-3.5 ${
            filterType === 'pending'
              ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white border-slate-200/90 hover:border-amber-300 hover:bg-amber-50/30'
          }`}
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${
            filterType === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'
          }`}>
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-600 truncate">Tashrif qilinmaganlar</div>
            <div className="text-xl font-black text-amber-700 leading-tight mt-0.5">
              {pendingCount} <span className="text-xs font-normal text-slate-400">ta</span>
            </div>
            <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
              {filterType === 'pending' ? '● Tanlangan' : 'Filtrlash uchun bosing'}
            </div>
          </div>
        </div>

        {/* Card 4: Barcha TJM-lar */}
        <div
          onClick={() => handleCardFilterClick('all')}
          className={`rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all flex items-center gap-3.5 ${
            filterType === 'all'
              ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/30'
          }`}
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${
            filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
          }`}>
            <Building2 className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-600 truncate">Barcha TJM-lar</div>
            <div className="text-xl font-black text-slate-900 leading-tight mt-0.5">
              {totalObjectsCount} <span className="text-xs font-normal text-slate-400">ta</span>
            </div>
            <div className="text-[10px] text-blue-600 font-semibold mt-0.5">
              {filterType === 'all' ? '● Tanlangan' : 'Filtrlash uchun bosing'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Search & District Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="TJM nomi, manzil, telefon, mas'ul xodim..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-xs outline-none transition-all"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setCurrentPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* District Dropdown */}
          <div className="relative" ref={districtRef}>
            <button
              type="button"
              onClick={() => setDistrictOpen(!districtOpen)}
              className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2 transition-all cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>{selectedDistrict}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {districtOpen && (
              <div className="absolute left-0 mt-1.5 w-52 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                {districts.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setSelectedDistrict(d); setDistrictOpen(false); setCurrentPage(1); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                      selectedDistrict === d ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{d}</span>
                    {selectedDistrict === d && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Total found info */}
        <div className="text-xs text-slate-500 font-semibold">
          Topildi: <span className="font-bold text-slate-900">{activeList.length}</span> ta TJM
        </div>
      </div>

      {/* 3. TJM Visits Table */}
      {activeList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-xs">
          <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="font-bold text-sm text-slate-700">Ma'lumot topilmadi</p>
          <p className="text-xs text-slate-400 mt-1">Tanlangan filtr bo'yicha hech qanday obyekt mavjud emas</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4"># ID</th>
                  <th className="py-3 px-4">TJM / Obyekt nomi</th>
                  <th className="py-3 px-4">Tuman & Manzil</th>
                  <th className="py-3 px-4">Qavat / Xonadon</th>
                  <th className="py-3 px-4">B2B Kontaktlar</th>
                  <th className="py-3 px-4">Tashrif Holati</th>
                  <th className="py-3 px-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((obj) => {
                  const hasB2B = Boolean(obj.has_internal || obj.phone || obj.tjm_name || obj.manager_name);
                  const isVisitedObj = Boolean(obj.last_visit || obj.is_visited);

                  return (
                    <tr
                      key={obj.source_id}
                      className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                      onClick={() => onSelect(obj.source_id)}
                    >
                      {/* 1. ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-400 text-[11px]">
                        #{obj.source_id}
                      </td>

                      {/* 2. Title & Status */}
                      <td className="py-3 px-4 min-w-[220px] max-w-[320px]">
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1" title={obj.tjm_name || obj.object_name}>
                          {obj.tjm_name || obj.object_name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {obj.status || 'Jarayonda'}
                          </span>
                          {obj.priority && (
                            <span className="text-[10px] font-semibold text-indigo-600 flex items-center gap-0.5">
                              <Tag className="w-3 h-3" />
                              {obj.priority}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. District & Address */}
                      <td className="py-3 px-4 text-slate-600 min-w-[180px] max-w-[240px]">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate">{obj.district_name || 'Samarqand'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {obj.address || 'Manzil ko\'rsatilmagan'}
                        </div>
                      </td>

                      {/* 4. Floors & Apartments */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          <span>{obj.floors && obj.floors !== '—' ? `${obj.floors} qavat` : '—'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {obj.apartment_count && obj.apartment_count !== '0' ? `${obj.apartment_count} xonadon` : '—'}
                        </div>
                      </td>

                      {/* 5. Contacts */}
                      <td className="py-3 px-4 min-w-[160px]">
                        {obj.phone ? (
                          <div className="space-y-0.5">
                            <a
                              href={getCallUrl(obj.phone)}
                              onClick={(e) => e.stopPropagation()}
                              className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{obj.phone}</span>
                            </a>
                            {obj.manager_name && (
                              <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                <span>{obj.manager_name}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Kiritilmagan</span>
                        )}
                      </td>

                      {/* 6. Visit Status */}
                      <td className="py-3 px-4 min-w-[200px]">
                        {isVisitedObj ? (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 space-y-0.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Tashrif buyurilgan</span>
                              </span>
                              <span className="text-[10px] bg-emerald-100 px-1.5 py-0.2 rounded text-emerald-700">
                                {obj.visited_by || 'Field Sales'}
                              </span>
                            </div>
                            <div className="text-[10px] text-emerald-700 flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-emerald-600" />
                              <span>{obj.last_visit}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap">
                              Tashrif qilinmagan
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRecordVisit(obj.source_id);
                              }}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                            >
                              + Tashrif
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 7. Action buttons */}
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelect(obj.source_id)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="Tafsilot"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onViewOnMap(obj.source_id)}
                            className="p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
                            title="Xaritada ko'rish"
                          >
                            <MapIcon className="w-3.5 h-3.5" />
                          </button>

                          <a
                            href={getNavigationUrl(obj.latitude, obj.longitude)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-xs transition-colors cursor-pointer"
                            title="Google Maps Navigatsiya"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => onRecordVisit(obj.source_id)}
                            className="p-1.5 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="Tashrifni yangilash"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Pagination Footer */}
      {totalPages > 1 && (
        <div className="mt-4 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            Ko'rsatilmoqda: {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, activeList.length)} / jami {activeList.length} ta
          </span>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">
              Sahifa {currentPage} / {totalPages}
            </span>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5 shadow-2xs">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 text-slate-600 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 text-slate-600 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
