'use client';
import { useState } from 'react';
import { Map, Navigation, Building2, BarChart3, SlidersHorizontal, Settings, User, LogOut } from 'lucide-react';
import { UserProfile } from '../../lib/types';

interface LeftSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser?: UserProfile | null;
  onOpenProfile?: () => void;
  onLogout?: () => void;
}

export default function LeftSidebar({
  activeTab,
  onTabChange,
  currentUser,
  onOpenProfile,
  onLogout
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
        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs shadow-emerald-600/20 shrink-0 flex items-center justify-center bg-[#1b815f]">
          <img src="/uysot-logo.png" alt="UYSOT B2B" className="w-full h-full object-cover" />
        </div>
        {isHovered && (
          <div className="flex items-center gap-1.5 min-w-0 animate-in fade-in duration-200">
            <span className="font-black text-slate-900 text-base tracking-tight">UYSOT</span>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-emerald-300">
              B2B
            </span>
          </div>
        )}
      </div>

      {/* 2. Navigation items */}
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
                  ? 'bg-emerald-50 text-emerald-700 shadow-xs shadow-emerald-500/10 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
              {isHovered && <span className="truncate animate-in fade-in duration-150">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* 3. Bottom User Profile Section (User-requested: Profile Icon, Name, and Settings Gear) */}
      <div className="p-2 border-t border-slate-200 shrink-0 bg-slate-50/80">
        {isHovered ? (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-100/90 transition-colors">
            {/* User Info (clickable to open profile) */}
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
              title="Profilni tahrirlash"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1b815f] flex items-center justify-center text-white shrink-0 border border-emerald-600/30 shadow-xs">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-800 truncate group-hover:text-[#1b815f] transition-colors leading-tight">
                  {currentUser?.name || 'Foydalanuvchi'}
                </div>
                <div className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                  {currentUser?.role || 'Menejer'}
                </div>
              </div>
            </button>

            {/* Settings Gear Button */}
            <button
              type="button"
              onClick={onOpenProfile}
              className="p-1.5 text-slate-400 hover:text-[#1b815f] hover:bg-white rounded-lg transition-all cursor-pointer shadow-2xs"
              title="Profil sozlamalari (Ism, Login, Parol, Rasm)"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Logout Button */}
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Haqiqatan ham tizimdan chiqmoqchimisiz?")) {
                    onLogout();
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shadow-2xs"
                title="Tizimdan chiqish"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onOpenProfile}
              className="w-10 h-10 rounded-xl overflow-hidden hover:ring-2 hover:ring-[#1b815f]/30 flex items-center justify-center transition-all cursor-pointer relative group"
              title={`Profil sozlamalari: ${currentUser?.name || 'Foydalanuvchi'}`}
            >
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1b815f] text-white flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
