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
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'custom_fields', label: "Qo'shimcha maydonlar", icon: SlidersHorizontal },
  ];

  return (
    <aside className={`${isCollapsed ? 'w-[72px]' : 'w-56'} h-full bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 shadow-xs transition-all duration-300 select-none`}>
      {/* 1. Brand Logo & Title (Aligned with Navbar h-16) */}
      <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} border-b border-slate-200 shrink-0`}>
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shadow-blue-500/20 shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        {!isCollapsed && (
          <div className="flex items-center gap-2 min-w-0">
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
      <div className="p-3 border-t border-slate-100 space-y-2 shrink-0">
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
