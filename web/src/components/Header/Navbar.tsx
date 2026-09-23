import { Building2, RefreshCw, Plus, LogOut, ChevronDown, UserCheck, ChevronRight, Map, Navigation, BarChart3, SlidersHorizontal, Shield, Bell } from 'lucide-react';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { UserProfile } from '../../lib/types';
import { useClickOutside } from '../../hooks/useClickOutside';

interface NavbarProps {
  activeTab?: string;
  onSync: () => Promise<void>;
  syncing?: boolean;
  onOpenCreate?: () => void;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationCount?: number;
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
  unreadNotificationCount = 0
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
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shadow-blue-500/20">
            <Building2 className="w-4 h-4" />
          </div>
          <span className="font-black text-slate-900 text-sm tracking-wider">B2B MAP</span>
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

        {/* Sync with central database button */}
        <button
          onClick={onSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          title="Baza bilan yangilash"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{syncing ? 'Sinxronlanmoqda...' : 'Sinxronlash'}</span>
        </button>

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

        {/* User Pill with Dropdown */}
        <div ref={dropdownRef} className="relative pl-1 sm:pl-2 border-l border-slate-200">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-left"
          >
            <div className={`w-9 h-9 rounded-full ${isSuperAdmin ? 'bg-amber-600' : 'bg-slate-800'} text-white font-semibold text-xs flex items-center justify-center shadow-xs`}>
              {displayInitials}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-slate-800 leading-tight flex items-center gap-1">
                <span>{displayName}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
              <div className="text-[11px] text-slate-400 leading-tight">{displayRole}</div>
            </div>
          </button>

          {/* User Dropdown Menu */}
          {userDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className={`w-11 h-11 rounded-xl ${isSuperAdmin ? 'bg-amber-600' : 'bg-blue-600'} text-white font-bold text-sm flex items-center justify-center shadow-sm`}>
                  {displayInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-xs truncate flex items-center gap-1">
                    <span>{displayName}</span>
                    <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  </div>
                  <div className="text-[11px] text-blue-600 font-semibold truncate">{displayRole}</div>
                  <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{displayCompany}</span>
                  </div>
                  {currentUser?.login && (
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">Login: @{currentUser.login}</div>
                  )}
                </div>
              </div>

              {isSuperAdmin && (
                <div className="pt-2 pb-1 border-b border-slate-100">
                  <Link
                    href="/admin"
                    onClick={() => setUserDropdownOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    <span>Admin Panelga o'tish</span>
                  </Link>
                </div>
              )}

              {onLogout && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Tizimdan chiqish</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


