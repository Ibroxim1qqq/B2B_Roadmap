'use client';
import { useState } from 'react';
import { 
  Bell, X, Check, Building2, MapPin, Layers, 
  ExternalLink, Calendar, ChevronRight, Sparkles, Filter
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
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('all');
  const [expandedNotifId, setExpandedNotifId] = useState<string | null>(
    notifications.length > 0 ? notifications[0].id : null
  );

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[2500] flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shadow-blue-500/20">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Bildirishnomalar
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-rose-500 text-white text-[11px] font-bold rounded-full">
                    {unreadCount} ta yangi
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Haftalik yangi qo'shilgan TJM-lar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Barchasini o'qilgan deb belgilash"
              >
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">O'qildi</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-200/70 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {notifications.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Bell className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 mb-1">
                Yangi bildirishnomalar yo'q
              </h4>
              <p className="text-xs text-slate-400 max-w-xs">
                O'zbekiston bo'ylab ko'p qavatli uy-joylar monitoringi har dushanba kuni avtomatik yangilanib boradi.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isExpanded = expandedNotifId === notif.id;
              const dateStr = notif.timestamp ? new Date(notif.timestamp).toLocaleDateString('uz-UZ', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Yaqinda';

              // Filter buildings by region if selected
              const buildings = notif.new_objects || [];
              const filteredBuildings = selectedRegionFilter === 'all' 
                ? buildings 
                : buildings.filter(b => b.region_soato === selectedRegionFilter);

              return (
                <div 
                  key={notif.id}
                  className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition-shadow"
                >
                  {/* Card Header */}
                  <div 
                    onClick={() => setExpandedNotifId(isExpanded ? null : notif.id)}
                    className="p-4 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/40 flex items-start justify-between cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 leading-snug">
                            {notif.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{dateStr}</span>
                          <span>•</span>
                          <span className="font-semibold text-blue-600">
                            {notif.new_count || buildings.length} ta yangi TJM
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>

                  {/* Region Summary Badges */}
                  {notif.by_region && Object.keys(notif.by_region).length > 0 && (
                    <div className="px-4 py-2 bg-slate-50/80 border-t border-b border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-slate-400 font-medium">Viloyatlar:</span>
                      {Object.entries(notif.by_region).map(([soato, count]) => {
                        const name = getRegionName(soato);
                        const isFiltered = selectedRegionFilter === soato;
                        return (
                          <button
                            key={soato}
                            type="button"
                            onClick={() => setSelectedRegionFilter(isFiltered ? 'all' : soato)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                              isFiltered 
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                            }`}
                          >
                            <span>{name}: {count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Expanded Objects List */}
                  {isExpanded && (
                    <div className="p-3 divide-y divide-slate-100 bg-white">
                      {filteredBuildings.length === 0 ? (
                        <p className="text-xs text-slate-400 p-2 text-center">
                          Bu viloyat bo'yicha obyektlar yo'q
                        </p>
                      ) : (
                        filteredBuildings.map((building) => (
                          <div 
                            key={building.source_id}
                            className="py-3 px-1 hover:bg-slate-50/70 rounded-xl transition-colors flex flex-col gap-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                                    {building.region_name || getRegionName(building.region_soato)}
                                  </span>
                                  {building.district_name && (
                                    <span className="text-[11px] text-slate-500 font-medium">
                                      {building.district_name}
                                    </span>
                                  )}
                                </div>
                                <h5 className="text-xs font-bold text-slate-800 line-clamp-2 mt-1 leading-snug">
                                  {building.object_name}
                                </h5>
                                {building.address && (
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{building.address}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Details Row & Map Action */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                              <div className="flex items-center gap-3 text-slate-500">
                                {building.floors && (
                                  <span className="flex items-center gap-1 font-semibold">
                                    <Layers className="w-3 h-3 text-slate-400" />
                                    <span>{building.floors} qavat</span>
                                  </span>
                                )}
                                {building.apartment_count && (
                                  <span className="flex items-center gap-1">
                                    <span>🚪 {building.apartment_count} ta xonadon</span>
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  onSelectBuilding(building);
                                  onClose();
                                }}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-[11px] font-bold shadow-xs shadow-blue-500/20 flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <span>Xaritada ko'rish</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info banner */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Haftalik yangilanish: Har dushanba 08:00 (O'zbekiston bo'ylab)</span>
        </div>
      </div>
    </div>
  );
}
