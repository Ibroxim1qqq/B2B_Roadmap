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
  isOpen?: boolean;
  onClose?: () => void;
}

const INITIAL_PROMPTS = [
  { 
    label: "🏢 Shayxontohurda 16 qavatli, 2027-yil bitadigan binolar", 
    text: "Shayxontohurda xonadonlar soni 300 tadan ko'p 16 qavatli 2027 yil bitadigan binolar" 
  },
  { 
    label: "📍 Menga eng yaqin 5 ta qurilish obyekti", 
    text: "Menga eng yaqin 5 ta qurilish obyektini ko'rsat" 
  },
  { 
    label: "📞 Telefon raqami bor, to'ldirilmagan binolar", 
    text: "Telefon raqami bor to'ldirilmagan binolarni topib ber" 
  }
];

export default function GlobalAIAssistant({
  objects,
  userLat,
  userLng,
  companyId,
  onViewOnMap,
  onApplyRoute,
  onApplyFilter,
  isOpen: propIsOpen,
  onClose
}: GlobalAIAssistantProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalOpen;
  const setIsOpen = (val: boolean) => {
    setInternalOpen(val);
    if (!val && onClose) onClose();
  };

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Initial welcome message (User-requested clean minimalist greeting)
  const initialGreeting: AIChatMessage = useMemo(() => ({
    id: 'welcome',
    sender: 'assistant',
    timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    text: "Assalomu alaykum! Qanday yordam bera olaman?"
  }), []);

  const [messages, setMessages] = useState<AIChatMessage[]>([initialGreeting]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
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
        userLat: userLat || undefined,
        userLng: userLng || undefined,
        objects: objects || []
      });

      if (res.success && res.data) {
        const aiMsg: AIChatMessage = {
          id: `ai_${Date.now()}`,
          sender: 'assistant',
          text: res.data.text || "Ma'lumot topildi.",
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
          text: res.error || "Kechirasiz, so'rovni tahlil qilishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
          timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (e: any) {
      const errorMsg: AIChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: 'Aloqa xatosi: ' + (e.message || "Serverga ulanib bo'lmadi"),
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

  if (!isOpen) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[420px] md:w-[460px] h-[600px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col z-[1000] overflow-hidden animate-in zoom-in-95 duration-200"
    >
      {/* Minimalist Clean Header */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1b815f] to-teal-700 flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight leading-none">AI Yordamchi</h3>
            <span className="text-[10px] text-emerald-400 font-medium">● Faol</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleClearHistory}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Tarixni tozalash"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Yopish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5 animate-in fade-in duration-150`}
            >
              <div
                className={`max-w-[90%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  isUser
                    ? 'bg-[#1b815f] text-white rounded-br-xs shadow-xs'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs shadow-xs'
                }`}
              >
                {/* Text lines */}
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

                {/* 3 Quick Questions under initial welcome greeting */}
                {msg.id === 'welcome' && (
                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400">Tavsiya etiladigan savollar:</span>
                    {INITIAL_PROMPTS.map((p, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        disabled={loading}
                        onClick={() => handleSendMessage(p.text)}
                        className="text-left p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-200 text-xs font-medium text-slate-700 hover:text-emerald-700 transition-all cursor-pointer shadow-2xs"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Suggested Objects Cards */}
                {msg.suggested_objects && msg.suggested_objects.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Topilgan binolar ({msg.suggested_objects.length}):
                    </div>
                    {msg.suggested_objects.map((obj, i) => (
                      <div 
                        key={i}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="font-bold text-slate-900 text-xs line-clamp-1">
                            {i + 1}. {obj.object_name}
                          </span>
                          <span className="text-[10px] text-[#1b815f] font-semibold shrink-0 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {obj.district_name}
                          </span>
                        </div>

                        {/* Details row: Floors, Apts, Builder */}
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium flex-wrap">
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
                              className="flex-1 py-1 px-2 bg-white hover:bg-emerald-50 text-[#1b815f] hover:text-emerald-700 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                            >
                              <MapPin className="w-3 h-3 text-emerald-600" />
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
                              className="flex-1 py-1 px-2 bg-[#1b815f] hover:bg-[#15674c] text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
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
                        className="w-full py-2 px-3 bg-gradient-to-r from-[#1b815f] via-teal-600 to-purple-600 hover:from-[#15674c] hover:to-teal-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
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
            <Bot className="w-4 h-4 text-[#1b815f] animate-spin" />
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
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:bg-white focus:border-[#1b815f] focus:ring-2 focus:ring-emerald-500/10 transition-all font-medium"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="w-10 h-10 rounded-2xl bg-[#1b815f] hover:bg-[#15674c] disabled:bg-slate-200 text-white flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
