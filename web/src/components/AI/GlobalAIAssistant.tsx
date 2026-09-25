'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Sparkles, Bot, Send, X, Trash2, Phone, MapPin, Compass, 
  Navigation, Building2, User, ExternalLink, ChevronRight, 
  Layers, ArrowRight, MessageSquare, CheckCircle2, Flame
} from 'lucide-react';
import { api, isUysotCompany } from '../../lib/api';
import { MapObject, AIChatMessage, AIChatAction, AIRouteRecommendation } from '../../lib/types';

interface GlobalAIAssistantProps {
  objects: MapObject[];
  userLat?: number | null;
  userLng?: number | null;
  companyId?: string;
  onViewOnMap?: (sourceId: string) => void;
  onApplyRoute?: (stops: AIRouteRecommendation[]) => void;
  onApplyFilter?: (filter: { district?: string; search?: string; status?: string }) => void;
}

const QUICK_PROMPTS = [
  { label: '⚡ Eng yaqin 5 ta bino', text: 'Menga eng yaqin joylashgan 5 ta qurilish obyektini topib ber' },
  { label: '🚗 Bugungi sotuv marshruti', text: 'Bugun borish uchun eng optimal 5 ta bino bo\'yicha marshrut tuzib ber' },
  { label: '📞 Telefon raqami borlar', text: 'Telefon raqami mavjud bo\'lgan binolar ro\'yxatini chiqar' },
  { label: '👤 Mas\'ul rahbari borlar', text: 'Mas\'ul rahbari yoki direktori kiritilgan obyektlarni ko\'rsat' },
  { label: '📊 Tizim statistikasi', text: 'Bazada jami nechta bino bor va statistika qanday?' },
  { label: '⭐ Yuqori ustuvorlikdagilar', text: 'Ustuvorligi yuqori (High Priority) bo\'lgan eng muhim binolar qaysilar?' }
];

export default function GlobalAIAssistant({
  objects,
  userLat,
  userLng,
  companyId,
  onViewOnMap,
  onApplyRoute,
  onApplyFilter
}: GlobalAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUnreadPulse, setHasUnreadPulse] = useState(true);

  const isUysot = isUysotCompany(companyId);
  const companyTitle = isUysot ? 'UYSOT.UZ Toshkent' : 'Samarqand DSHK';
  const objectCount = objects.length > 0 ? objects.length : (isUysot ? 524 : 3291);

  // Initial welcome message
  const initialGreeting: AIChatMessage = useMemo(() => ({
    id: 'welcome',
    sender: 'assistant',
    timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    text: `Assalomu alaykum! Men **${companyTitle}** tizimining sun'iy intellekt yordamchisiman.\n\n` +
      `Sizga **${objectCount.toLocaleString()} ta** bino bo'yicha ma'lumot topish, telefon raqamlari, mas'ul rahbarlar, filtrlash va avtomobil marshrutlarini tuzishda yordam beraman.\n\n` +
      `Menga xohlagan savolingizni yozishingiz yoki quyidagi tezkor tugmalardan foydalanishingiz mumkin!`
  }), [companyTitle, objectCount]);

  const [messages, setMessages] = useState<AIChatMessage[]>([initialGreeting]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnreadPulse(false);
    }
  }, [isOpen, messages]);

  // Handle Send Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: AIChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await api.askAIChat({
        message: text,
        companyId,
        userLat,
        userLng,
        objects
      });

      if (res.success && res.data) {
        const aiMsg: AIChatMessage = {
          id: `ai_${Date.now()}`,
          sender: 'assistant',
          text: res.data.text || 'Ma\'lumot topildi.',
          timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
          suggested_objects: res.data.suggested_objects,
          route_stops: res.data.route_stops,
          actions: res.data.actions
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        const errorMsg: AIChatMessage = {
          id: `ai_${Date.now()}`,
          sender: 'assistant',
          text: res.error || 'Kechirasiz, so\'rovni tahlil qilishda xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.',
          timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (e: any) {
      const errorMsg: AIChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: 'Aloqa xatosi: ' + (e.message || 'Serverga ulanib bo\'lmadi'),
        timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([initialGreeting]);
  };

  return (
    <>
      {/* 1. Global Floating Circular AI Button (FAB) */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[990] flex items-center gap-2 select-none">
        {/* Helper tooltip on initial load */}
        {hasUnreadPulse && !isOpen && (
          <div 
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 text-white text-xs font-semibold rounded-2xl shadow-xl border border-slate-700/60 cursor-pointer animate-bounce hover:bg-slate-900 transition-all backdrop-blur-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>AI Copilot yordami</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-13 h-13 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 cursor-pointer active:scale-90 ${
            isOpen 
              ? 'bg-slate-800 hover:bg-slate-900 rotate-90 scale-95 shadow-slate-900/40' 
              : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 hover:shadow-indigo-500/50 hover:scale-105 shadow-blue-600/30'
          }`}
          title="B2B AI Copilot (Sun'iy Intellekt)"
        >
          {/* Subtle outer pulsing ring */}
          {!isOpen && (
            <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-30 animate-ping pointer-events-none" />
          )}

          {isOpen ? (
            <X className="w-6 h-6 text-white transition-transform" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full"></span>
            </div>
          )}
        </button>
      </div>

      {/* 2. Interactive AI Copilot Chat Drawer / Window */}
      {isOpen && (
        <div 
          className="fixed bottom-24 right-3 left-3 sm:left-auto sm:right-6 sm:w-[420px] md:w-[450px] h-[580px] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col z-[1000] overflow-hidden animate-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 p-0.5 shadow-xs flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-white tracking-tight">B2B AI Copilot</h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Onlayn
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 flex items-center gap-1 font-medium truncate max-w-[230px]">
                  <span>🏢 {companyTitle}</span>
                  <span>•</span>
                  <span>{objectCount.toLocaleString()} ta bino</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Tarixni tozalash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Yopish"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {QUICK_PROMPTS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                disabled={loading}
                onClick={() => handleSendMessage(q.text)}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 hover:text-blue-700 whitespace-nowrap transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0 disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-100/50">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5 animate-in fade-in duration-150`}
                >
                  <div
                    className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs shadow-xs'
                    }`}
                  >
                    {/* Message Text with simple bold/markdown rendering */}
                    <div className="whitespace-pre-wrap font-sans">
                      {msg.text.split('\n').map((line, i) => (
                        <p key={i} className={line === '' ? 'h-2' : ''}>
                          {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>;
                            }
                            return part;
                          })}
                        </p>
                      ))}
                    </div>

                    {/* Interactive Suggested Objects Cards */}
                    {msg.suggested_objects && msg.suggested_objects.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Tavsiya etilgan binolar ({msg.suggested_objects.length}):
                        </div>
                        {msg.suggested_objects.map((obj, i) => (
                          <div 
                            key={i}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 hover:border-blue-300 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <span className="font-bold text-slate-900 text-xs line-clamp-1">
                                {i + 1}. {obj.object_name}
                              </span>
                              <span className="text-[10px] text-blue-600 font-semibold shrink-0 bg-blue-50 px-1.5 py-0.5 rounded">
                                {obj.district_name}
                              </span>
                            </div>

                            {/* Details row: Floors, Builder */}
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                              <span>Qavat: <b>{obj.floors || '—'}</b></span>
                              <span>•</span>
                              <span>Xonadon: <b>{obj.apartment_count || '0'}</b></span>
                              {obj.builder && obj.builder !== '—' && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[120px]">{obj.builder}</span>
                                </>
                              )}
                            </div>

                            {/* Manager & Phone row */}
                            {(obj.phone || obj.manager_name) && (
                              <div className="flex items-center gap-2 text-[10px] text-slate-600 pt-0.5">
                                {obj.manager_name && (
                                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                                    <User className="w-3 h-3 text-slate-400" />
                                    {obj.manager_name}
                                  </span>
                                )}
                                {obj.phone && (
                                  <a 
                                    href={`tel:${obj.phone}`} 
                                    className="flex items-center gap-1 font-bold text-emerald-600 hover:underline ml-auto"
                                  >
                                    <Phone className="w-3 h-3" />
                                    <span>{obj.phone}</span>
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Quick Action buttons */}
                            <div className="flex items-center gap-1.5 pt-1">
                              {onViewOnMap && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onViewOnMap(obj.source_id);
                                  }}
                                  className="flex-1 py-1 px-2 bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                                >
                                  <MapPin className="w-3 h-3 text-blue-500" />
                                  <span>Xaritada ochish</span>
                                </button>
                              )}
                              {onApplyRoute && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onApplyRoute([{
                                      source_id: obj.source_id,
                                      order: 1,
                                      object_name: obj.object_name,
                                      reason: 'Tanlangan manzil',
                                      pitch_tip: 'B2B Uchrashuv',
                                      latitude: obj.latitude,
                                      longitude: obj.longitude
                                    }]);
                                  }}
                                  className="flex-1 py-1 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                                >
                                  <Navigation className="w-3 h-3" />
                                  <span>Marshrutga</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Interactive Action Buttons */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                        {msg.actions.map((act, aIdx) => (
                          <button
                            key={aIdx}
                            type="button"
                            onClick={() => {
                              if (act.type === 'apply_route' && act.route_stops && onApplyRoute) {
                                onApplyRoute(act.route_stops);
                              } else if (act.type === 'apply_filter' && act.filter && onApplyFilter) {
                                onApplyFilter(act.filter);
                              } else if (act.type === 'view_object' && act.source_id && onViewOnMap) {
                                onViewOnMap(act.source_id);
                              }
                            }}
                            className="w-full py-2 px-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                          >
                            <span>{act.label}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className="text-[9px] text-slate-400 px-1 font-medium">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl rounded-bl-xs text-xs text-slate-500 shadow-xs max-w-[200px] animate-pulse">
                <Bot className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="font-semibold">Baza tahlil qilinmoqda...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-slate-100 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Savol yoki tuman nomini yozing..."
                disabled={loading}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
