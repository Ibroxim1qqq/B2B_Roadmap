'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { validateCredentials, setCurrentUser, getCurrentUser } from '../../lib/auth';
import { api } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to appropriate page
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      if (user.role === 'superadmin') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!login.trim()) {
      setError('Login kiriting');
      return;
    }
    if (!password) {
      setError('Parol kiriting');
      return;
    }

    setLoading(true);
    try {
      // 1. Authenticate with Google Sheets / API
      const res = await api.login(login.trim(), password);
      if (res && res.success && res.user) {
        setCurrentUser(res.user);
        if (res.user.role === 'superadmin') {
          router.replace('/admin');
        } else {
          router.replace('/');
        }
        return;
      }

      // 2. Fallback to local credential check
      const localUser = validateCredentials(login, password);
      if (localUser) {
        setCurrentUser(localUser);
        router.replace('/');
        return;
      }

      setError(res?.error || "Login yoki parol noto'g'ri");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    } catch (err: any) {
      setError(err?.message || "Tizimga kirishda xatolik yuz berdi");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className={`relative w-full max-w-sm ${isShaking ? 'animate-shake' : ''}`}>
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-8 py-10 text-white text-center relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -left-10 -top-10 w-36 h-36 bg-white/10 rounded-full blur-2xl"></div>

            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md mx-auto flex items-center justify-center border border-white/20 shadow-lg mb-4">
              <Building2 className="w-9 h-9 text-white" />
            </div>

            <h1 className="text-2xl font-black tracking-tight">
              B2B Samarqand
            </h1>
            <p className="text-blue-200 text-sm mt-1">
              CRM & Monitoring Platformasi
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl font-medium text-center">
                {error}
              </div>
            )}

            {/* Login */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Login
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Login kiriting"
                  value={login}
                  onChange={(e) => { setLogin(e.target.value); setError(null); }}
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-sm outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Parol
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Parol kiriting"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-sm outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>{loading ? 'Kirilmoqda...' : 'Kirish'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Demo Logins */}
            <div className="pt-3 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                Tezkor sinov hisoblari:
              </p>
              <div className="flex flex-col gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => { setLogin('admin'); setPassword('admin123'); }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg flex items-center justify-between text-[11px] text-slate-600 transition-colors cursor-pointer"
                >
                  <span className="font-semibold">🛡️ SuperAdmin (Admin Panel)</span>
                  <span className="font-mono text-[10px] text-slate-400">admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setLogin('ibroxim'); setPassword('ibroxim2026'); }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg flex items-center justify-between text-[11px] text-slate-600 transition-colors cursor-pointer"
                >
                  <span className="font-semibold">🏢 Kompaniya Admin</span>
                  <span className="font-mono text-[10px] text-slate-400">ibroxim</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setLogin('menejer1'); setPassword('123456'); }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg flex items-center justify-between text-[11px] text-slate-600 transition-colors cursor-pointer"
                >
                  <span className="font-semibold">👤 Menejer (CRM)</span>
                  <span className="font-mono text-[10px] text-slate-400">menejer1</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-4">
          © 2025 B2B Samarqand. Barcha huquqlar himoyalangan.
        </p>
      </div>
    </div>
  );
}
