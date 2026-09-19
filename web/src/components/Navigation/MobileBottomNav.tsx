'use client';
import { Map, Building2, MapPin, BarChart3, SlidersHorizontal } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const items = [
    { id: 'map', label: 'Xarita', icon: Map },
    { id: 'objects', label: 'Obyektlar', icon: Building2 },
    { id: 'dashboard', label: 'Tahlil', icon: BarChart3 },
    { id: 'custom_fields', label: 'Sozlama', icon: SlidersHorizontal },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] px-1 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 min-w-0 flex-1 transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : 'text-slate-400 active:text-slate-600'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className={`text-[10px] mt-0.5 truncate ${isActive ? 'font-bold text-blue-600' : 'font-medium text-slate-400'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-blue-600 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
