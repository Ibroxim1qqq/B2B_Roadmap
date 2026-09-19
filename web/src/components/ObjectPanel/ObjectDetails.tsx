'use client';
import { useState } from 'react';
import { ObjectDetail } from '../../lib/types';
import { 
  X, MapPin, Building, HardHat, Layers, Calendar, 
  ExternalLink, FileText, Phone, User, Send, Globe, 
  Clock, CheckCircle2, Navigation, Pencil, Trash2
} from 'lucide-react';
import { getNavigationUrl, getCallUrl, getTelegramUrl, getInstagramUrl } from '../../lib/utils';

interface Props {
  detail: ObjectDetail;
  distance?: number;
  onClose: () => void;
  onEdit: () => void;
  onRecordVisit: () => Promise<void>;
  onClearB2B?: () => void;
}

export default function ObjectDetails({ detail, distance, onClose, onEdit, onRecordVisit, onClearB2B }: Props) {
  const { source, internal } = detail;
  const [activeTab, setActiveTab] = useState<'info' | 'custom' | 'visits' | 'map'>('info');
  const [visitRecorded, setVisitRecorded] = useState(false);
  const [loadingVisit, setLoadingVisit] = useState(false);

  const distText = distance !== undefined 
    ? (distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`)
    : '—';

  const hasB2BData = Boolean(
    internal.tjm_name || 
    internal.phone || 
    internal.sales_office || 
    internal.manager_name || 
    internal.manager_phone || 
    internal.telegram || 
    internal.instagram || 
    internal.notes
  );

  const handleVisit = async () => {
    if (loadingVisit) return;
    setLoadingVisit(true);
    try {
      await onRecordVisit();
      setVisitRecorded(true);
      setTimeout(() => setVisitRecorded(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVisit(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-xl overflow-hidden z-20">
      {/* Top Header Card */}
      <div className="p-5 border-b border-slate-100 bg-white relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          title="Yopish"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3.5 pr-8">
          <div className="w-16 h-16 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
            <Building className="w-8 h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 line-clamp-2">
                {internal.tjm_name ? internal.tjm_name : source.object_name}
              </h2>
            </div>

            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {source.status || 'Qurilish jarayonida'}
              </span>
              <span className="text-xs text-slate-500">
                {source.district_name || 'Samarqand'}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                <MapPin className="w-3 h-3 text-blue-500" />
                {distText}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-[11px] text-slate-400">ID: {source.source_id}</span>
            </div>
          </div>
        </div>

        {/* 4 Tabs */}
        <div className="flex items-center gap-5 mt-5 border-b border-slate-100 text-xs font-semibold text-slate-500">
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-2.5 transition-all relative ${
              activeTab === 'info' ? 'text-blue-600 font-bold' : 'hover:text-slate-800'
            }`}
          >
            Ma'lumotlar
            {activeTab === 'info' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-2.5 transition-all relative ${
              activeTab === 'custom' ? 'text-blue-600 font-bold' : 'hover:text-slate-800'
            }`}
          >
            Qo'shimcha maydonlar
            {activeTab === 'custom' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('visits')}
            className={`pb-2.5 transition-all relative ${
              activeTab === 'visits' ? 'text-blue-600 font-bold' : 'hover:text-slate-800'
            }`}
          >
            Tashriflar
            {activeTab === 'visits' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`pb-2.5 transition-all relative ${
              activeTab === 'map' ? 'text-blue-600 font-bold' : 'hover:text-slate-800'
            }`}
          >
            Xarita
            {activeTab === 'map' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></span>
            )}
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {activeTab === 'info' && (
          <>
            {/* 1. Manba ma'lumotlari (100% Real from Google Sheets / DSHK) */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Manba ma'lumotlari
                </h3>
                <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">
                  Shaffof Qurilish
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <Building className="w-3.5 h-3.5 text-slate-400" /> Obyekt nomi
                  </span>
                  <span className="font-medium text-slate-800 text-right">{source.object_name}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> Manzil
                  </span>
                  <span className="font-medium text-slate-800 text-right">{source.address || 'Kiritilmagan'}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <Building className="w-3.5 h-3.5 text-slate-400" /> Tuman
                  </span>
                  <span className="font-medium text-slate-800 text-right">{source.district_name || 'Samarqand tumani'}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Buyurtmachi
                  </span>
                  <span className="font-medium text-slate-800 text-right">{source.customer || '—'}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <HardHat className="w-3.5 h-3.5 text-slate-400" /> Quruvchi
                  </span>
                  <span className="font-medium text-slate-800 text-right">{source.builder || '—'}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <Layers className="w-3.5 h-3.5 text-slate-400" /> Qavat
                  </span>
                  <span className="font-medium text-slate-800">{source.floors}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <Building className="w-3.5 h-3.5 text-slate-400" /> Xonadonlar
                  </span>
                  <span className="font-medium text-slate-800">{source.apartment_count || '0'} ta</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Muddat
                  </span>
                  <span className="font-medium text-slate-800">{source.deadline || '—'}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> Passport
                  </span>
                  {source.passport_url && source.passport_url !== '#' && source.passport_url.trim() ? (
                    <a
                      href={source.passport_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span>Xulosa PDF</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-400">Mavjud emas</span>
                  )}
                </div>

                <div className="flex items-start justify-between gap-3 pt-1 border-t border-slate-200/50">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" /> Manba
                  </span>
                  <a
                    href={source.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-blue-600 hover:underline truncate max-w-[200px]"
                  >
                    Shaffof Qurilish #{source.source_id}
                  </a>
                </div>
              </div>
            </div>

            {/* 2. Ichki B2B ma'lumotlar (100% Real, ZERO fake fallbacks) */}
            <div className={`border rounded-2xl p-4 transition-all ${
              hasB2BData 
                ? 'bg-emerald-50/40 border-emerald-200/80' 
                : 'bg-slate-50/50 border-slate-200 border-dashed'
            }`}>
              <div className="flex items-center justify-between mb-3.5">
                <h3 className={`text-xs font-bold uppercase tracking-wide ${hasB2BData ? 'text-emerald-800' : 'text-slate-700'}`}>
                  Ichki B2B ma'lumotlar
                </h3>
                {hasB2BData ? (
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    To'ldirilgan
                  </span>
                ) : (
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    Kiritilmagan
                  </span>
                )}
              </div>

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 shrink-0">TJM nomi:</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {internal.tjm_name || <span className="text-slate-400 font-normal italic">Kiritilmagan</span>}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 shrink-0">Telefon:</span>
                  {internal.phone ? (
                    <a 
                      href={getCallUrl(internal.phone)} 
                      className="font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{internal.phone}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">Kiritilmagan</span>
                  )}
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 shrink-0">Sotuv ofisi:</span>
                  <span className="font-medium text-slate-900 text-right">
                    {internal.sales_office || <span className="text-slate-400 font-normal italic">Kiritilmagan</span>}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 shrink-0">Rahbar ismi:</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {internal.manager_name || <span className="text-slate-400 font-normal italic">Kiritilmagan</span>}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 shrink-0">Rahbar telefoni:</span>
                  {internal.manager_phone ? (
                    <a 
                      href={getCallUrl(internal.manager_phone)} 
                      className="font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{internal.manager_phone}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">Kiritilmagan</span>
                  )}
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 shrink-0">Telegram:</span>
                  {internal.telegram ? (
                    <a 
                      href={getTelegramUrl(internal.telegram)} 
                      target="_blank" 
                      rel="noreferrer"
                      className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>{internal.telegram}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">Kiritilmagan</span>
                  )}
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 shrink-0">Instagram:</span>
                  {internal.instagram ? (
                    <a 
                      href={getInstagramUrl(internal.instagram)} 
                      target="_blank" 
                      rel="noreferrer"
                      className="font-semibold text-pink-600 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                    >
                      <Globe className="w-3 h-3" />
                      <span>{internal.instagram}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">Kiritilmagan</span>
                  )}
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-400 shrink-0">Izoh:</span>
                  <span className="font-medium text-slate-800 text-right">
                    {internal.notes || <span className="text-slate-400 font-normal italic">Izoh yo'q</span>}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3 pt-1 border-t border-slate-200/50">
                  <span className="text-slate-400 shrink-0">Oxirgi tashrif:</span>
                  <span className="font-medium text-slate-800 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {internal.last_visit || <span className="text-slate-400 font-normal italic">Tashrif qilinmagan</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Masofa va harakatlar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Masofa va harakatlar</span>
                </h3>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  {distText}
                </span>
              </div>

              {/* 4 Action buttons grid */}
              <div className="grid grid-cols-4 gap-2">
                <a
                  href={getNavigationUrl(source.latitude, source.longitude)}
                  target="_blank"
                  rel="noreferrer"
                  title="Google Maps Navigatsiya (https://www.google.com/maps)"
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 px-2 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold shadow-xs shadow-blue-500/20 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Navigatsiya</span>
                </a>

                {internal.phone ? (
                  <a
                    href={getCallUrl(internal.phone)}
                    className="border border-emerald-300 hover:bg-emerald-50 text-emerald-700 rounded-xl py-2 px-2 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold bg-white transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Qo'ng'iroq</span>
                  </a>
                ) : (
                  <div
                    className="border border-slate-200 text-slate-300 rounded-xl py-2 px-2 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold bg-slate-50 cursor-not-allowed"
                    title="Telefon kiritilmagan"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Qo'ng'iroq</span>
                  </div>
                )}

                {internal.telegram ? (
                  <a
                    href={getTelegramUrl(internal.telegram)}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-sky-300 hover:bg-sky-50 text-sky-600 rounded-xl py-2 px-2 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold bg-white transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    <span>Telegram</span>
                  </a>
                ) : (
                  <div
                    className="border border-slate-200 text-slate-300 rounded-xl py-2 px-2 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold bg-slate-50 cursor-not-allowed"
                    title="Telegram kiritilmagan"
                  >
                    <Send className="w-4 h-4" />
                    <span>Telegram</span>
                  </div>
                )}

                <button
                  onClick={handleVisit}
                  disabled={loadingVisit}
                  className={`rounded-xl py-2 px-2 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-all disabled:opacity-50 ${
                    visitRecorded 
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-500/20'
                  }`}
                >
                  <CheckCircle2 className={`w-4 h-4 ${loadingVisit ? 'animate-spin' : ''}`} />
                  <span>{loadingVisit ? 'Saqlanmoqda...' : visitRecorded ? 'Saqlandi' : 'Tashrif'}</span>
                </button>
              </div>

              {/* CRUD Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={onEdit}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs shadow-blue-500/20 transition-all"
                >
                  <Pencil className="w-4 h-4" />
                  <span>{hasB2BData ? 'Tahrirlash (B2B)' : '+ Ma\'lumot kiritish'}</span>
                </button>

                {hasB2BData && onClearB2B && (
                  <button
                    onClick={() => {
                      if (confirm("Haqiqatan ham bu obyektning B2B ma'lumotlarini o'chirmoqchimisiz?")) {
                        onClearB2B();
                      }
                    }}
                    className="py-2.5 px-3 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors"
                    title="B2B ma'lumotlarni o'chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'custom' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800">Qo'shimcha maydonlar</h4>
              <button onClick={onEdit} className="text-blue-600 font-semibold hover:underline">
                + Tahrirlash
              </button>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-slate-600">
              <p>Tizim sozlamalari bo'limidagi barcha qo'shimcha maydonlar avtomatik ushbu obyektga bog'lanadi.</p>
              <div className="pt-2 border-t border-slate-200 text-slate-500">
                Ustuvorlik: <span className="font-semibold text-slate-800">{internal.priority || 'Belgilanmagan'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'visits' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800">Tashriflar</h4>
              <button 
                onClick={handleVisit} 
                disabled={loadingVisit}
                className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${loadingVisit ? 'animate-spin' : ''}`} />
                <span>{loadingVisit ? 'Saqlanmoqda...' : '+ Tashrif qayd etish'}</span>
              </button>
            </div>
            {internal.last_visit ? (
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{internal.visited_by || 'Field Sales'}</div>
                  <div className="text-slate-400 text-[11px]">Joyiga borib ko'rildi</div>
                </div>
                <div className="text-slate-500 text-[11px] font-mono">{internal.last_visit}</div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-400">
                Hali tashrif qayd etilmagan
              </div>
            )}
          </div>
        )}

        {activeTab === 'map' && (
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-slate-800">Haqiqiy GPS koordinatalari</h4>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono text-slate-700 space-y-1">
              <div>Kenglik (Lat): <span className="font-bold text-blue-600">{source.latitude}</span></div>
              <div>Uzunlik (Lng): <span className="font-bold text-blue-600">{source.longitude}</span></div>
              <div className="pt-2 text-[11px] text-slate-400 font-sans">
                Manba: Shaffof Qurilish davlat geolokatsiyasi
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
