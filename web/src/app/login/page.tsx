'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, CloudSun } from 'lucide-react';
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

  // Live Clock & Date for Left Panel
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);

      const daysUz = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const dayName = daysUz[now.getDay()];
      setCurrentDate(`${day}.${month}.${year} • ${dayName}`);
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // If already logged in, redirect
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
      // 1. Authenticate with API / DB
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
    <div className="min-h-screen bg-slate-100 flex p-3 sm:p-5 select-none font-sans">
      <div className="w-full flex bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200/80">
        
        {/* Left Column: Modern Building Photo with Live Time & Weather */}
        <div className="hidden lg:flex lg:w-7/12 relative flex-col justify-between p-8 sm:p-10 overflow-hidden bg-slate-900 rounded-3xl m-2.5">
          {/* Background Photo with dark overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
            style={{ backgroundImage: `url('/login-bg.jpg')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/30 to-slate-900/40" />

          {/* Top Bar: Live Clock on Left, Weather on Right */}
          <div className="relative z-10 flex items-start justify-between w-full">
            <div>
              <div className="text-5xl sm:text-6xl font-light text-white tracking-tight drop-shadow-md">
                {currentTime || '16:55'}
              </div>
              <div className="text-sm font-medium text-white/90 mt-1 drop-shadow-xs">
                {currentDate || '31.10.2026 • Shanba'}
              </div>
            </div>

            {/* Weather Badge */}
            <div className="flex items-center gap-2 px-3.5 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl text-white shadow-lg text-xs font-semibold">
              <CloudSun className="w-5 h-5 text-amber-300" />
              <div>
                <div className="leading-tight">16.8 °C</div>
                <div className="text-[10px] text-white/80 font-normal leading-tight">O'zbekiston/Toshkent</div>
              </div>
            </div>
          </div>

          {/* Bottom left: Empty per user's red cross out */}
          <div className="relative z-10" />
        </div>

        {/* Right Column: Clean Centered Login Form */}
        <div className="w-full lg:w-5/12 flex flex-col items-center justify-center p-6 sm:p-12 md:p-16">
          <div className={`w-full max-w-sm flex flex-col items-center text-center ${isShaking ? 'animate-shake' : ''}`}>
            
            {/* UYSOT Official Logo */}
            <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-lg shadow-emerald-700/20 bg-[#1b815f] flex items-center justify-center mb-5 p-1 border border-emerald-500/30">
              <img src="/uysot-logo.png" alt="UYSOT B2B" className="w-full h-full object-cover rounded-2xl" />
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-8">
              Xush kelibsiz
            </h1>

            {/* Error banner */}
            {error && (
              <div className="w-full mb-4 px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-semibold text-left">
                {error}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="w-full space-y-4 text-left">
              <div>
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Loginni kiriting"
                  autoComplete="username"
                  disabled={loading}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#1b815f] focus:ring-2 focus:ring-[#1b815f]/15 transition-all text-slate-800 font-medium placeholder:text-slate-400"
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Parolni kiriting"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full px-4 py-3.5 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#1b815f] focus:ring-2 focus:ring-[#1b815f]/15 transition-all text-slate-800 font-medium placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Submit Button in UYSOT Brand Green */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-[#1b815f] hover:bg-[#166b4f] disabled:bg-slate-300 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-700/20 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Kirilmoqda...</span>
                  </>
                ) : (
                  <span>Kirish</span>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
