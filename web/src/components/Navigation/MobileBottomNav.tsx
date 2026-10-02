'use client';
import { Map, Navigation, Building2, BarChart3, SlidersHorizontal } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const items = [
    { id: 'map', label: 'Xarita', icon: Map },
    { id: 'route', label: "Yo'nalish", icon: Navigation },
    { id: 'objects', label: 'Obyektlar', icon: Building2 },
    { id: 'dashboard', label: 'Tahlil', icon: BarChart3 },
    { id: 'custom_fields', label: 'Sozlama', icon: SlidersHorizontal },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-1.5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-1 min-w-0 flex-1 transition-all rounded-2xl active:scale-90 cursor-pointer ${
                isActive
                  ? 'text-blue-600'
                  : 'text-slate-400 hover:text-slate-600 active:text-slate-700'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-blue-100/70 text-blue-600' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600 stroke-[2.5]' : 'text-slate-400'}`} />
              </div>
              <span className={`text-[10px] mt-0.5 truncate leading-tight ${isActive ? 'font-black text-blue-600' : 'font-semibold text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
