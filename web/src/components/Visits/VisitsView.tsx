'use client';
import { useState, useMemo, useRef } from 'react';
import { MapObject, UserProfile } from '../../lib/types';
import { useClickOutside } from '../../hooks/useClickOutside';
import { 
  MapPin, Phone, Calendar, Clock, User, CheckCircle2, 
  Send, Map as MapIcon, Plus, Eye, Search, AlertCircle,
  ChevronLeft, ChevronRight, X, Building2, Layers, ChevronDown, Check, ShieldCheck
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
  const pageSize = 12;

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
      
      {/* 1. Top Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <span>Tashriflar va Monitoring Boshqaruvi</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              B2B sotuv menejerlarining qurilish obyektlariga qilgan tashriflari va to'ldirilgan ma'lumotlar hisoboti
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
            <User className="w-4 h-4 text-blue-600" />
            <span>Mas'ul: <strong className="text-slate-900">{currentUser?.name || 'Operator'}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Filter Stat Cards (Ustiga bossa filtrlash) */}
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

      {/* 3. Search & District Filters Bar */}
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
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

      {/* 4. TJM Cards Grid */}
      {activeList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-xs">
          <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="font-bold text-sm text-slate-700">Ma'lumot topilmadi</p>
          <p className="text-xs text-slate-400 mt-1">Tanlangan filtr bo'yicha hech qanday obyekt mavjud emas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((obj) => {
            const hasB2B = Boolean(obj.has_internal || obj.phone || obj.tjm_name || obj.manager_name);
            const isVisitedObj = Boolean(obj.last_visit || obj.is_visited);

            return (
              <div
                key={obj.source_id}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar: Title & ID */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors" title={obj.tjm_name || obj.object_name}>
                      {obj.tjm_name || obj.object_name}
                    </h3>
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0">
                      #{obj.source_id}
                    </span>
                  </div>

                  {/* Location & District */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{obj.district_name || 'Samarqand'} • {obj.address || 'Manzil ko\'rsatilmagan'}</span>
                  </div>

                  {/* Badges: Status & Building info */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      {obj.status || 'Qurilish jarayonida'}
                    </span>
                    {obj.floors && obj.floors !== '—' && (
                      <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {obj.floors} qavat
                      </span>
                    )}
                    {obj.apartment_count && obj.apartment_count !== '0' && (
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {obj.apartment_count} xonadon
                      </span>
                    )}
                  </div>

                  {/* Visit Status Box */}
                  <div className={`mt-3 rounded-xl p-2.5 text-xs border ${
                    isVisitedObj 
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                      : 'bg-slate-50 border-slate-200 border-dashed text-slate-500'
                  }`}>
                    {isVisitedObj ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-emerald-800 font-bold text-[11px]">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Tashrif buyurilgan</span>
                          </span>
                          <span className="text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full text-emerald-800">
                            {obj.visited_by || 'Field Sales'}
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          <span>{obj.last_visit}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Hali tashrif qilinmagan</span>
                        </span>
                        <button
                          onClick={() => onRecordVisit(obj.source_id)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Tashrif</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* B2B Contacts preview if available */}
                  {hasB2B && (
                    <div className="mt-2.5 space-y-1 text-xs text-slate-700 pt-2 border-t border-slate-100">
                      {obj.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <a href={getCallUrl(obj.phone)} className="font-bold text-slate-900 hover:text-emerald-600">
                            {obj.phone}
                          </a>
                        </div>
                      )}
                      {obj.manager_name && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{obj.manager_name}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => onSelect(obj.source_id)}
                    className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Tafsilot</span>
                  </button>

                  <button
                    onClick={() => onViewOnMap(obj.source_id)}
                    className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs transition-colors cursor-pointer"
                    title="Xaritada ko'rish"
                  >
                    <MapIcon className="w-4 h-4" />
                  </button>

                  <a
                    href={getNavigationUrl(obj.latitude, obj.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-xs transition-colors cursor-pointer"
                    title="Google Maps Navigatsiya"
                  >
                    <Send className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => onRecordVisit(obj.source_id)}
                    className="p-2 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="Tashrifni yangilash"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Pagination Footer */}
      {totalPages > 1 && (
        <div className="mt-5 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs flex items-center justify-between text-xs">
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
