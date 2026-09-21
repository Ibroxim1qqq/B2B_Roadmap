'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, Users, Shield, Plus, ArrowLeft, LogOut, CheckCircle2, 
  ExternalLink, Search, RefreshCw, KeyRound, UserCheck, Eye, Layers, 
  AlertCircle, X, ChevronRight, UserPlus, Building
} from 'lucide-react';
import { getCurrentUser, logout } from '../../lib/auth';
import { api } from '../../lib/api';
import { UserProfile, Company } from '../../lib/types';

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Data states
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'companies' | 'users' | 'view_as'>('companies');

  // Modals & Forms
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // New Company form
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyStatus, setNewCompanyStatus] = useState<'active' | 'inactive'>('active');

  // New User form
  const [newUserName, setNewUserName] = useState('');
  const [newUserLogin, setNewUserLogin] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'manager' | 'company_admin' | 'superadmin'>('manager');
  const [newUserCompanyId, setNewUserCompanyId] = useState('');

  // Filters
  const [companySearch, setCompanySearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Auth Guard
  useEffect(() => {
    const user = getCurrentUser();
    setAuthChecked(true);
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'superadmin') {
      router.replace('/');
      return;
    }
    setCurrentUser(user);
    loadData();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [compRes, usersRes] = await Promise.all([
        api.getCompanies(),
        api.getUsers()
      ]);

      if (compRes && compRes.success && compRes.data) {
        setCompanies(compRes.data);
        if (compRes.data.length > 0 && !newUserCompanyId) {
          setNewUserCompanyId(compRes.data[0].company_id);
        }
      }

      if (usersRes && usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) {
      setFormError('Kompaniya nomini kiriting');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      const res = await api.createCompany(newCompanyName.trim(), newCompanyStatus);
      if (res && res.success) {
        setFormSuccess(`"${newCompanyName}" kompaniyasi muvaffaqiyatli yaratildi!`);
        setNewCompanyName('');
        setIsCompanyModalOpen(false);
        await loadData();
        setTimeout(() => setFormSuccess(null), 4000);
      } else {
        setFormError(res?.error || 'Kompaniya yaratishda xatolik');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Xatolik yuz berdi');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserLogin.trim() || !newUserPassword) {
      setFormError("Barcha maydonlarni to'ldiring");
      return;
    }
    if (!newUserCompanyId) {
      setFormError('Kompaniyani tanlang');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      const res = await api.createUser({
        company_id: newUserCompanyId,
        name: newUserName.trim(),
        login: newUserLogin.trim(),
        password: newUserPassword,
        role: newUserRole
      });

      if (res && res.success) {
        setFormSuccess(`"${newUserName}" foydalanuvchisi muvaffaqiyatli yaratildi!`);
        setNewUserName('');
        setNewUserLogin('');
        setNewUserPassword('');
        setIsUserModalOpen(false);
        await loadData();
        setTimeout(() => setFormSuccess(null), 4000);
      } else {
        setFormError(res?.error || 'Foydalanuvchi yaratishda xatolik');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Xatolik yuz berdi');
    } finally {
      setFormSubmitting(false);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.company_name.toLowerCase().includes(companySearch.toLowerCase()) ||
    c.company_id.toLowerCase().includes(companySearch.toLowerCase())
  );

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.login || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.company_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  if (!authChecked || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-3 border-amber-500 border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Boshqaruv paneli yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 bg-slate-900 text-white px-4 sm:px-8 flex items-center justify-between border-b border-slate-800 shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight leading-tight flex items-center gap-2">
              <span>B2B Samarqand</span>
              <span className="text-[10px] uppercase font-extrabold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                SuperAdmin
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 leading-tight">
              Tizim va Multi-Kompaniyalarni boshqarish markazi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Link to Map */}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xaritaga o'tish</span>
          </Link>

          {/* Sync Button */}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
            title="Ma'lumotlarni yangilash"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Yangilash</span>
          </button>

          {/* User & Logout */}
          <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-xs font-bold text-white">
              {currentUser.avatarInitials || 'SA'}
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              title="Chiqish"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Success / Error Alerts */}
        {formSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 shadow-xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold">{formSuccess}</span>
          </div>
        )}

        {/* 1. Stat Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jami Kompaniyalar</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{companies.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Foydalanuvchilar</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{users.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faol Kompaniyalar</p>
              <p className="text-2xl font-black text-emerald-600 mt-0.5">
                {companies.filter(c => c.status === 'active').length}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Baza Obyektlari</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">3,291</p>
            </div>
          </div>
        </div>

        {/* 2. Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
          <button
            onClick={() => setActiveTab('companies')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'companies'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Kompaniyalar ({companies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Foydalanuvchilar ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('view_as')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'view_as'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Kompaniya ko'rinishida xaritaga o'tish</span>
          </button>
        </div>

        {/* 3. Tab Contents */}

        {/* TAB 1: COMPANIES */}
        {activeTab === 'companies' && (
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Kompaniya nomi yoki ID bo'yicha qidiruv..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
                />
              </div>

              <button
                onClick={() => {
                  setFormError(null);
                  setIsCompanyModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Yangi Kompaniya Qo'shish</span>
              </button>
            </div>

            {/* Companies Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4 sm:px-6">Kompaniya Nomi</th>
                      <th className="py-3.5 px-4">Company ID</th>
                      <th className="py-3.5 px-4 text-center">Foydalanuvchilar</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4">Yaratilgan sana</th>
                      <th className="py-3.5 px-4 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredCompanies.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Kompaniyalar topilmadi
                        </td>
                      </tr>
                    ) : (
                      filteredCompanies.map((c) => (
                        <tr key={c.company_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-900 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <span>{c.company_name}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                            {c.company_id}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                              {c.user_count || 0} ta
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              c.status === 'active' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {c.status === 'active' ? 'Faol' : 'Faol emas'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 text-xs">
                            {c.created_at ? new Date(c.created_at).toLocaleDateString('uz-UZ') : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link
                              href={`/?company_id=${encodeURIComponent(c.company_id)}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                              title="Ushbu kompaniya xaritasiga o'tish"
                            >
                              <span>Xaritada ochish</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USERS */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ism, login yoki kompaniya bo'yicha qidiruv..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 shadow-2xs"
                />
              </div>

              <button
                onClick={() => {
                  setFormError(null);
                  setIsUserModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Yangi Foydalanuvchi Yaratish</span>
              </button>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4 sm:px-6">Foydalanuvchi</th>
                      <th className="py-3.5 px-4">Login</th>
                      <th className="py-3.5 px-4">Kompaniya</th>
                      <th className="py-3.5 px-4 text-center">Rol</th>
                      <th className="py-3.5 px-4">Yaratilgan sana</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Foydalanuvchilar topilmadi
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.user_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-900 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                              {u.name ? u.name.substring(0, 2).toUpperCase() : 'US'}
                            </div>
                            <div>
                              <span>{u.name}</span>
                              <div className="text-[10px] text-slate-400 font-normal">{u.user_id}</div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs font-bold text-blue-600">
                            @{u.login}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            <div className="flex items-center gap-1.5 font-semibold">
                              <Building className="w-3.5 h-3.5 text-slate-400" />
                              <span>{u.company_name || u.company_id}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              u.role === 'superadmin' 
                                ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                                : u.role === 'company_admin'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {u.role === 'superadmin' ? '🛡️ SuperAdmin' : u.role === 'company_admin' ? '🏢 Kompaniya Admin' : '👤 Menejer'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 text-xs">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString('uz-UZ') : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: QUICK VIEW AS COMPANY */}
        {activeTab === 'view_as' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Kompaniya ma'lumotlarini izolyatsiyalangan holda ko'rish
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">
                SuperAdmin sifatida xaritada har bir kompaniyaning faqat o'ziga tegishli CRM maydonlari (telefon raqamlar, menejerlar, tashriflar va qo'shilgan TJM-lar) bilan ishlashingiz mumkin.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {companies.map((c) => (
                <div
                  key={c.company_id}
                  className="p-5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {c.status === 'active' ? 'Faol' : 'Faol emas'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{c.company_id}</span>
                    </div>
                    <h3 className="font-black text-base text-slate-900 leading-snug">
                      {c.company_name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Hodimlar soni: <strong className="text-slate-800">{c.user_count || 0} ta</strong>
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-200/80">
                    <Link
                      href={`/?company_id=${encodeURIComponent(c.company_id)}`}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xaritani shu kompaniya sifatida ko'rish</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: YANGA KOMPANIYA QO'SHISH */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-900">Yangi Kompaniya Qo'shish</h3>
              </div>
              <button
                onClick={() => setIsCompanyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kompaniya Nomi *
                </label>
                <input
                  type="text"
                  placeholder="Masalan: Samarqand Modern Stroy MCHJ"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Status
                </label>
                <select
                  value={newCompanyStatus}
                  onChange={(e: any) => setNewCompanyStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="active">Faol (Active)</option>
                  <option value="inactive">Faol emas (Inactive)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCompanyModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {formSubmitting ? 'Saqlanmoqda...' : 'Kompaniya Yaratish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: YANGA FOYDALANUVCHI QO'SHISH */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-900">Yangi Foydalanuvchi Yaratish</h3>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl font-medium">
                  {formError}
                </div>
              )}

              {/* Company select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tegishli Kompaniya *
                </label>
                <select
                  value={newUserCompanyId}
                  onChange={(e) => setNewUserCompanyId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  required
                >
                  {companies.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.company_name} ({c.company_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Foydalanuvchi Ism-Sharifi *
                </label>
                <input
                  type="text"
                  placeholder="Masalan: Rustam Rahimov"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  required
                />
              </div>

              {/* Login */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tizim Logini *
                </label>
                <input
                  type="text"
                  placeholder="Masalan: rustam_mgr"
                  value={newUserLogin}
                  onChange={(e) => setNewUserLogin(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Parol *
                </label>
                <input
                  type="text"
                  placeholder="Kamida 6 ta belgi"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  required
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tizimdagi Rol
                </label>
                <select
                  value={newUserRole}
                  onChange={(e: any) => setNewUserRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="manager">👤 Menejer (Field Sales / CRM)</option>
                  <option value="company_admin">🏢 Kompaniya Admini</option>
                  <option value="superadmin">🛡️ SuperAdministrator</option>
                </select>
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {formSubmitting ? 'Yaratilmoqda...' : 'Foydalanuvchi Yaratish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
