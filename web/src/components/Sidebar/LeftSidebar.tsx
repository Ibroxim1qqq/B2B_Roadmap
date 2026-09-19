'use client';
import { Map, Building2, MapPin, BarChart3, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';

interface LeftSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function LeftSidebar({
  activeTab,
  onTabChange,
  isCollapsed = false,
  onToggleCollapse
}: LeftSidebarProps) {
  const menuItems = [
    { id: 'map', label: 'Xarita', icon: Map },
    { id: 'objects', label: 'Obyektlar', icon: Building2 },
    { id: 'visits', label: 'Tashriflar', icon: MapPin },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'custom_fields', label: "Qo'shimcha maydonlar", icon: SlidersHorizontal },
  ];

  return (
    <aside className={`${isCollapsed ? 'w-[72px]' : 'w-48'} bg-white border-r border-slate-200 flex flex-col shrink-0 p-3 z-20 shadow-xs transition-all duration-300 select-none`}>
      {/* Navigation items */}
      <nav className="space-y-1.5 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-600 shadow-xs shadow-blue-500/10 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse / Expand Arrow Button */}
      <div className="pt-3 border-t border-slate-100 space-y-2">
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'} rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all cursor-pointer border border-slate-200/80 shadow-2xs`}
            title={isCollapsed ? "Menyuni ochish" : "Menyuni yopish"}
          >
            {!isCollapsed && <span className="text-[11px] font-semibold text-slate-600">Yopish</span>}
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-blue-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            )}
          </button>
        )}

        {!isCollapsed && (
          <div className="px-2 text-[10px] text-slate-400 font-medium truncate text-center">
            v2.4 • Shaffof B2B
          </div>
        )}
      </div>
    </aside>
  );
}
