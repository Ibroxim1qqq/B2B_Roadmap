import { Building2, RefreshCw, Plus, LogOut, ChevronDown, UserCheck, ChevronRight, Map, Navigation, BarChart3, SlidersHorizontal, Shield, Bell, Sparkles, User } from 'lucide-react';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { UserProfile } from '../../lib/types';
import { useClickOutside } from '../../hooks/useClickOutside';

interface NavbarProps {
  activeTab?: string;
  onSync?: () => Promise<void>;
  syncing?: boolean;
  onOpenCreate?: () => void;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationCount?: number;
  onOpenAI?: () => void;
  onOpenProfile?: () => void;
}

const TAB_INFO: Record<string, { title: string; icon: any }> = {
  map: { title: 'Xarita', icon: Map },
  route: { title: "Yo'l-yo'lakay", icon: Navigation },
  objects: { title: 'Obyektlar', icon: Building2 },
  dashboard: { title: 'Tahlil', icon: BarChart3 },
  custom_fields: { title: 'Maydonlar', icon: SlidersHorizontal }
};

export default function Navbar({
  activeTab = 'map',
  onSync,
  syncing = false,
  onOpenCreate,
  currentUser,
  onLogout,
  onOpenNotifications,
  unreadNotificationCount = 0,
  onOpenAI,
  onOpenProfile
}: NavbarProps) {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setUserDropdownOpen(false), userDropdownOpen);

  const displayName = currentUser?.name || 'Foydalanuvchi';
  const displayRole = currentUser?.role === 'superadmin' 
    ? 'Super Admin' 
    : currentUser?.role === 'company_admin' 
    ? 'Kompaniya Admin' 
    : currentUser?.role === 'manager' 
    ? 'Menejer' 
    : (currentUser?.role || 'Foydalanuvchi');
  const displayCompany = currentUser?.company_name || 'Asosiy Kompaniya';
  const displayInitials = currentUser?.avatarInitials || (displayName.length >= 2 ? displayName.substring(0, 2).toUpperCase() : 'B2B');
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const currentTab = TAB_INFO[activeTab] || { title: 'Xarita', icon: Map };
  const CurrentIcon = currentTab.icon;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-2xs">
      {/* Active Section Title & Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile Brand */}
        <div className="flex items-center gap-2 lg:hidden shrink-0">
          <div className="w-8 h-8 rounded-xl overflow-hidden shadow-xs shadow-emerald-600/20 bg-[#1b815f] flex items-center justify-center">
            <img src="/uysot-logo.png" alt="UYSOT B2B" className="w-full h-full object-cover" />
          </div>
        </div>


        <h2 className="text-[15px] font-semibold text-slate-900 whitespace-nowrap">
          {currentTab.title}
        </h2>

        {/* Company Badge */}
        {currentUser?.company_name && (
          <span className="hidden md:inline text-xs text-slate-500 truncate max-w-[200px]">{displayCompany}</span>
        )}
      </div>

      {/* Right User & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* SuperAdmin Panel shortcut button */}
        {isSuperAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            title="SuperAdmin Boshqaruv Paneliga o'tish"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin Panel</span>
          </Link>
        )}

        {/* AI Assistant button */}
        {onOpenAI && (
          <button
            type="button"
            onClick={onOpenAI}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            title="AI Yordamchi (Sun'iy Intellekt)"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">AI Yordamchi</span>
          </button>
        )}

        {/* Add Object button */}
        {onOpenCreate && (
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#1b815f] hover:bg-[#15674c] text-white text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            title="Yangi obyekt qo'shish"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Yangi Obyekt</span>
          </button>
        )}

        {/* Notifications Bell button */}
        {onOpenNotifications && (
          <button
            onClick={onOpenNotifications}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            title="Bildirishnomalar va yangi TJM-lar"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-xs" />
            )}
          </button>
        )}

        {/* Person Icon in top right per user request: "ong taraf yuqorida faqat inson iconi tursin icon rasm emas ustiga bossa hechnima chiqmaydi hozircha" */}
        <div ref={dropdownRef} className="relative">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 select-none cursor-default"
            title={displayName}
          >
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
}


