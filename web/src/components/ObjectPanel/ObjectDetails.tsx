'use client';
import { useState } from 'react';
import { ObjectDetail } from '../../lib/types';
import { 
  X, MapPin, Building, HardHat, Layers, Calendar, 
  ExternalLink, FileText, Phone, User, Send, Globe, 
  Clock, CheckCircle2, Navigation, Pencil, Trash2, ShieldCheck, Tag
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

  const isVisited = Boolean(internal.last_visit);

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
      {/* 1. Top Header */}
      <div className="p-5 border-b border-slate-100 bg-white relative shrink-0">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          title="Yopish"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3.5 pr-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
            <Building className="w-7 h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-slate-900 line-clamp-2">
              {internal.tjm_name ? internal.tjm_name : source.object_name}
            </h2>

            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {source.status || 'Qurilish jarayonida'}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {source.district_name || 'Samarqand'}
              </span>
              {distText !== '—' && (
                <span className="flex items-center gap-1 font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-[10px]">
                  <MapPin className="w-3 h-3 text-blue-500" />
                  {distText}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
              <span>ID: {source.source_id}</span>
              {internal.priority && (
                <>
                  <span>•</span>
                  <span className="text-indigo-600 font-semibold flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {internal.priority}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        
        {/* Tashrif & Holat Status Card */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className={`p-3 rounded-2xl border ${isVisited ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              <Clock className={`w-3.5 h-3.5 ${isVisited ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Tashrif holati</span>
            </div>
            <p className="text-xs font-semibold mt-1">
              {isVisited ? 'Tashrif buyurilgan' : 'Tashrif qilinmagan'}
            </p>
            {isVisited && internal.last_visit && (
              <p className="text-[10px] text-emerald-700 mt-0.5 font-medium leading-tight">
                {internal.last_visit}
              </p>
            )}
            {isVisited && internal.visited_by && (
              <p className="text-[10px] text-emerald-600 mt-0.5">
                Xodim: {internal.visited_by}
              </p>
            )}
          </div>

          <div className={`p-3 rounded-2xl border ${hasB2BData ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              <CheckCircle2 className={`w-3.5 h-3.5 ${hasB2BData ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>Ma'lumotlar</span>
            </div>
            <p className="text-xs font-semibold mt-1">
              {hasB2BData ? 'To\'ldirilgan' : 'Kiritilmagan'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {hasB2BData ? 'B2B CRM ma\'lumotlari mavjud' : 'Tahrirlash orqali to\'ldiring'}
            </p>
          </div>
        </div>

        {/* 1. Qo'shimcha ma'lumotlar (B2B CRM) */}
        <div className={`border rounded-2xl p-4 transition-all ${
          hasB2BData 
            ? 'bg-emerald-50/30 border-emerald-200' 
            : 'bg-slate-50/50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/60">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Qo'shimcha ma'lumotlar</span>
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
              <span className="font-bold text-slate-900 text-right">
                {internal.tjm_name || <span className="text-slate-400 font-normal italic">Kiritilmagan</span>}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-400 shrink-0">Telefon:</span>
              {internal.phone ? (
                <a 
                  href={getCallUrl(internal.phone)} 
                  className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
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
              <span className="font-bold text-slate-900 text-right">
                {internal.manager_name || <span className="text-slate-400 font-normal italic">Kiritilmagan</span>}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-400 shrink-0">Rahbar telefoni:</span>
              {internal.manager_phone ? (
                <a 
                  href={getCallUrl(internal.manager_phone)} 
                  className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
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
                  className="font-semibold text-pink-600 hover:underline flex items-center gap-1 truncate max-w-[180px]"
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

            {/* User defined custom fields */}
            {(() => {
              const standardKeys = [
                'tjm_name', 'phone', 'sales_office', 'manager_name', 
                'manager_phone', 'telegram', 'instagram', 'priority', 'notes',
                'last_visit', 'visited_by', 'visit_lat_lng'
              ];
              const extraEntries = Object.entries(internal).filter(([k, v]) => !standardKeys.includes(k) && Boolean(v));
              if (extraEntries.length === 0) return null;

              return (
                <div className="pt-2 mt-2 border-t border-slate-200/60 space-y-2">
                  {extraEntries.map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-3">
                      <span className="text-slate-400 shrink-0 capitalize">{k.replace(/_/g, ' ')}:</span>
                      <span className="font-semibold text-slate-800 text-right">{v}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        {/* 2. Manba ma'lumotlari (Shaffof Qurilish) */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/60">
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
                className="font-semibold text-blue-600 hover:underline truncate max-w-[180px]"
              >
                Shaffof Qurilish #{source.source_id}
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Action Buttons Footer */}
      <div className="p-4 border-t border-slate-200 bg-white space-y-2.5 shrink-0">
        {/* Quick Contact & Navigation Bar */}
        <div className="grid grid-cols-4 gap-2">
          <a
            href={getNavigationUrl(source.latitude, source.longitude)}
            target="_blank"
            rel="noreferrer"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 px-1.5 flex flex-col items-center justify-center gap-1 text-[11px] font-bold shadow-xs transition-colors"
          >
            <Navigation className="w-4 h-4" />
            <span>Xarita</span>
          </a>

          {internal.phone ? (
            <a
              href={getCallUrl(internal.phone)}
              className="border border-emerald-300 hover:bg-emerald-50 text-emerald-700 rounded-xl py-2 px-1.5 flex flex-col items-center justify-center gap-1 text-[11px] font-bold bg-emerald-50/50 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>Qo'ng'iroq</span>
            </a>
          ) : (
            <div className="border border-slate-200 text-slate-300 rounded-xl py-2 px-1.5 flex flex-col items-center justify-center gap-1 text-[11px] font-medium bg-slate-50 cursor-not-allowed">
              <Phone className="w-4 h-4" />
              <span>Qo'ng'iroq</span>
            </div>
          )}

          {internal.telegram ? (
            <a
              href={getTelegramUrl(internal.telegram)}
              target="_blank"
              rel="noreferrer"
              className="border border-sky-300 hover:bg-sky-50 text-sky-600 rounded-xl py-2 px-1.5 flex flex-col items-center justify-center gap-1 text-[11px] font-bold bg-sky-50/50 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Telegram</span>
            </a>
          ) : (
            <div className="border border-slate-200 text-slate-300 rounded-xl py-2 px-1.5 flex flex-col items-center justify-center gap-1 text-[11px] font-medium bg-slate-50 cursor-not-allowed">
              <Send className="w-4 h-4" />
              <span>Telegram</span>
            </div>
          )}

          <button
            onClick={handleVisit}
            disabled={loadingVisit}
            className={`rounded-xl py-2 px-1.5 flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50 ${
              visitRecorded 
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${loadingVisit ? 'animate-spin' : ''}`} />
            <span>{loadingVisit ? '...' : visitRecorded ? 'Saqlandi' : 'Tashrif'}</span>
          </button>
        </div>

        {/* Primary CRUD Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>{hasB2BData ? 'Tahrirlash' : '+ Ma\'lumot kiritish'}</span>
          </button>

          {hasB2BData && onClearB2B && (
            <button
              onClick={() => {
                if (confirm("Haqiqatan ham bu obyektning B2B ma'lumotlarini o'chirmoqchimisiz?")) {
                  onClearB2B();
                }
              }}
              className="py-2.5 px-3 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
              title="B2B ma'lumotlarni tozalash"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
