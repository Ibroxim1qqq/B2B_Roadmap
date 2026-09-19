'use client';
import { useState } from 'react';
import { Map, Navigation, Building2, BarChart3, SlidersHorizontal } from 'lucide-react';

interface LeftSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function LeftSidebar({
  activeTab,
  onTabChange
}: LeftSidebarProps) {
  const [isHovered, setIsHovered] = useState(false);

  const menuItems = [
    { id: 'map', label: 'Xarita', icon: Map },
    { id: 'route', label: "Yo'l-yo'lakay", icon: Navigation },
    { id: 'objects', label: 'Obyektlar', icon: Building2 },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'custom_fields', label: "Qo'shimcha maydonlar", icon: SlidersHorizontal },
  ];

  return (
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`${isHovered ? 'w-56' : 'w-[72px]'} h-full bg-white border-r border-slate-200 flex flex-col shrink-0 z-40 shadow-xs transition-all duration-300 select-none overflow-hidden`}
    >
      {/* 1. Brand Logo & Title (Aligned with Navbar h-16) */}
      <div className={`h-16 flex items-center ${isHovered ? 'gap-3 px-4' : 'justify-center px-2'} border-b border-slate-200 shrink-0 transition-all duration-200`}>
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shadow-blue-500/20 shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        {isHovered && (
          <div className="flex items-center gap-2 min-w-0 animate-in fade-in duration-200">
            <span className="font-black text-slate-900 text-lg tracking-wider">B2B</span>
            <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-blue-200">
              CRM
            </span>
          </div>
        )}
      </div>

      {/* Navigation items */}
      <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={!isHovered ? item.label : undefined}
              className={`w-full flex items-center ${isHovered ? 'gap-3 px-3.5 py-2.5' : 'justify-center px-2 py-3'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-600 shadow-xs shadow-blue-500/10 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
              {isHovered && <span className="truncate animate-in fade-in duration-150">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom version indicator */}
      {isHovered && (
        <div className="p-3 border-t border-slate-100 shrink-0 animate-in fade-in duration-150 text-center">
          <div className="text-[10px] text-slate-400 font-medium truncate">
            v2.4 • Shaffof B2B
          </div>
        </div>
      )}
    </aside>
  );
}
