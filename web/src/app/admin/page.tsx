'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Map, RefreshCw } from 'lucide-react';
import { clearStoredUser, logout, setCurrentUser as saveCurrentUser } from '../../lib/auth';
import { api } from '../../lib/api';
import { UserProfile } from '../../lib/types';
import {
  AuditTab, CompaniesTab, FieldsTab, NotificationsTab, ObjectsTab, RoutesTab, UsersTab
} from '../../components/Admin/AdminTabs';

const TABS = [
  { id: 'companies', label: 'Kompaniyalar', component: CompaniesTab },
  { id: 'users', label: 'Foydalanuvchilar', component: UsersTab },
  { id: 'objects', label: 'Obyektlar', component: ObjectsTab },
  { id: 'routes', label: 'Marshrutlar', component: RoutesTab },
  { id: 'notifications', label: 'Bildirishnomalar', component: NotificationsTab },
  { id: 'fields', label: 'Maydonlar', component: FieldsTab },
  { id: 'audit', label: 'Jurnal', component: AuditTab }
] as const;

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('companies');
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);
  const [syncing, setSyncing] = useState<'dshk' | 'domtut' | null>(null);

  // The server session decides access; the stored profile is only a display cache.
  useEffect(() => {
    api.getSessionUser().then(user => {
      if (!user) {
        if (user === null) clearStoredUser();
        router.replace('/login');
        return;
      }
      saveCurrentUser(user);
      if (user.role !== 'superadmin') {
        router.replace('/');
        return;
      }
      setCurrentUser(user);
    });
  }, [router]);

  const notify = useCallback((message: string, isError: boolean = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), isError ? 6000 : 3000);
  }, []);

  const runSync = async (kind: 'dshk' | 'domtut') => {
    const question = kind === 'dshk'
      ? "O'zbekiston bo'ylab DSHK obyektlari yangilansinmi?"
      : 'Domtut (Toshkent) obyektlari skanerlansinmi?';
    if (!window.confirm(question)) return;
    setSyncing(kind);
    try {
      const res = kind === 'dshk' ? await api.triggerWeeklySync() : await api.triggerDomtutSync(100);
      notify(res.success ? res.message || 'Ishga tushirildi' : res.error || "Ishga tushirib bo'lmadi", !res.success);
    } finally {
      setSyncing(null);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-500">Yuklanmoqda...</p>
      </div>
    );
  }

  const ActiveTab = TABS.find(t => t.id === activeTab)!.component;
  const ghost = 'h-9 px-3 rounded-lg text-xs text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-14 flex items-center justify-between gap-3">
            <h1 className="text-[15px] font-semibold text-slate-900 whitespace-nowrap">Boshqaruv</h1>
            <div className="flex items-center overflow-x-auto no-scrollbar">
              <button type="button" disabled={syncing !== null} onClick={() => runSync('dshk')} title="DSHK sinxronizatsiyasi" className={ghost}>
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">DSHK</span>
              </button>
              <button type="button" disabled={syncing !== null} onClick={() => runSync('domtut')} title="Domtut sinxronizatsiyasi" className={ghost}>
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Domtut</span>
              </button>
              <Link href="/" className={ghost}>
                <Map className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xarita</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.replace('/login');
                }}
                title="Chiqish"
                className={ghost}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <nav className="flex gap-5 overflow-x-auto no-scrollbar text-[13px]">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2.5 border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
                  activeTab === tab.id ? 'border-[#1b815f] text-slate-900 font-medium' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <ActiveTab notify={notify} currentUserId={currentUser.user_id || currentUser.id} />
      </main>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[3000] max-w-[calc(100%-2rem)] px-4 py-2.5 rounded-lg shadow-lg text-[13px] text-white ${
            toast.isError ? 'bg-rose-600' : 'bg-slate-900'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
