'use client';
import { useState } from 'react';
import { Sparkles, X, MapPin, CheckCircle2, ArrowRight, Loader2, Compass, Phone, Building2, Flame } from 'lucide-react';
import { MapObject, AIRoutePlanResult, AIRouteRecommendation } from '../../lib/types';
import { api } from '../../lib/api';

interface AIRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  objects: MapObject[];
  userLat?: number | null;
  userLng?: number | null;
  companyId?: string;
  onApplyRoute: (stops: AIRouteRecommendation[]) => void;
}

const PRESETS = [
  {
    id: 'nearest_unvisited',
    label: '⚡ Eng yaqin va borilmagan 5 ta TJM',
    prompt: 'Menga eng yaqin joylashgan, hali hech kim bormagan 5 ta istiqbolli qurilish obyekti bo\'yicha marshrut tuzib ber',
    unvisitedOnly: true,
    highPriorityOnly: false
  },
  {
    id: 'high_priority',
    label: '⭐ Yuqori ustuvorlikdagi (High Priority) TJMlar',
    prompt: 'Faqat ustuvorligi Yuqori bo\'lgan, eng yirik va muhim qurilish majmualari bo\'yicha marshrut tuzib ber',
    unvisitedOnly: false,
    highPriorityOnly: true
  },
  {
    id: 'with_phone_unvisited',
    label: '📞 Aloqa raqami bor va uchrashilmaganlar',
    prompt: 'Telefon raqami mavjud bo\'lgan, oldindan qo\'ng\'iroq qilib uchrashuv belgilash mumkin bo\'lgan eng yaxshi obyektlar',
    unvisitedOnly: true,
    highPriorityOnly: false
  },
  {
    id: 'large_complexes',
    label: '🏙 Katta masshtabli majmualar (100+ xonadon)',
    prompt: 'Ko\'p xonadonli (100 tadan ortiq) yirik qurilish loyihalari bo\'yicha eng qisqa yo\'nalish',
    unvisitedOnly: false,
    highPriorityOnly: false
  }
];

export default function AIRouteModal({
  isOpen,
  onClose,
  objects,
  userLat,
  userLng,
  companyId,
  onApplyRoute
}: AIRouteModalProps) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [maxStops, setMaxStops] = useState(5);
  const [result, setResult] = useState<AIRoutePlanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunAI = async (promptText: string, unvisitedOnly = false, highPriorityOnly = false) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getAIRoutePlan({
        companyId,
        userLat: userLat || 39.6542,
        userLng: userLng || 66.9597,
        prompt: promptText,
        unvisitedOnly,
        highPriorityOnly,
        maxStops,
        objects
      });

      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setErrorMsg(res.error || 'AI marshrut tuzishda xatolik yuz berdi');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Kutilmagan xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result && result.recommended_stops && result.recommended_stops.length > 0) {
      onApplyRoute(result.recommended_stops);
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">AI Aqlli Marshrut Maslahatchisi</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  100% Bepul
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Sotuv agentlari uchun minimal masofada maksimal sotuv natijasiga erishish
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {!result ? (
            <>
              {/* Presets Grid */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 mb-2.5">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Tezkor tayyor rejalar (1-bosishda rejalashtirish)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleRunAI(p.prompt, p.unvisitedOnly, p.highPriorityOnly)}
                      disabled={loading}
                      className="p-3 text-left rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-xs font-semibold text-slate-800 flex items-start justify-between gap-2 group cursor-pointer disabled:opacity-50"
                    >
                      <span>{p.label}</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt Box */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <Compass className="w-4 h-4 text-blue-600" />
                  <span>Yoki o'z so'rovingizni yozing</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Masalan: Registon atrofidagi eng yirik 4 ta bino..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customPrompt.trim()) {
                        handleRunAI(customPrompt);
                      }
                    }}
                    className="flex-1 px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                  <button
                    onClick={() => handleRunAI(customPrompt || 'Eng optimal va sotuv imkoniyati yuqori binolar')}
                    disabled={loading}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Tuzish</span>
                  </button>
                </div>
              </div>

              {/* Number of stops selector */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>To'xtash joylari soni:</span>
                <div className="flex items-center gap-1.5">
                  {[3, 4, 5, 7].map((num) => (
                    <button
                      key={num}
                      onClick={() => setMaxStops(num)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        maxStops === num 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {num} ta
                    </button>
                  ))}
                </div>
              </div>

              {loading && (
                <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-600">
                  <div className="w-8 h-8 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
                  <p className="text-xs font-semibold text-slate-500">
                    Sun'iy intellekt barcha obyektlarni tahlil qilib, eng qisqa marshrutni hisoblamoqda...
                  </p>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}
            </>
          ) : (
            /* Results View */
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{result.route_name}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{result.summary}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white shrink-0">
                    ~{result.estimated_duration_hours} soat
                  </span>
                </div>
              </div>

              {/* Recommended Stops List */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Tavsiya etilgan to'xtash ketma-ketligi ({result.recommended_stops.length} ta)
                </h5>

                {result.recommended_stops.map((stop) => (
                  <div
                    key={stop.source_id}
                    className="p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-300 shadow-2xs transition-all flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {stop.order}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h6 className="font-bold text-xs text-slate-900 truncate">
                          {stop.object_name}
                        </h6>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          #{stop.source_id}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-tight">
                        <span className="font-semibold text-slate-700">Nega tanlandi:</span> {stop.reason}
                      </p>
                      <div className="p-2 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-[11px] text-emerald-900 font-medium">
                        💡 <span className="font-bold">Maslahat:</span> {stop.pitch_tip}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          {result ? (
            <>
              <button
                onClick={() => setResult(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Qayta rejalashtirish
              </button>
              <button
                onClick={handleApply}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xaritada Marshrutni Chizish</span>
              </button>
            </>
          ) : (
            <div className="flex items-center justify-end w-full">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Yopish
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
