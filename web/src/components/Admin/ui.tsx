'use client';
import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

export interface FormField {
  key: string;
  label: string;
  type?: 'text' | 'password' | 'textarea' | 'select' | 'checkbox' | 'number';
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  half?: boolean;
}

const INPUT = 'w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 outline-none focus:border-[#1b815f]';

export function FormDialog({ title, fields, initial, submitLabel = 'Saqlash', onSubmit, onClose }: {
  title: string;
  fields: FormField[];
  initial: Record<string, any>;
  submitLabel?: string;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, any>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (key: string, value: any) => setValues(prev => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Saqlab bo\'lmadi');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form onSubmit={submit} className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} title="Yopish" className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto grid grid-cols-2 gap-3">
          {fields.map(field => (
            <div key={field.key} className={field.half ? 'col-span-1' : 'col-span-2'}>
              {field.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-[13px] text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(values[field.key])}
                    onChange={(e) => set(field.key, e.target.checked)}
                    className="accent-[#1b815f]"
                  />
                  {field.label}
                </label>
              ) : (
                <label className="block">
                  <span className="block text-xs text-slate-500 mb-1">{field.label}</span>
                  {field.type === 'select' ? (
                    <select value={values[field.key] ?? ''} onChange={(e) => set(field.key, e.target.value)} className={INPUT}>
                      {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={values[field.key] ?? ''}
                      required={field.required}
                      rows={3}
                      onChange={(e) => set(field.key, e.target.value)}
                      className={`${INPUT} h-auto py-2`}
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      step={field.type === 'number' ? 'any' : undefined}
                      value={values[field.key] ?? ''}
                      required={field.required}
                      autoComplete={field.type === 'password' ? 'new-password' : 'off'}
                      onChange={(e) => set(field.key, e.target.value)}
                      className={INPUT}
                    />
                  )}
                  {field.hint && <span className="block text-xs text-slate-400 mt-1">{field.hint}</span>}
                </label>
              )}
            </div>
          ))}
        </div>

        {error && <p className="px-5 pb-2 text-[13px] text-rose-600">{error}</p>}

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 shrink-0">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg text-[13px] text-slate-600 hover:bg-slate-100 cursor-pointer">
            Bekor qilish
          </button>
          <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-[#1b815f] hover:bg-[#15674c] text-white text-[13px] font-medium cursor-pointer disabled:opacity-60">
            {saving ? 'Saqlanmoqda...' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Qidirish...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-[13px] outline-none focus:border-[#1b815f]"
      />
    </div>
  );
}

export function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="h-9 px-4 rounded-lg bg-[#1b815f] hover:bg-[#15674c] text-white text-[13px] font-medium cursor-pointer whitespace-nowrap">
      {children}
    </button>
  );
}

export function RowAction({ icon: Icon, title, onClick, danger, disabled }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`w-8 h-8 rounded-lg inline-flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
        danger ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

export interface Column<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T>({ columns, rows, rowKey, actions, empty = "Ma'lumot topilmadi", loading }: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  actions?: (row: T) => React.ReactNode;
  empty?: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
            {columns.map(c => <th key={c.header} className="px-4 py-3 font-normal whitespace-nowrap">{c.header}</th>)}
            {actions && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-slate-400">
                {loading ? 'Yuklanmoqda...' : empty}
              </td>
            </tr>
          ) : rows.map(row => (
            <tr key={rowKey(row)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
              {columns.map(c => <td key={c.header} className={`px-4 py-3 text-slate-700 ${c.className || ''}`}>{c.render(row)}</td>)}
              {actions && <td className="px-3 py-1.5 text-right whitespace-nowrap">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <span className="block text-xs text-slate-400 truncate">{children}</span>;
}

export function StatusDot({ active, on, off }: { active: boolean; on: string; off: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-[#1b815f]' : 'bg-slate-300'}`} />
      {active ? on : off}
    </span>
  );
}
