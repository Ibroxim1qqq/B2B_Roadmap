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
}

const TAB_INFO: Record<string, { title: string; icon: any }> = {
  map: { title: 'Xarita', icon: Map },
  route: { title: "Yo'l-yo'lakay", icon: Navigation },
  objects: { title: 'Obyektlar', icon: Building2 },
  dashboard: { title: 'Dashboard', icon: BarChart3 },
  custom_fields: { title: "Qo'shimcha maydonlar", icon: SlidersHorizontal }
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
  onOpenAI
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
          <span className="font-black text-slate-900 text-sm tracking-tight">UYSOT B2B</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        </div>


        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 shrink-0">
            <CurrentIcon className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              {currentTab.title}
            </h2>
          </div>
        </div>

        {/* Company Badge */}
        {currentUser?.company_name && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span className="truncate max-w-[160px]">{displayCompany}</span>
          </div>
        )}
      </div>

      {/* Right User & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* SuperAdmin Panel shortcut button */}
        {isSuperAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs shadow-amber-500/20 transition-all cursor-pointer"
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs shadow-indigo-500/20 transition-all cursor-pointer active:scale-95"
            title="AI Yordamchi (Sun'iy Intellekt)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">AI Yordamchi</span>
          </button>
        )}

        {/* Add Object button */}
        {onOpenCreate && (
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
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
            className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition-all cursor-pointer"
            title="Bildirishnomalar va yangi TJM-lar"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-xs" />
            )}
          </button>
        )}

        {/* Person Icon Only (User-requested: only person icon, not letters, not photo, clicking does nothing for now) */}
        <div ref={dropdownRef} className="relative pl-1 sm:pl-2 border-l border-slate-200">
          <div 
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200 shadow-2xs select-none cursor-default"
            title={displayName}
          >
            <User className="w-4 h-4 text-slate-600" />
          </div>

          {/* Dormant dropdown closure handler retained for lifecycle integrity */}
          {userDropdownOpen && (
            <div className="hidden" aria-hidden="true">
              <button type="button" onClick={() => setUserDropdownOpen(false)}>Yopish</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


