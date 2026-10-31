'use client';
import { useState, useRef } from 'react';
import { User, Lock, Phone, Building2, Shield, X, Camera, Eye, EyeOff, Check, Trash2, LogOut } from 'lucide-react';
import { UserProfile } from '../../lib/types';
import { updateUserProfile } from '../../lib/auth';
import { api } from '../../lib/api';

interface UserProfileModalProps {
  currentUser: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: (updated: UserProfile) => void;
  onLogout?: () => void;
}

export default function UserProfileModal({
  currentUser,
  isOpen,
  onClose,
  onUserUpdated,
  onLogout
}: UserProfileModalProps) {
  const [name, setName] = useState(currentUser?.name || '');
  const [login, setLogin] = useState(currentUser?.login || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || '');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !currentUser) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Rasm hajmi 2MB dan oshmasligi kerak");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatarUrl(result);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Ismni kiritish majburiy");
      return;
    }
    if (!login.trim()) {
      setError("Loginni kiritish majburiy");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updates: Partial<UserProfile> = {
        name: name.trim(),
        login: login.trim(),
        phone: phone.trim(),
        avatar_url: avatarUrl
      };
      if (password.trim()) {
        updates.password = password.trim();
      }

      const updated = updateUserProfile(updates);
      if (updated) {
        // Sync profile changes to Neon PostgreSQL database
        const targetId = currentUser.user_id || currentUser.id || currentUser.login;
        if (targetId) {
          api.updateUser(targetId, updates).catch(e => console.warn('Sync profile to DB error:', e));
        }

        setSuccess(true);
        onUserUpdated?.(updated);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 600);
      } else {
        setError("Profilni saqlashda xatolik yuz berdi");
      }
    } catch (err: any) {
      setError(err?.message || "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1b815f] flex items-center justify-center shadow-xs">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight leading-none">Foydalanuvchi Profili</h3>
              <p className="text-[10px] text-emerald-400 mt-0.5 font-medium">Shaxsiy ma'lumotlarni sozlash</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-semibold">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>O'zgarishlar muvaffaqiyatli saqlandi!</span>
            </div>
          )}

          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center justify-center pb-2 border-b border-slate-100">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-2 border-emerald-500/30 shadow-md flex items-center justify-center text-slate-700 font-bold text-xl">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#1b815f] text-white flex items-center justify-center">
                    <User className="w-9 h-9 text-white" />
                  </div>
                )}
              </div>

              {/* Camera overlay button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#1b815f] hover:bg-[#15694c] text-white flex items-center justify-center shadow-md border-2 border-white transition-all cursor-pointer"
                title="Rasm yuklash"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              className="hidden" 
            />

            <div className="flex items-center gap-2 mt-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-[#1b815f] hover:underline cursor-pointer"
              >
                Rasm tanlash
              </button>
              {avatarUrl && (
                <>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="text-xs font-semibold text-rose-500 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>O'chirish</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              To'liq ism (F.I.O)
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masalan: Ibroxim Toirov"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#1b815f] focus:ring-2 focus:ring-[#1b815f]/15 font-medium text-slate-800 transition-all"
              />
            </div>
          </div>

          {/* Login Username */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tizimga kirish logini
            </label>
            <div className="relative">
              <span className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold">@</span>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Login kiriting"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#1b815f] focus:ring-2 focus:ring-[#1b815f]/15 font-medium text-slate-800 transition-all"
              />
            </div>
          </div>

          {/* Password (Optional update) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Yangi parol <span className="text-slate-400 font-normal">(o'zgartirish ixtiyoriy)</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Yangi parol kiriting..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#1b815f] focus:ring-2 focus:ring-[#1b815f]/15 font-medium text-slate-800 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Telefon raqam
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#1b815f] focus:ring-2 focus:ring-[#1b815f]/15 font-medium text-slate-800 transition-all"
              />
            </div>
          </div>

          {/* Role & Company metadata badges */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-600 font-medium">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Lavozim:</span>
              </span>
              <span className="font-bold text-slate-900 capitalize">{currentUser.role}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 font-medium">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Kompaniya:</span>
              </span>
              <span className="font-bold text-slate-900">{currentUser.company_name || 'Asosiy Kompaniya'}</span>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-4 bg-[#1b815f] hover:bg-[#15694c] text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</span>
            </button>
          </div>

          {/* Logout Button */}
          {onLogout && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Haqiqatan ham tizimdan chiqmoqchimisiz?")) {
                    onClose();
                    onLogout();
                  }
                }}
                className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <LogOut className="w-4 h-4" />
                <span>Tizimdan chiqish</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
