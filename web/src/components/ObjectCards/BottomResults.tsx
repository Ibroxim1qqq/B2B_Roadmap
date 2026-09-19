'use client';
import { useState } from 'react';
import { MapObject } from '../../lib/types';
import { MapPin, Phone, Building, Send, Check, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { getNavigationUrl } from '../../lib/utils';

interface BottomResultsProps {
  objects: (MapObject & { distance?: number })[];
  totalCount: number;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onLocate: () => void;
}

export default function BottomResults({
  objects,
  totalCount,
  onSelect,
  selectedId,
  onLocate
}: BottomResultsProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'has_internal' | 'fully_filled' | 'nearby' | 'visited' | 'not_visited'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Filter objects based on active pill
  const filtered = objects.filter(obj => {
    if (activeFilter === 'has_internal') return Boolean(obj.has_internal || obj.phone || obj.tjm_name);
    if (activeFilter === 'fully_filled') return Boolean(obj.is_fully_filled);
    if (activeFilter === 'nearby') return (obj.distance ?? 999) <= 3;
    if (activeFilter === 'visited') return Boolean(obj.is_visited);
    if (activeFilter === 'not_visited') return !obj.is_visited;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const countWithData = objects.filter(o => o.has_internal || o.phone || o.tjm_name).length;
  const countFullyFilled = objects.filter(o => o.is_fully_filled).length;
  const countVisited = objects.filter(o => o.is_visited).length;

  return (
    <section className="bg-slate-50 border-t border-slate-200 p-5 flex flex-col gap-4 shrink-0">
      {/* Header & Pagination Row */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <span>Natijalar</span>
          <span className="text-slate-400 font-normal">({filtered.length} / {totalCount} ta real obyekt)</span>
        </h2>

        {/* Pagination controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            Sahifa {currentPage} / {totalPages}
          </span>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips / Pills */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={() => { setActiveFilter('all'); setCurrentPage(1); }}
          className={`px-3.5 py-1.5 rounded-full font-semibold transition-all ${
            activeFilter === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          Barchasi ({totalCount})
        </button>

        <button
          onClick={() => { setActiveFilter('has_internal'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-full font-medium flex items-center gap-2 transition-all ${
            activeFilter === 'has_internal'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Ma'lumot kiritilgan</span>
          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
            {countWithData}
          </span>
        </button>

        <button
          onClick={() => { setActiveFilter('fully_filled'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-full font-medium flex items-center gap-2 transition-all ${
            activeFilter === 'fully_filled'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          <span>To'liq to'ldirilgan</span>
          <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
            {countFullyFilled}
          </span>
        </button>

        <button
          onClick={() => { setActiveFilter('nearby'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 transition-all ${
            activeFilter === 'nearby'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-blue-500" />
          <span>Faqat yaqin</span>
        </button>

        <button
          onClick={() => { setActiveFilter('visited'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 transition-all ${
            activeFilter === 'visited'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>Tashrif qilingan</span>
          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
            {countVisited}
          </span>
        </button>

        <button
          onClick={() => { setActiveFilter('not_visited'); setCurrentPage(1); }}
          className={`px-3 py-1.5 rounded-full font-medium transition-all ${
            activeFilter === 'not_visited'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          Tashrif qilinmagan
        </button>
      </div>

      {/* Cards Grid & Left Stats Box */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
        {/* Left Stats Widget */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <div>
            <button
              onClick={onLocate}
              className="w-full flex items-center gap-2.5 text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                  Mening joylashuvim
                </div>
                <div className="text-[11px] text-slate-400">Eng yaqin obyektlarni ko'rish</div>
              </div>
            </button>

            <div className="mt-4 space-y-2.5 pt-3 border-t border-slate-100 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Jami obyektlar</span>
                <span className="font-bold text-slate-800">{totalCount}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Ma'lumot kiritilgan</span>
                <span className="font-bold text-emerald-600">{countWithData}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Tashrif qilingan</span>
                <span className="font-bold text-blue-600">{countVisited}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Markaziy baza</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sinxronlangan"></span>
          </div>
        </div>

        {/* Object Cards (Take 3 Columns on desktop, showing real paginated cards) */}
        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {paginated.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl">
              Obyektlar topilmadi
            </div>
          ) : (
            paginated.map((obj) => {
              const isSelected = selectedId === obj.source_id;
              const dist = obj.distance !== undefined 
                ? (obj.distance < 1 ? `${Math.round(obj.distance * 1000)} m` : `${obj.distance.toFixed(1)} km`)
                : '—';

              return (
                <div
                  key={obj.source_id}
                  className={`bg-white border rounded-2xl p-3.5 flex flex-col justify-between transition-all shadow-2xs hover:shadow-md ${
                    isSelected ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200'
                  }`}
                >
                  <div>
                    {/* Top Thumbnail & Title */}
                    <div className="flex gap-3">
                      {obj.image_url ? (
                        <img
                          src={obj.image_url}
                          alt={obj.object_name}
                          className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200/80 flex flex-col items-center justify-center text-slate-400 shrink-0 shadow-2xs">
                          <Building className="w-6 h-6 text-slate-400" />
                          <span className="text-[9px] font-medium text-slate-400 mt-0.5">Rasm yo'q</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="font-bold text-slate-800 text-sm truncate" title={obj.tjm_name || obj.object_name}>
                            {obj.tjm_name || obj.object_name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                          <span>{obj.district_name || 'Samarqand'} • {dist}</span>
                        </div>
                        <div className="mt-1.5">
                          <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                            {obj.status || 'Qurilish jarayonida'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Details block */}
                    <div className="mt-3 space-y-1 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 truncate">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-400">TJM:</span>
                        <span className="font-medium text-slate-800 truncate">{obj.tjm_name || 'Kiritilmagan'}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-400">Telefon:</span>
                        <span className="font-medium text-slate-800 truncate">{obj.phone || 'Mavjud emas'}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-400">Manzil:</span>
                        <span className="font-medium text-slate-800 truncate">{obj.address || obj.sales_office || 'Samarqand viloyati'}</span>
                      </div>
                    </div>
                  </div>

                {/* Actions Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => onSelect(obj.source_id)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <span>Ochish</span>
                  </button>

                  <a
                    href={getNavigationUrl(obj.latitude, obj.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1 py-1.5 px-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
                    title="Google Maps Marshrut"
                  >
                    <Send className="w-3 h-3 text-blue-600" />
                    <span>Navigatsiya</span>
                  </a>
                </div>
              </div>
            );
          }))}
        </div>
      </div>
    </section>
  );
}
