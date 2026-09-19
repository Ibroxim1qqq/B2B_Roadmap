'use client';
import { useState, useEffect } from 'react';
import { Building2, Lock, User, ArrowRight, ShieldCheck, Eye, EyeOff, X } from 'lucide-react';
import { validateCredentials } from '../../lib/auth';
import { UserProfile } from '../../lib/types';
export type { UserProfile };

interface LoginModalProps {
  onLogin: (user: UserProfile) => void;
  onClose?: () => void;
}

export default function LoginModal({ onLogin, onClose }: LoginModalProps) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
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

    const user = validateCredentials(login, password);
    if (user) {
      onLogin(user);
    } else {
      setError('Login yoki parol noto\'g\'ri');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col animate-in zoom-in-95 duration-200 relative ${isShaking ? 'animate-shake' : ''}`}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Yopish"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="absolute -left-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md mx-auto flex items-center justify-center border border-white/20 shadow-lg mb-4">
            <Building2 className="w-9 h-9 text-white" />
          </div>

          <h1 className="text-xl font-black tracking-tight">
            B2B Samarqand
          </h1>
          <p className="text-blue-200 text-xs mt-1">
            Tizimga kirish
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl font-medium text-center">
              {error}
            </div>
          )}

          {/* Login Field */}
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

          {/* Password Field */}
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

          {/* Submit Button */}
          <div className="pt-1">
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Kirish</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Xavfsiz ulanish</span>
          </div>
        </form>

      </div>
    </div>
  );
}
