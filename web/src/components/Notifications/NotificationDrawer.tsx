'use client';
import { useState, useMemo } from 'react';
import { 
  Bell, X, Check, Building2, MapPin, Layers, 
  ExternalLink, Calendar, Sparkles, Filter, Clock
} from 'lucide-react';
import { WeeklySyncNotification, NewBuildingItem } from '../../lib/types';
import { getRegionName } from '../../lib/regions';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: WeeklySyncNotification[];
  onSelectBuilding: (building: NewBuildingItem) => void;
  onMarkAllAsRead: () => void;
  unreadCount: number;
}

export default function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  onSelectBuilding,
  onMarkAllAsRead,
  unreadCount
}: NotificationDrawerProps) {
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  // 1. Flatten all newly added buildings from all notifications
  // 2. Filter out buildings older than 1 month (30 days)
  // 3. Sort newest at top, oldest at bottom
  const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

  const validBuildings = useMemo(() => {
    const now = Date.now();
    const list: (NewBuildingItem & { notifTimestamp?: string })[] = [];
    const seenIds = new Set<string>();

    for (const notif of notifications) {
      const notifTime = notif.timestamp ? new Date(notif.timestamp).getTime() : now;
      
      // If the entire notification batch is older than 30 days, skip
      if (!isNaN(notifTime) && (now - notifTime) > ONE_MONTH_MS) {
        continue;
      }

      for (const b of notif.new_objects || []) {
        const id = String(b.source_id);
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        const bTime = b.created_at ? new Date(b.created_at).getTime() : notifTime;
        // Skip if older than 30 days
        if (!isNaN(bTime) && (now - bTime) > ONE_MONTH_MS) {
          continue;
        }

        list.push({
          ...b,
          notifTimestamp: notif.timestamp
        });
      }
    }

    // Sort: Newest first (descending by timestamp)
    list.sort((a, b) => {
      const timeA = new Date(a.created_at || a.notifTimestamp || 0).getTime();
      const timeB = new Date(b.created_at || b.notifTimestamp || 0).getTime();
      return timeB - timeA;
    });

    return list;
  }, [notifications]);

  // Unique regions among available buildings for quick filter chips
  const regionOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of validBuildings) {
      const reg = b.region_soato || 'other';
      map.set(reg, (map.get(reg) || 0) + 1);
    }
    return Array.from(map.entries()).map(([soato, count]) => ({
      soato,
      name: getRegionName(soato) || 'Boshqa',
      count
    }));
  }, [validBuildings]);

  // Filtered by selected region chip
  const displayedBuildings = useMemo(() => {
    if (selectedRegion === 'all') return validBuildings;
    return validBuildings.filter(b => b.region_soato === selectedRegion);
  }, [validBuildings, selectedRegion]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[2500] flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-slate-50 h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sleek Minimal Header */}
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shadow-blue-500/25">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Yangi TJM-lar
                </h3>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-full">
                  {validBuildings.length} ta
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Oxirgi 30 kunda qo'shilgan yangi binolar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Barchasini o'qilgan deb belgilash"
              >
                <Check className="w-3.5 h-3.5" />
                <span>O'qildi</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Yopish"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Region Filter Chips (only if more than 1 region exists) */}
        {regionOptions.length > 1 && (
          <div className="px-4 py-2.5 bg-white border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-xs">
            <button
              type="button"
              onClick={() => setSelectedRegion('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedRegion === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Barchasi ({validBuildings.length})
            </button>
            {regionOptions.map((r) => (
              <button
                key={r.soato}
                type="button"
                onClick={() => setSelectedRegion(r.soato)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedRegion === r.soato
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r.name} ({r.count})
              </button>
            ))}
          </div>
        )}

        {/* Clean Feed: Newest at top, Oldest at bottom */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {displayedBuildings.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
                <Building2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-600">
                Yangi obyektlar mavjud emas
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                Oxirgi 30 kun ichida yangi TJM kiritilmagan.
              </p>
            </div>
          ) : (
            displayedBuildings.map((building, idx) => {
              const regName = building.region_name || getRegionName(building.region_soato) || 'O\'zbekiston';
              const dateObj = building.created_at ? new Date(building.created_at) : null;
              const formattedDate = dateObj && !isNaN(dateObj.getTime())
                ? dateObj.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })
                : 'Yangi';

              return (
                <div
                  key={building.source_id || idx}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col gap-2.5"
                >
                  {/* Top line: Region Badge & Date */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 text-[10px] font-bold">
                        {regName}
                      </span>
                      {building.district_name && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          {building.district_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium shrink-0">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Building Name */}
                  <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                    {building.object_name}
                  </h4>

                  {/* Address */}
                  {building.address && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{building.address}</span>
                    </div>
                  )}

                  {/* Quick Metadata: Floors & Apartments */}
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 flex-wrap">
                    {building.floors && (
                      <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md font-semibold text-slate-700">
                        🏢 {building.floors} qavat
                      </span>
                    )}
                    {building.apartment_count && (
                      <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md text-slate-600">
                        🚪 {building.apartment_count} xonadon
                      </span>
                    )}
                    {building.customer && (
                      <span className="text-[10px] text-slate-400 truncate max-w-[180px]">
                        {building.customer}
                      </span>
                    )}
                  </div>

                  {/* Action Button: Xaritada ko'rish */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectBuilding(building);
                        onClose();
                      }}
                      className="w-full sm:w-auto px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Xaritada ko'rish</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
