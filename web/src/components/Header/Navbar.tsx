'use client';
import { Building2, Search, RefreshCw, X, Plus, LogOut, ChevronDown, UserCheck } from 'lucide-react';
import { useState, useRef } from 'react';
import { UserProfile } from '../../lib/types';
import { useClickOutside } from '../../hooks/useClickOutside';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSync: () => Promise<void>;
  syncing?: boolean;
  onOpenCreate?: () => void;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
}

export default function Navbar({
  searchQuery,
  onSearchChange,
  onSync,
  syncing = false,
  onOpenCreate,
  currentUser,
  onLogout
}: NavbarProps) {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setUserDropdownOpen(false), userDropdownOpen);

  const displayName = currentUser?.name || 'Ibroxim T.';
  const displayRole = currentUser?.role || 'Field Sales';
  const displayInitials = currentUser?.avatarInitials || 'IT';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-5 flex items-center justify-between shrink-0 z-30 shadow-xs">
      {/* Brand / Logo (Visible on mobile, on desktop it is cleanly inside LeftSidebar) */}
      <div className="flex items-center gap-2.5 lg:hidden shrink-0">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shadow-blue-500/20">
          <Building2 className="w-5 h-5" />
        </div>
        <span className="font-black text-slate-900 text-base tracking-wider">B2B</span>
      </div>

      {/* Central Search Bar */}
      <div className="flex-1 max-w-2xl px-6">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Obyekt nomi, TJM, manzil, developer, telefon..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 rounded-full pl-11 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right User & Actions */}
      <div className="flex items-center gap-3">
        {/* Add Object button */}
        {onOpenCreate && (
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
          title="Baza bilan yangilash"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Sinxronlanmoqda...' : 'Sinxronlash'}</span>
        </button>

        {/* User Pill with Dropdown */}
        <div ref={dropdownRef} className="relative pl-2 border-l border-slate-200">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-left"
          >
            <div className="w-9 h-9 rounded-full bg-slate-800 text-white font-semibold text-xs flex items-center justify-center shadow-xs">
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
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                  {displayInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-xs truncate flex items-center gap-1">
                    <span>{displayName}</span>
                    <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  </div>
                  <div className="text-[11px] text-blue-600 font-medium truncate">{displayRole}</div>
                  {currentUser?.phone && (
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{currentUser.phone}</div>
                  )}
                </div>
              </div>

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
                    <span>Foydalanuvchini almashtirish / Chiqish</span>
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

