'use client';
import { useMemo } from 'react';
import { MapObject } from '../../lib/types';
import { 
  Building2, FileText, Phone, UserCheck, MapPin, 
  CheckCircle2, RefreshCw, ExternalLink, BarChart2, PieChart, TrendingUp
} from 'lucide-react';

interface DashboardViewProps {
  objects: (MapObject & { distance?: number })[];
  totalCount: number;
  onSync: () => Promise<void>;
  syncing: boolean;
  onNavigateToTab: (tab: string) => void;
}

export default function DashboardView({
  objects,
  totalCount,
  onSync,
  syncing,
  onNavigateToTab
}: DashboardViewProps) {
  // Real dynamic calculations from objects array
  const stats = useMemo(() => {
    const total = objects.length;
    const withInternal = objects.filter(o => o.has_internal || o.phone || o.tjm_name).length;
    const withPhone = objects.filter(o => o.phone).length;
    const withManager = objects.filter(o => o.manager_name).length;
    const visited = objects.filter(o => o.is_visited || o.last_visit).length;
    const withoutInternal = total - withInternal;

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    objects.forEach(o => {
      const s = o.status || 'Jarayonda';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    // District breakdown
    const districtCounts: Record<string, number> = {};
    objects.forEach(o => {
      const d = o.district_name || 'Boshqa tumanlar';
      districtCounts[d] = (districtCounts[d] || 0) + 1;
    });

    const topDistricts = Object.entries(districtCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Percentage of B2B coverage
    const coveragePercent = total > 0 ? Math.round((withInternal / total) * 100) : 0;
    const visitPercent = total > 0 ? Math.round((visited / total) * 100) : 0;

    return {
      total,
      withInternal,
      withoutInternal,
      withPhone,
      withManager,
      visited,
      coveragePercent,
      visitPercent,
      statusCounts,
      topDistricts
    };
  }, [objects]);

  const cards = [
    { title: 'Jami obyektlar', value: stats.total, desc: "Samarqand viloyati davlat ro'yxati", icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { title: "B2B ma'lumot kiritilgan", value: `${stats.withInternal} (${stats.coveragePercent}%)`, desc: "TJM, telefon yoki menejer bor", icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { title: 'Telefon raqamli', value: stats.withPhone, desc: "To'g'ridan-to'g'ri aloqa mavjud", icon: Phone, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
    { title: 'Menejer biriktirilgan', value: stats.withManager, desc: "Rahbar ismi ma'lum", icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
    { title: 'Joyiga borib ko\'rilgan', value: `${stats.visited} (${stats.visitPercent}%)`, desc: "Tashrif sanasi qayd qilingan", icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
    { title: "To'ldirilishi kerak", value: stats.withoutInternal, desc: "Hali B2B kiritilmagan", icon: CheckCircle2, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-w-0 overflow-y-auto p-6 space-y-6">
      {/* Top Header with Sync Action */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <BarChart2 className="w-6 h-6 text-blue-600" />
            <span>B2B Samarqand • Tahlil va Statistika</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            CRM ma'lumotlari va Shaffof Qurilish davlat portali ma'lumotlari asosida real vaqt tahlili
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sinxronlanmoqda...' : 'Hozir sinxronlash'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className={`bg-white rounded-2xl border ${card.border} p-4 shadow-xs flex items-center gap-4 transition-all hover:shadow-md`}
            >
              <div className={`p-3.5 rounded-xl ${card.bg} ${card.color} shrink-0`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500 font-medium">{card.title}</p>
                <p className="text-xl font-bold text-slate-900 leading-tight mt-0.5">{card.value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{card.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: District Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Tumanlar bo'yicha taqsimot</span>
            </h3>
            <span className="text-xs text-slate-400">Eng faol 8 tuman</span>
          </div>

          <div className="space-y-3 pt-2">
            {stats.topDistricts.map(([district, count]) => {
              const pct = Math.round((count / (stats.total || 1)) * 100);
              return (
                <div key={district} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{district}</span>
                    <span className="text-slate-500 font-mono">
                      {count} ta <span className="text-slate-400">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, pct)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Construction Statuses & Coverage Progress */}
        <div className="space-y-6">
          {/* Status Breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Qurilish statuslari bo'yicha</span>
              </h3>
              <span className="text-xs text-slate-400">Shaffof Qurilish</span>
            </div>

            <div className="space-y-3 pt-2">
              {Object.entries(stats.statusCounts).map(([status, count]) => {
                const pct = Math.round((count / (stats.total || 1)) * 100);
                let barColor = 'bg-emerald-500';
                if (status.includes("To'xtatilgan")) barColor = 'bg-amber-500';
                if (status.includes('Muzlatilgan')) barColor = 'bg-slate-400';
                if (status.includes('Topshirilgan')) barColor = 'bg-blue-600';

                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{status}</span>
                      <span className="text-slate-500 font-mono">
                        {count} ta <span className="text-slate-400">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(5, pct)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-bold text-base">Obyektlar ro'yxatiga o'tish</h4>
              <p className="text-xs text-blue-100">Barcha 388 ta obyektni jadval ko'rinishida ko'rish va tahrirlash</p>
            </div>
            <button
              onClick={() => onNavigateToTab('objects')}
              className="px-4 py-2 bg-white text-blue-700 rounded-xl font-bold text-xs shadow-sm hover:bg-blue-50 transition-colors shrink-0"
            >
              Jadvalga o'tish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
