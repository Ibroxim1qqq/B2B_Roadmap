'use client';
import { useState, useMemo } from 'react';
import { MapObject, UserProfile } from '../../lib/types';
import { 
  MapPin, Phone, Calendar, Clock, User, CheckCircle2, 
  Send, Map as MapIcon, Plus, Eye, Search, AlertCircle,
  ChevronLeft, ChevronRight, X
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
  const [tab, setTab] = useState<'visited' | 'pending'>('visited');
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Visited objects (real data where last_visit is present)
  const visitedObjects = useMemo(() => {
    return objects.filter(o => Boolean(o.last_visit || o.is_visited));
  }, [objects]);

  // Pending objects (objects without visit)
  const pendingObjects = useMemo(() => {
    return objects.filter(o => !o.last_visit && !o.is_visited);
  }, [objects]);

  const activeList = tab === 'visited' ? visitedObjects : pendingObjects;

  const filteredList = useMemo(() => {
    if (!query.trim()) return activeList;
    const q = query.toLowerCase().trim();
    return activeList.filter(o => 
      (o.object_name || '').toLowerCase().includes(q) ||
      (o.tjm_name || '').toLowerCase().includes(q) ||
      (o.district_name || '').toLowerCase().includes(q) ||
      (o.phone || '').toLowerCase().includes(q) ||
      (o.visited_by || '').toLowerCase().includes(q)
    );
  }, [activeList, query]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginated = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleTabChange = (t: 'visited' | 'pending') => {
    setTab(t);
    setCurrentPage(1);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-w-0 overflow-y-auto p-5">
      {/* Header & KPI cards */}
      <div className="mb-4 space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <span>Field Sales • Tashriflar Nazorati</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                B2B savdo menejerlarining qurilish obyektlariga qilgan real tashriflari va joylashuv qaydlari
              </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => handleTabChange('visited')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  tab === 'visited'
                    ? 'bg-white text-emerald-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tashrif qilinganlar ({visitedObjects.length})</span>
              </button>
              <button
                onClick={() => handleTabChange('pending')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  tab === 'pending'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Tashrif kutilayotganlar ({pendingObjects.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Bajarilgan tashriflar</div>
              <div className="text-xl font-bold text-slate-900">{visitedObjects.length} ta</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Kutilayotgan obyektlar</div>
              <div className="text-xl font-bold text-slate-900">{pendingObjects.length} ta</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Mas'ul xodim</div>
              <div className="text-sm font-bold text-slate-900 truncate">
                {currentUser?.name || 'Operator'} ({currentUser?.role || 'Field Sales'})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Pagination Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={tab === 'visited' ? "Tashriflar orasidan qidirish..." : "Kutilayotgan obyektlar orasidan qidirish..."}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
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

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">
              Sahifa {currentPage} / {totalPages}
            </span>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content list */}
      {filteredList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-xs">
          <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-sm">Hozircha ma'lumot topilmadi</p>
          <p className="text-xs text-slate-400 mt-1">Qidiruv so'zini o'zgartiring yoki yangi tashrif qayd eting</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {paginated.map((obj) => (
            <div
              key={obj.source_id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-900 text-sm line-clamp-1" title={obj.tjm_name || obj.object_name}>
                    {obj.tjm_name || obj.object_name}
                  </h3>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0">
                    ID: {obj.source_id}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{obj.district_name || 'Samarqand'} • {obj.address || 'Manzil ko\'rsatilmagan'}</span>
                </div>

                {/* Visit status box */}
                {obj.last_visit ? (
                  <div className="mt-3 bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 text-xs">
                    <div className="flex items-center justify-between text-emerald-800 font-semibold mb-1">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tashrif qayd etilgan</span>
                      </span>
                      <span className="text-[10px] bg-emerald-100 px-1.5 py-0.2 rounded text-emerald-700">
                        {obj.visited_by || 'Field Sales'}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{obj.last_visit}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 bg-slate-50 border border-slate-200 border-dashed rounded-xl p-2.5 text-xs text-slate-500 flex items-center justify-between">
                    <span>Tashrif qilinmagan</span>
                    <button
                      onClick={() => onRecordVisit(obj.source_id)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tashrif yozish</span>
                    </button>
                  </div>
                )}

                {/* Contact info if available */}
                {obj.phone && (
                  <div className="mt-2 text-xs flex items-center gap-2 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <a href={getCallUrl(obj.phone)} className="font-semibold text-slate-800 hover:text-emerald-600">
                      {obj.phone}
                    </a>
                    {obj.manager_name && <span className="text-slate-400 truncate">({obj.manager_name})</span>}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => onSelect(obj.source_id)}
                  className="flex-1 py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Tafsilot</span>
                </button>

                <button
                  onClick={() => onViewOnMap(obj.source_id)}
                  className="p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs transition-colors"
                  title="Xaritada ko'rish"
                >
                  <MapIcon className="w-4 h-4" />
                </button>

                <a
                  href={getNavigationUrl(obj.latitude, obj.longitude)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-xs transition-colors"
                  title="Google Maps Navigatsiya"
                >
                  <Send className="w-4 h-4" />
                </a>

                <button
                  onClick={() => onRecordVisit(obj.source_id)}
                  className="p-1.5 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl text-xs font-semibold transition-colors"
                  title="Tashrifni yangilash"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Pagination */}
      {totalPages > 1 && (
        <div className="mt-5 p-3 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            Ko'rsatilmoqda: {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredList.length)} / jami {filteredList.length} ta
          </span>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">
              Sahifa {currentPage} / {totalPages}
            </span>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5 shadow-2xs">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 text-slate-600"
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
