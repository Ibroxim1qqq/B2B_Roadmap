'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, EyeOff, Eye, KeyRound, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { api } from '../../lib/api';
import { Column, DataTable, FormDialog, FormField, Muted, PrimaryButton, RowAction, SearchBox, StatusDot } from './ui';

type Notify = (message: string, isError?: boolean) => void;

interface DialogState {
  title: string;
  fields: FormField[];
  initial: Record<string, any>;
  submitLabel?: string;
  onSubmit: (values: Record<string, any>) => Promise<void>;
}

const ROLE_OPTIONS = [
  { value: 'manager', label: 'Menejer' },
  { value: 'company_admin', label: 'Kompaniya admini' },
  { value: 'superadmin', label: 'Superadmin' }
];
const roleLabel = (role: string) => ROLE_OPTIONS.find(r => r.value === role)?.label || role;
const STATUS_OPTIONS = [{ value: 'active', label: 'Faol' }, { value: 'inactive', label: 'Faol emas' }];
const SOURCE_OPTIONS = [{ value: 'dshk', label: "DSHK (O'zbekiston bo'ylab)" }, { value: 'uysot', label: 'UYSOT / Domtut (Toshkent)' }];

const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent' }) : '—');
const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', hour12: false }) : '—');
const includes = (query: string, ...values: unknown[]) => values.some(v => String(v ?? '').toLowerCase().includes(query.trim().toLowerCase()));

/** Loads a list, reports failures, and hands back a reload function for after each change. */
function useList<T>(resource: string, notify: Notify, onChanged?: () => void) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows((await adminApi.list(resource)).data);
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [resource, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
    onChanged?.();
  }, [load, onChanged]);

  return { rows, loading, refresh };
}

function useDangerAction(notify: Notify, refresh: () => Promise<void>) {
  return async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      notify(success);
      void refresh();
    } catch (err: any) {
      notify(err.message, true);
    }
  };
}

interface TabProps {
  notify: Notify;
  onChanged?: () => void;
  currentUserId?: string;
}

// ---------------------------------------------------------------- Companies
export function CompaniesTab({ notify, onChanged }: TabProps) {
  const { rows, loading, refresh } = useList<any>('companies', notify, onChanged);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const run = useDangerAction(notify, refresh);

  const fields: FormField[] = [
    { key: 'company_name', label: 'Kompaniya nomi', required: true },
    { key: 'status', label: 'Holati', type: 'select', options: STATUS_OPTIONS, half: true, hint: 'Faol bo\'lmasa, xodimlari kira olmaydi' },
    { key: 'data_source', label: "Ma'lumot manbasi", type: 'select', options: SOURCE_OPTIONS, half: true }
  ];

  const openCreate = () => setDialog({
    title: 'Yangi kompaniya',
    fields,
    initial: { company_name: '', status: 'active', data_source: 'dshk' },
    submitLabel: 'Yaratish',
    onSubmit: async (v) => {
      await adminApi.create('companies', { name: v.company_name, status: v.status, data_source: v.data_source });
      notify('Kompaniya yaratildi');
      void refresh();
    }
  });

  const openEdit = (c: any) => setDialog({
    title: 'Kompaniyani tahrirlash',
    fields,
    initial: { company_name: c.company_name, status: c.status, data_source: c.data_source || 'dshk' },
    onSubmit: async (v) => {
      await adminApi.update('companies', { company_id: c.company_id, ...v });
      notify('Saqlandi');
      void refresh();
    }
  });

  const remove = (c: any) => {
    const typed = window.prompt(`"${c.company_name}" kompaniyasi, uning CRM ma'lumotlari va marshrutlari butunlay o'chiriladi. Tasdiqlash uchun nomini yozing:`);
    if (typed === null) return;
    if (typed.trim() !== c.company_name) {
      notify("Nom mos kelmadi, hech narsa o'chirilmadi", true);
      return;
    }
    run(() => adminApi.remove('companies', { company_id: c.company_id }), "Kompaniya o'chirildi");
  };

  const columns: Column<any>[] = [
    { header: 'Kompaniya', render: c => <><span className="font-medium text-slate-900">{c.company_name}</span><Muted>{c.company_id}</Muted></> },
    { header: 'Holati', render: c => <StatusDot active={c.status === 'active'} on="Faol" off="Faol emas" /> },
    { header: 'Manba', render: c => (c.data_source === 'uysot' ? 'UYSOT' : 'DSHK') },
    { header: 'Xodimlar', render: c => c.user_count },
    { header: 'CRM yozuvlar', render: c => c.crm_count },
    { header: 'Marshrutlar', render: c => c.route_count },
    { header: 'Yaratilgan', render: c => formatDate(c.created_at) }
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SearchBox value={search} onChange={setSearch} placeholder="Kompaniya qidirish..." />
        <PrimaryButton onClick={openCreate}>Yangi kompaniya</PrimaryButton>
      </div>
      <DataTable
        columns={columns}
        rows={rows.filter(c => includes(search, c.company_name, c.company_id))}
        rowKey={c => c.company_id}
        loading={loading}
        actions={c => (
          <>
            <Link href={`/?company_id=${encodeURIComponent(c.company_id)}`} title="Xaritada shu kompaniya sifatida ko'rish" className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              <ExternalLink className="w-4 h-4" />
            </Link>
            <RowAction icon={Pencil} title="Tahrirlash" onClick={() => openEdit(c)} />
            <RowAction icon={Trash2} title={c.user_count > 0 ? "Avval xodimlarni o'tkazing" : "O'chirish"} danger disabled={c.user_count > 0} onClick={() => remove(c)} />
          </>
        )}
      />
      {dialog && <FormDialog {...dialog} onClose={() => setDialog(null)} />}
    </section>
  );
}

// ---------------------------------------------------------------- Users
export function UsersTab({ notify, onChanged, currentUserId }: TabProps) {
  const { rows, loading, refresh } = useList<any>('users', notify, onChanged);
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const run = useDangerAction(notify, refresh);

  useEffect(() => {
    adminApi.list('companies').then(r => setCompanies(r.data)).catch(err => notify(err.message, true));
  }, [notify]);

  const companyOptions = useMemo(() => [
    { value: 'system', label: 'Tizim (kompaniyasiz)' },
    ...companies.map(c => ({ value: c.company_id, label: c.company_name }))
  ], [companies]);

  const baseFields: FormField[] = [
    { key: 'name', label: 'Ism familiya', required: true },
    { key: 'login', label: 'Login', required: true, half: true },
    { key: 'phone', label: 'Telefon', half: true },
    { key: 'company_id', label: 'Kompaniya', type: 'select', options: companyOptions, half: true },
    { key: 'role', label: 'Rol', type: 'select', options: ROLE_OPTIONS, half: true }
  ];

  const openCreate = () => setDialog({
    title: 'Yangi foydalanuvchi',
    fields: [...baseFields, { key: 'password', label: 'Parol', type: 'password', required: true, hint: 'Kamida 8 belgi' }],
    initial: { name: '', login: '', phone: '', password: '', role: 'manager', company_id: companies[0]?.company_id || 'system' },
    submitLabel: 'Yaratish',
    onSubmit: async (v) => {
      await adminApi.create('users', v);
      notify('Foydalanuvchi yaratildi');
      void refresh();
    }
  });

  const openEdit = (u: any) => setDialog({
    title: 'Foydalanuvchini tahrirlash',
    fields: baseFields,
    initial: { name: u.name, login: u.login, phone: u.phone || '', role: u.role, company_id: u.company_id },
    onSubmit: async (v) => {
      await adminApi.update('users', { userId: u.user_id, ...v });
      notify('Saqlandi');
      void refresh();
    }
  });

  const openPassword = (u: any) => setDialog({
    title: `Yangi parol: ${u.login}`,
    fields: [{ key: 'password', label: 'Yangi parol', type: 'password', required: true, hint: "Kamida 8 belgi. Foydalanuvchi hamma qurilmada qayta kiradi." }],
    initial: { password: '' },
    onSubmit: async (v) => {
      await adminApi.update('users', { userId: u.user_id, password: v.password });
      notify('Parol yangilandi');
    }
  });

  const toggleActive = (u: any) => {
    const next = u.is_active === false;
    if (!next && !window.confirm(`"${u.login}" kira olmaydi va hozirgi sessiyalari tugaydi. Davom etasizmi?`)) return;
    run(() => adminApi.update('users', { userId: u.user_id, is_active: next }), next ? 'Faollashtirildi' : "To'xtatildi");
  };

  const remove = (u: any) => {
    if (!window.confirm(`"${u.login}" butunlay o'chirilsinmi? Bu amalni qaytarib bo'lmaydi.`)) return;
    run(() => adminApi.remove('users', { user_id: u.user_id }), "Foydalanuvchi o'chirildi");
  };

  const columns: Column<any>[] = [
    { header: 'Foydalanuvchi', render: u => <><span className="font-medium text-slate-900">{u.name}</span><Muted>{u.login}{u.phone ? ` · ${u.phone}` : ''}</Muted></> },
    { header: 'Kompaniya', render: u => u.company_name },
    { header: 'Rol', render: u => roleLabel(u.role) },
    { header: 'Holati', render: u => <StatusDot active={u.is_active !== false} on="Faol" off="To'xtatilgan" /> },
    { header: 'Yaratilgan', render: u => formatDate(u.created_at) }
  ];

  const filtered = rows.filter(u => includes(search, u.name, u.login, u.phone, u.company_name) && (!companyFilter || u.company_id === companyFilter));

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <SearchBox value={search} onChange={setSearch} placeholder="Ism, login yoki telefon..." />
          <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] outline-none">
            <option value="">Barcha kompaniyalar</option>
            {companyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <PrimaryButton onClick={openCreate}>Yangi foydalanuvchi</PrimaryButton>
      </div>
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={u => u.user_id}
        loading={loading}
        actions={u => {
          const isSelf = u.user_id === currentUserId;
          return (
            <>
              <RowAction icon={Pencil} title="Tahrirlash" onClick={() => openEdit(u)} />
              <RowAction icon={KeyRound} title="Parolni tiklash" onClick={() => openPassword(u)} />
              <RowAction icon={u.is_active === false ? UserCheck : UserX} title={u.is_active === false ? 'Faollashtirish' : "To'xtatish"} disabled={isSelf} onClick={() => toggleActive(u)} />
              <RowAction icon={Trash2} title="O'chirish" danger disabled={isSelf} onClick={() => remove(u)} />
            </>
          );
        }}
      />
      {dialog && <FormDialog {...dialog} onClose={() => setDialog(null)} />}
    </section>
  );
}

// ---------------------------------------------------------------- Objects
const OBJECT_FIELDS: FormField[] = [
  { key: 'object_name', label: 'Nomi', required: true, type: 'textarea' },
  { key: 'address', label: 'Manzil' },
  { key: 'district_name', label: 'Tuman', half: true },
  { key: 'status', label: 'Holati', half: true },
  { key: 'latitude', label: 'Kenglik', type: 'number', half: true },
  { key: 'longitude', label: 'Uzunlik', type: 'number', half: true },
  { key: 'floors', label: 'Qavatlar', half: true },
  { key: 'apartment_count', label: 'Xonadonlar', half: true },
  { key: 'block_count', label: 'Bloklar', half: true },
  { key: 'deadline', label: 'Muddat', half: true },
  { key: 'brand_name', label: 'Brend', half: true },
  { key: 'builder', label: 'Quruvchi', half: true },
  { key: 'customer', label: 'Buyurtmachi', half: true },
  { key: 'phone', label: 'Telefon', half: true },
  { key: 'manager_name', label: 'Rahbar', half: true },
  { key: 'manager_phone', label: 'Rahbar telefoni', half: true },
  { key: 'sales_office', label: 'Sotuv ofisi', half: true },
  { key: 'notes', label: 'Izoh', type: 'textarea' }
];

export function ObjectsTab({ notify }: TabProps) {
  const [dataset, setDataset] = useState<'dshk' | 'uysot' | 'custom'>('dshk');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ data: any[]; count: number; page_size: number }>({ data: [], count: 0, page_size: 25 });
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const json = await adminApi.list('objects', { dataset, q: search, page: String(page) });
      setResult({ data: json.data, count: json.count, page_size: json.page_size });
    } catch (err: any) {
      notify(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [dataset, search, page, notify]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const run = useDangerAction(notify, load);

  const openEdit = (o: any) => {
    const initial = Object.fromEntries(OBJECT_FIELDS.map(f => [f.key, o[f.key] ?? '']));
    setDialog({
      title: 'Obyektni tahrirlash',
      fields: OBJECT_FIELDS,
      initial,
      onSubmit: async (v) => {
        const changed = Object.fromEntries(Object.entries(v).filter(([key, value]) => String(value) !== String(initial[key])));
        await adminApi.update('objects', {
          source_id: o.source_id,
          ...(dataset === 'custom' ? { company_id: o.company_id } : {}),
          data: changed
        });
        notify('Saqlandi');
        void load();
      }
    });
  };

  const remove = (o: any) => {
    if (!window.confirm(`"${o.object_name}" o'chirilsinmi? Bu amalni qaytarib bo'lmaydi.`)) return;
    run(() => adminApi.remove('objects', { company_id: o.company_id, source_id: o.source_id }), "Obyekt o'chirildi");
  };

  const columns: Column<any>[] = [
    { header: 'Obyekt', className: 'max-w-sm', render: o => <><span className="block font-medium text-slate-900 truncate">{o.tjm_name || o.object_name}</span><Muted>{o.source_id}</Muted></> },
    { header: 'Hudud', render: o => o.district_name || o.region_name || '—' },
    { header: 'Holati', render: o => o.status || '—' },
    { header: 'Qavat', render: o => o.floors || '—' },
    { header: 'Telefon', render: o => o.phone || o.manager_phone || '—' },
    ...(dataset === 'custom' ? [{ header: 'Kompaniya', render: (o: any) => o.company_id }] : [])
  ];

  const pages = Math.max(Math.ceil(result.count / result.page_size), 1);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Nom, ID, manzil yoki telefon..." />
        <div className="flex rounded-lg bg-slate-200/60 p-0.5 text-[13px]">
          {([['dshk', 'DSHK'], ['uysot', 'UYSOT'], ['custom', 'Kompaniyalar yaratgan']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => { setDataset(value); setPage(1); }}
              className={`px-3 h-8 rounded-md cursor-pointer whitespace-nowrap ${dataset === value ? 'bg-white text-slate-900 font-medium' : 'text-slate-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 ml-auto tabular-nums">Jami {result.count}</span>
      </div>
      <DataTable
        columns={columns}
        rows={result.data}
        rowKey={o => `${o.company_id || ''}_${o.source_id}`}
        loading={loading}
        actions={o => (
          <>
            <RowAction icon={Pencil} title="Tahrirlash" onClick={() => openEdit(o)} />
            {dataset === 'custom' && <RowAction icon={Trash2} title="O'chirish" danger onClick={() => remove(o)} />}
          </>
        )}
      />
      {dataset !== 'custom' && (
        <p className="text-xs text-slate-400">Bu obyektlarni o'chirib bo'lmaydi, haftalik sinxronizatsiya ularni qayta qo'shadi. U nom, manzil va koordinatani ham manbadan yangilab turadi.</p>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-3 text-[13px] text-slate-500">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="cursor-pointer disabled:opacity-30">Oldingi</button>
          <span className="tabular-nums">{page} / {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="cursor-pointer disabled:opacity-30">Keyingi</button>
        </div>
      )}
      {dialog && <FormDialog {...dialog} onClose={() => setDialog(null)} />}
    </section>
  );
}

// ---------------------------------------------------------------- Routes
export function RoutesTab({ notify }: TabProps) {
  const { rows, loading, refresh } = useList<any>('routes', notify);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const run = useDangerAction(notify, refresh);

  const openEdit = (r: any) => setDialog({
    title: 'Marshrutni tahrirlash',
    fields: [
      { key: 'route_name', label: 'Nomi', required: true },
      { key: 'status', label: 'Holati' },
      { key: 'notes', label: 'Izoh', type: 'textarea' }
    ],
    initial: { route_name: r.route_name, status: r.status, notes: r.notes },
    onSubmit: async (v) => {
      await adminApi.update('routes', { id: r.id, ...v });
      notify('Saqlandi');
      void refresh();
    }
  });

  const columns: Column<any>[] = [
    { header: 'Marshrut', className: 'max-w-sm', render: r => <><span className="block font-medium text-slate-900 truncate">{r.start_name} &rarr; {r.end_name}</span><Muted>{r.route_name}</Muted></> },
    { header: 'Kompaniya', render: r => r.company_name },
    { header: 'Xodim', render: r => r.user_name || '—' },
    { header: 'Masofa', render: r => `${r.distance_km} km` },
    { header: 'TJM', render: r => r.tjm_count },
    { header: 'Sana', render: r => formatDate(r.created_at) }
  ];

  return (
    <section className="space-y-3">
      <SearchBox value={search} onChange={setSearch} placeholder="Marshrut, kompaniya yoki xodim..." />
      <DataTable
        columns={columns}
        rows={rows.filter(r => includes(search, r.route_name, r.start_name, r.end_name, r.company_name, r.user_name))}
        rowKey={r => r.id}
        loading={loading}
        empty="Saqlangan marshrut yo'q"
        actions={r => (
          <>
            <RowAction icon={Pencil} title="Tahrirlash" onClick={() => openEdit(r)} />
            <RowAction
              icon={Trash2}
              title="O'chirish"
              danger
              onClick={() => {
                if (window.confirm('Marshrut o\'chirilsinmi?')) run(() => adminApi.remove('routes', { id: r.id }), "Marshrut o'chirildi");
              }}
            />
          </>
        )}
      />
      {dialog && <FormDialog {...dialog} onClose={() => setDialog(null)} />}
    </section>
  );
}

// ---------------------------------------------------------------- Notifications
export function NotificationsTab({ notify }: TabProps) {
  const { rows, loading, refresh } = useList<any>('notifications', notify);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const run = useDangerAction(notify, refresh);

  const fields: FormField[] = [
    { key: 'title', label: 'Sarlavha', required: true },
    { key: 'summary', label: 'Matn', type: 'textarea' }
  ];

  const columns: Column<any>[] = [
    { header: 'Bildirishnoma', className: 'max-w-lg', render: n => <><span className="block font-medium text-slate-900 truncate">{n.title}</span><Muted>{n.summary}</Muted></> },
    { header: 'Yangi obyektlar', render: n => n.new_count },
    { header: 'Sana', render: n => formatDate(n.timestamp) }
  ];

  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <PrimaryButton
          onClick={() => setDialog({
            title: 'Yangi bildirishnoma',
            fields,
            initial: { title: '', summary: '' },
            submitLabel: 'Yuborish',
            onSubmit: async (v) => {
              await adminApi.create('notifications', v);
              notify('Yuborildi');
              void refresh();
            }
          })}
        >
          Yangi bildirishnoma
        </PrimaryButton>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={n => n.id}
        loading={loading}
        empty="Bildirishnoma yo'q"
        actions={n => (
          <>
            <RowAction
              icon={Pencil}
              title="Tahrirlash"
              onClick={() => setDialog({
                title: 'Bildirishnomani tahrirlash',
                fields,
                initial: { title: n.title, summary: n.summary },
                onSubmit: async (v) => {
                  await adminApi.update('notifications', { id: n.id, ...v });
                  notify('Saqlandi');
                  void refresh();
                }
              })}
            />
            <RowAction
              icon={Trash2}
              title="O'chirish"
              danger
              onClick={() => {
                if (window.confirm("Bildirishnoma o'chirilsinmi?")) run(() => adminApi.remove('notifications', { id: n.id }), "O'chirildi");
              }}
            />
          </>
        )}
      />
      {dialog && <FormDialog {...dialog} onClose={() => setDialog(null)} />}
    </section>
  );
}

// ---------------------------------------------------------------- Fields
const FIELD_TYPES = ['text', 'phone', 'number', 'date', 'url', 'textarea', 'select'].map(value => ({ value, label: value }));

export function FieldsTab({ notify }: TabProps) {
  const { rows, loading, refresh } = useList<any>('fields', notify);
  const [companies, setCompanies] = useState<any[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const run = useDangerAction(notify, refresh);

  useEffect(() => {
    adminApi.list('companies').then(r => setCompanies(r.data)).catch(err => notify(err.message, true));
  }, [notify]);

  const openCreate = () => setDialog({
    title: 'Yangi maydon',
    fields: [
      { key: 'label', label: 'Nomi', required: true },
      { key: 'field_name', label: 'Kalit', hint: "Lotin harflarida, bo'sh qolsa nomidan olinadi", half: true },
      { key: 'field_type', label: 'Turi', type: 'select', options: FIELD_TYPES, half: true },
      { key: 'company_id', label: 'Kimga', type: 'select', options: [{ value: '', label: 'Barcha kompaniyalar' }, ...companies.map(c => ({ value: c.company_id, label: c.company_name }))] },
      { key: 'desc', label: 'Tavsif' }
    ],
    initial: { label: '', field_name: '', field_type: 'text', company_id: '', desc: '' },
    submitLabel: 'Yaratish',
    onSubmit: async (v) => {
      await adminApi.create('fields', v);
      notify('Maydon yaratildi');
      void refresh();
    }
  });

  const openEdit = (f: any) => setDialog({
    title: 'Maydonni tahrirlash',
    fields: [
      { key: 'label', label: 'Nomi' },
      { key: 'field_type', label: 'Turi', type: 'select', options: FIELD_TYPES },
      { key: 'desc', label: 'Tavsif' }
    ],
    initial: { label: f.label || '', field_type: f.field_type, desc: f.desc || '' },
    onSubmit: async (v) => {
      await adminApi.update('fields', { field_name: f.field_name, company_id: f.company_id, ...v });
      notify('Saqlandi');
      void refresh();
    }
  });

  const columns: Column<any>[] = [
    { header: 'Maydon', render: f => <><span className="font-medium text-slate-900">{f.label || f.field_name}</span><Muted>{f.field_name}</Muted></> },
    { header: 'Kimga', render: f => f.company_name },
    { header: 'Turi', render: f => f.field_type },
    { header: 'Holati', render: f => <StatusDot active={f.visible !== false} on="Ko'rinadi" off="Yashirilgan" /> }
  ];

  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <PrimaryButton onClick={openCreate}>Yangi maydon</PrimaryButton>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={f => `${f.company_id}_${f.field_name}`}
        loading={loading}
        actions={f => (
          <>
            <RowAction icon={Pencil} title="Tahrirlash" onClick={() => openEdit(f)} />
            <RowAction
              icon={f.visible === false ? Eye : EyeOff}
              title={f.visible === false ? "Ko'rsatish" : 'Yashirish'}
              onClick={() => run(() => adminApi.update('fields', { field_name: f.field_name, company_id: f.company_id, visible: f.visible === false }), 'Saqlandi')}
            />
            <RowAction
              icon={Trash2}
              title="O'chirish"
              danger
              onClick={() => {
                if (window.confirm(`"${f.label || f.field_name}" maydoni o'chirilsinmi? Kiritilgan qiymatlar bazada qoladi, lekin ko'rinmaydi.`)) {
                  run(() => adminApi.remove('fields', { field_name: f.field_name, company_id: f.company_id }), "Maydon o'chirildi");
                }
              }}
            />
          </>
        )}
      />
      {dialog && <FormDialog {...dialog} onClose={() => setDialog(null)} />}
    </section>
  );
}

// ---------------------------------------------------------------- Audit
export function AuditTab({ notify }: TabProps) {
  const [view, setView] = useState<'sessions' | 'activity'>('sessions');
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionSearch, setSessionSearch] = useState('');
  const { rows: activity, loading: activityLoading } = useList<any>('activity', notify);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getUserSessions(300)
      .then(res => {
        if (res.success) setSessions(res.data);
        else notify(res.error || "Sessiyalarni yuklab bo'lmadi", true);
      })
      .finally(() => setLoading(false));
  }, [notify]);

  const sessionColumns: Column<any>[] = [
    { header: 'Foydalanuvchi', render: s => <><span className="font-medium text-slate-900">{s.user_name}</span><Muted>{s.login}</Muted></> },
    { header: 'Kompaniya', render: s => s.company_name || s.company_id },
    { header: 'Amal', render: s => (s.action === 'register' ? "Ro'yxatdan o'tdi" : s.action === 'login' ? 'Tizimga kirdi' : s.action) },
    { header: 'IP', render: s => s.ip_address || '—' },
    { header: 'Vaqt', render: s => <span className="whitespace-nowrap">{formatDateTime(s.created_at)}</span> }
  ];
  const activityColumns: Column<any>[] = [
    { header: 'Amal', render: a => a.action },
    { header: 'Kim', render: a => a.user_info || '—' },
    { header: 'Obyekt', className: 'max-w-xs', render: a => <span className="block truncate">{a.object_name || a.source_id || '—'}</span> },
    { header: 'Vaqt', render: a => <span className="whitespace-nowrap">{formatDateTime(a.created_at)}</span> }
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-slate-200/60 p-0.5 text-[13px]">
          {([['sessions', 'Sessiyalar'], ['activity', 'Amallar jurnali']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              className={`px-3 h-8 rounded-md cursor-pointer ${view === value ? 'bg-white text-slate-900 font-medium' : 'text-slate-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <SearchBox value={sessionSearch} onChange={setSessionSearch} placeholder="Qidirish..." />
      </div>
      {view === 'sessions' ? (
        <DataTable
          columns={sessionColumns}
          rows={sessions.filter(s => includes(sessionSearch, s.user_name, s.login, s.company_name, s.ip_address, s.action))}
          rowKey={s => s.session_id}
          loading={loading}
        />
      ) : (
        <DataTable
          columns={activityColumns}
          rows={activity.filter(a => includes(sessionSearch, a.action, a.user_info, a.object_name, a.source_id))}
          rowKey={a => `${a.action}_${a.source_id}_${a.created_at}`}
          loading={activityLoading}
        />
      )}
    </section>
  );
}
