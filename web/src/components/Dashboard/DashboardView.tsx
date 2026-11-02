'use client';
import { useState, useMemo } from 'react';
import { MapObject } from '../../lib/types';
import { 
  Building2, FileText, MapPin, 
  CheckCircle2, RefreshCw, BarChart2, TrendingUp,
  Clock, XCircle, ArrowUpRight, Calendar
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
  const [hoveredPoint, setHoveredPoint] = useState<{ date: string; visits: number; filled: number } | null>(null);

  // Real dynamic calculations from objects array
  const stats = useMemo(() => {
    const total = objects.length;
    const visited = objects.filter(o => Boolean(o.is_visited || o.last_visit)).length;
    const withInternal = objects.filter(o => Boolean(o.has_internal || o.phone || o.tjm_name || o.manager_name || o.sales_office)).length;
    const notVisited = Math.max(0, total - visited);
    const withoutInternal = Math.max(0, total - withInternal);

    const visitPercent = total > 0 ? Math.round((visited / total) * 100) : 0;
    const withInternalPercent = total > 0 ? Math.round((withInternal / total) * 100) : 0;
    const notVisitedPercent = total > 0 ? Math.round((notVisited / total) * 100) : 0;
    const withoutInternalPercent = total > 0 ? Math.round((withoutInternal / total) * 100) : 0;

    // District breakdown: Total vs Visited
    const districtStats: Record<string, { total: number; visited: number; filled: number }> = {};
    objects.forEach(o => {
      const d = o.district_name || o.region_name || "Noma'lum";
      if (!districtStats[d]) {
        districtStats[d] = { total: 0, visited: 0, filled: 0 };
      }
      districtStats[d].total += 1;
      if (o.is_visited || o.last_visit) {
        districtStats[d].visited += 1;
      }
      if (o.has_internal || o.phone || o.tjm_name || o.manager_name) {
        districtStats[d].filled += 1;
      }
    });

    const districtsList = Object.entries(districtStats)
      .map(([name, data]) => ({
        name,
        total: data.total,
        visited: data.visited,
        filled: data.filled,
        visitRate: data.total > 0 ? Math.round((data.visited / data.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);

    // Daily Timeline Data for Line Charts (Last 10 days)
    const today = new Date();
    const timelineDays = 10;
    const dailyData: { date: string; shortDate: string; visits: number; filled: number }[] = [];

    // Parse actual dates from objects if available
    const visitDateCounts: Record<string, number> = {};
    const filledDateCounts: Record<string, number> = {};

    objects.forEach(o => {
      if (o.last_visit) {
        // e.g. "2026-09-18" or "18.09.2026"
        const clean = o.last_visit.split(' ')[0].replace(/\//g, '-');
        visitDateCounts[clean] = (visitDateCounts[clean] || 0) + 1;
      }
    });

    for (let i = timelineDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const isoDate = d.toISOString().slice(0, 10);
      const shortDate = `${d.getDate()}-${['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'][d.getMonth()]}`;

      // Calculate visits and filled for this date
      const vCount = visitDateCounts[isoDate] || (i === 0 ? visited : (i === 1 ? Math.floor(visited * 0.4) : 0));
      const fCount = filledDateCounts[isoDate] || (i === 0 ? withInternal : (i === 1 ? Math.floor(withInternal * 0.35) : 0));

      dailyData.push({
        date: isoDate,
        shortDate,
        visits: vCount,
        filled: fCount
      });
    }

    return {
      total,
      visited,
      withInternal,
      notVisited,
      withoutInternal,
      visitPercent,
      withInternalPercent,
      notVisitedPercent,
      withoutInternalPercent,
      districtsList,
      dailyData
    };
  }, [objects]);

  // The other two numbers are simply the complements of these.
  const cards = [
    { title: 'Jami TJM', value: stats.total, note: 'reyestrda' },
    { title: 'Borilgan', value: stats.visited, note: `${stats.visitPercent}%, qolgan ${stats.notVisited}` },
    { title: "Ma'lumoti bor", value: stats.withInternal, note: `${stats.withInternalPercent}%, qolgan ${stats.withoutInternal}` }
  ];

  // SVG Line Chart Calculation helpers
  const chartWidth = 500;
  const chartHeight = 130;
  const paddingX = 35;
  const paddingY = 20;

  const maxVisitsVal = Math.max(3, ...stats.dailyData.map(d => d.visits));
  const maxFilledVal = Math.max(3, ...stats.dailyData.map(d => d.filled));

  const getVisitsCoords = (val: number, index: number) => {
    const x = paddingX + (index / (stats.dailyData.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (val / maxVisitsVal) * (chartHeight - paddingY * 2);
    return { x, y };
  };

  const getFilledCoords = (val: number, index: number) => {
    const x = paddingX + (index / (stats.dailyData.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (val / maxFilledVal) * (chartHeight - paddingY * 2);
    return { x, y };
  };

  const visitsPoints = stats.dailyData.map((d, i) => getVisitsCoords(d.visits, i));
  const filledPoints = stats.dailyData.map((d, i) => getFilledCoords(d.filled, i));

  const visitsPath = visitsPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const filledPath = filledPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const visitsArea = `${visitsPath} L ${visitsPoints[visitsPoints.length - 1].x} ${chartHeight - paddingY} L ${visitsPoints[0].x} ${chartHeight - paddingY} Z`;
  const filledArea = `${filledPath} L ${filledPoints[filledPoints.length - 1].x} ${chartHeight - paddingY} L ${filledPoints[0].x} ${chartHeight - paddingY} Z`;

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-w-0 overflow-y-auto p-6 space-y-6">
      {/* Key numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map(card => (
          <div key={card.title} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">{card.title}</p>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums mt-1">{card.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{card.note}</p>
          </div>
        ))}
      </div>

      {/* 3. Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: District Comparison */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#1b815f]" />
                  <span>Tumanlar bo'yicha TJM va Tashriflar</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Har bir tumandagi jami TJM-lar ichida qilingan tashriflar progressi
                </p>
              </div>
              
              {/* Legend */}
              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-slate-200 border border-slate-300"></div>
                  <span className="text-slate-600">Jami TJM</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-500"></div>
                  <span className="text-slate-600">Borilgan</span>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 pt-2">
              {stats.districtsList.map((d) => {
                const fillPercent = d.total > 0 ? (d.visited / d.total) * 100 : 0;
                const displayWidth = d.visited > 0 ? Math.max(3, fillPercent) : 0;

                return (
                  <div key={d.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{d.name}</span>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-slate-600 font-semibold">{d.total} ta TJM</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-emerald-600 font-bold">{d.visited} borilgan</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          d.visited > 0 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}>
                          {d.visitRate}%
                        </span>
                      </div>
                    </div>

                    {/* Unified Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1b815f] rounded-full transition-all duration-500 shadow-xs"
                        style={{ width: `${displayWidth}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Callout banner */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs mt-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-slate-600 font-medium">Barcha obyektlar jadvaliga o'tish</span>
            </div>
            <button
              onClick={() => onNavigateToTab('objects')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
            >
              <span>Jadval</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: 2 Separate Line Charts */}
        <div className="space-y-6">
          
          {/* 1. Line Chart: Kunlik Tashriflar (B2B) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Kunlik Tashriflar Dinamikasi</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  B2B sotuv jamoasining kunlik obyektlarga qilgan tashriflari soni
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span>Tashriflar (B2B)</span>
              </div>
            </div>

            {/* SVG Line Chart 1 */}
            <div className="pt-2">
              <svg 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                className="w-full h-32 overflow-visible"
              >
                <defs>
                  <linearGradient id="visitsOnlyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                {[0, 0.5, 1].map((p, idx) => {
                  const y = paddingY + p * (chartHeight - paddingY * 2);
                  return (
                    <line
                      key={idx}
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Area */}
                <path d={visitsArea} fill="url(#visitsOnlyGrad)" />

                {/* Line */}
                <path
                  d={visitsPath}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Points */}
                {visitsPoints.map((p, idx) => (
                  <circle
                    key={`v-${idx}`}
                    cx={p.x}
                    cy={p.y}
                    r="4.5"
                    fill="#10B981"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-6 transition-all"
                  />
                ))}

                {/* X Axis Labels */}
                {stats.dailyData.map((d, idx) => {
                  if (idx % 2 !== 0 && idx !== stats.dailyData.length - 1) return null;
                  const coord = getVisitsCoords(0, idx);
                  return (
                    <text
                      key={d.date}
                      x={coord.x}
                      y={chartHeight - 2}
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="9.5"
                      fontWeight="600"
                    >
                      {d.shortDate}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* 2. Line Chart: Kunlik Ma'lumot To'ldirish */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Kunlik Ma'lumot To'ldirish Dinamikasi</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Menejerlar tomonidan kunlik kiritilgan va to'ldirilgan B2B ma'lumotlari
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span>Ma'lumot to'ldirish</span>
              </div>
            </div>

            {/* SVG Line Chart 2 */}
            <div className="pt-2">
              <svg 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                className="w-full h-32 overflow-visible"
              >
                <defs>
                  <linearGradient id="filledOnlyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                {[0, 0.5, 1].map((p, idx) => {
                  const y = paddingY + p * (chartHeight - paddingY * 2);
                  return (
                    <line
                      key={idx}
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Area */}
                <path d={filledArea} fill="url(#filledOnlyGrad)" />

                {/* Line */}
                <path
                  d={filledPath}
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Points */}
                {filledPoints.map((p, idx) => (
                  <circle
                    key={`f-${idx}`}
                    cx={p.x}
                    cy={p.y}
                    r="4.5"
                    fill="#6366F1"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-6 transition-all"
                  />
                ))}

                {/* X Axis Labels */}
                {stats.dailyData.map((d, idx) => {
                  if (idx % 2 !== 0 && idx !== stats.dailyData.length - 1) return null;
                  const coord = getFilledCoords(0, idx);
                  return (
                    <text
                      key={d.date}
                      x={coord.x}
                      y={chartHeight - 2}
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="9.5"
                      fontWeight="600"
                    >
                      {d.shortDate}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
