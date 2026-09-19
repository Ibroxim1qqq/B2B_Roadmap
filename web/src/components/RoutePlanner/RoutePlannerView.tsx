'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MapObject } from '../../lib/types';
import { 
  calculateOSRMRoute, findTJMsAlongRoute, RouteResult, TJMAlongRoute, 
  formatDistance, formatDuration 
} from '../../lib/routeUtils';
import { 
  Navigation, MapPin, ArrowDownUp, Search, Compass, 
  CheckCircle2, Clock, Phone, ChevronRight, Eye, Layers, 
  Route as RouteIcon, Sparkles, Check, Crosshair, X, LocateFixed
} from 'lucide-react';
import { getCallUrl } from '../../lib/utils';

// Dynamic import for Leaflet map (SSR disabled)
const RoutePlannerMap = dynamic(() => import('./RoutePlannerMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <div className="text-slate-500 font-semibold text-xs flex items-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
        <span>Marshrut xaritasi yuklanmoqda...</span>
      </div>
    </div>
  )
});

interface RoutePlannerViewProps {
  objects: MapObject[];
  userLat?: number | null;
  userLng?: number | null;
  onSelectObject: (id: string) => void;
  selectedId: string | null;
  onRecordVisit?: (id: string) => Promise<void>;
}

export default function RoutePlannerView({
  objects,
  userLat,
  userLng,
  onSelectObject,
  selectedId,
  onRecordVisit
}: RoutePlannerViewProps) {
  // Point A (Start) & Point B (End)
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [startPoint, setStartPoint] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [endPoint, setEndPoint] = useState<{ lat: number; lng: number; name: string } | null>(null);
  
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  // Picking mode: 'A' or 'B' or null
  const [pickingMode, setPickingMode] = useState<'A' | 'B' | null>(null);

  // Buffer Radius (default: 200m)
  const [bufferRadius, setBufferRadius] = useState<number>(200);
  const [showAllMarkers, setShowAllMarkers] = useState<boolean>(false);

  // Calculation state
  const [calculating, setCalculating] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [matchedTJMs, setMatchedTJMs] = useState<TJMAlongRoute[]>([]);
  const [activeMobileTab, setActiveMobileTab] = useState<'list' | 'map'>('list');

  // 1. Automatically acquire user's live GPS location for Point A on mount
  useEffect(() => {
    // If parent already gave userLat/userLng, use it directly
    if (userLat && userLng) {
      setStartPoint({
        lat: userLat,
        lng: userLng,
        name: 'Mening joriy joylashuvim (GPS)'
      });
      setStartQuery('Mening joriy joylashuvim (GPS)');
    } else if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setStartPoint({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            name: 'Mening joriy joylashuvim (GPS)'
          });
          setStartQuery('Mening joriy joylashuvim (GPS)');
        },
        (err) => {
          console.warn('Geolocation error or denied:', err);
          // Fallback to central Samarkand point if location not granted
          if (!startPoint) {
            setStartPoint({
              lat: 39.6542,
              lng: 66.9597,
              name: 'Samarqand markazi (Registon)'
            });
            setStartQuery('Samarqand markazi (Registon)');
          }
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    // Default destination: target first or prominent object if none selected
    if (!endPoint && objects.length > 1) {
      const target = objects[5] || objects[1];
      setEndPoint({
        lat: target.latitude,
        lng: target.longitude,
        name: target.tjm_name || target.object_name
      });
      setEndQuery(target.tjm_name || target.object_name);
    }
  }, [userLat, userLng, objects]);

  // Filtered dropdown suggestions
  const startSuggestions = useMemo(() => {
    if (!startQuery.trim()) return objects.slice(0, 8);
    const q = startQuery.toLowerCase();
    return objects.filter(o => 
      (o.tjm_name || '').toLowerCase().includes(q) || 
      (o.object_name || '').toLowerCase().includes(q) ||
      (o.address || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [objects, startQuery]);

  const endSuggestions = useMemo(() => {
    if (!endQuery.trim()) return objects.slice(0, 8);
    const q = endQuery.toLowerCase();
    return objects.filter(o => 
      (o.tjm_name || '').toLowerCase().includes(q) || 
      (o.object_name || '').toLowerCase().includes(q) ||
      (o.address || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [objects, endQuery]);

  // Calculate Route
  const handleCalculateRoute = useCallback(async (
    customStart = startPoint,
    customEnd = endPoint
  ) => {
    if (!customStart || !customEnd) return;

    setCalculating(true);
    try {
      const res = await calculateOSRMRoute(
        customStart.lat,
        customStart.lng,
        customEnd.lat,
        customEnd.lng
      );

      setRouteResult(res);

      // Find TJMs along this route within the selected radius
      const found = findTJMsAlongRoute(objects, res.coordinates, bufferRadius);
      setMatchedTJMs(found);
    } catch (e) {
      console.error(e);
    } finally {
      setCalculating(false);
    }
  }, [startPoint, endPoint, objects, bufferRadius]);

  // Re-run matching when buffer radius changes
  useEffect(() => {
    if (routeResult && routeResult.coordinates.length > 0) {
      const found = findTJMsAlongRoute(objects, routeResult.coordinates, bufferRadius);
      setMatchedTJMs(found);
    }
  }, [bufferRadius, routeResult, objects]);

  // Trigger calculation when start or end points change
  useEffect(() => {
    if (startPoint && endPoint) {
      handleCalculateRoute(startPoint, endPoint);
    }
  }, [startPoint?.lat, startPoint?.lng, endPoint?.lat, endPoint?.lng]);

  // Swap Point A and Point B
  const handleSwap = () => {
    const tempPt = startPoint;
    const tempQ = startQuery;
    setStartPoint(endPoint);
    setStartQuery(endQuery);
    setEndPoint(tempPt);
    setEndQuery(tempQ);
  };

  // Set Start Point to Live GPS
  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const pt = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            name: 'Mening joriy joylashuvim (GPS)'
          };
          setStartPoint(pt);
          setStartQuery(pt.name);
          setIsStartOpen(false);
        },
        () => {
          if (userLat && userLng) {
            const pt = {
              lat: userLat,
              lng: userLng,
              name: 'Mening joriy joylashuvim (GPS)'
            };
            setStartPoint(pt);
            setStartQuery(pt.name);
            setIsStartOpen(false);
          } else {
            alert('Joylashuvingiz aniqlanmadi. Iltimos, brauzerda geolokatsiyaga ruxsat bering.');
          }
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  // Handle map click picking
  const handleMapClick = (lat: number, lng: number) => {
    // Find if click is near any existing object (within 60 meters)
    const nearby = objects.find(o => {
      if (!o.latitude || !o.longitude) return false;
      const dLat = (o.latitude - lat) * 111000;
      const dLng = (o.longitude - lng) * 111000 * Math.cos(lat * Math.PI / 180);
      return Math.sqrt(dLat * dLat + dLng * dLng) < 60;
    });

    const pointName = nearby 
      ? (nearby.tjm_name || nearby.object_name) 
      : `Xaritadagi nuqta (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

    if (pickingMode === 'A') {
      const pt = { lat, lng, name: pointName };
      setStartPoint(pt);
      setStartQuery(pointName);
      setPickingMode(null);
    } else if (pickingMode === 'B') {
      const pt = { lat, lng, name: pointName };
      setEndPoint(pt);
      setEndQuery(pointName);
      setPickingMode(null);
    }
  };

  // Handle setting point directly from an object (popup or list)
  const handleSetPointFromObject = (obj: MapObject, pointType: 'A' | 'B') => {
    const pt = {
      lat: obj.latitude,
      lng: obj.longitude,
      name: obj.tjm_name || obj.object_name
    };

    if (pointType === 'A') {
      setStartPoint(pt);
      setStartQuery(pt.name);
      setPickingMode(null);
    } else {
      setEndPoint(pt);
      setEndQuery(pt.name);
      setPickingMode(null);
    }
  };

  // Handle Dragging Pin A
  const handleDragStartPoint = (lat: number, lng: number) => {
    const pt = {
      lat,
      lng,
      name: `Ko'chirilgan A nuqta (${lat.toFixed(4)}, ${lng.toFixed(4)})`
    };
    setStartPoint(pt);
    setStartQuery(pt.name);
  };

  // Handle Dragging Pin B
  const handleDragEndPoint = (lat: number, lng: number) => {
    const pt = {
      lat,
      lng,
      name: `Ko'chirilgan B nuqta (${lat.toFixed(4)}, ${lng.toFixed(4)})`
    };
    setEndPoint(pt);
    setEndQuery(pt.name);
  };

  // Enter Picking Mode (activates map on mobile too)
  const triggerPickingMode = (mode: 'A' | 'B') => {
    setPickingMode(mode);
    setIsStartOpen(false);
    setIsEndOpen(false);
    setActiveMobileTab('map');
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full min-w-0 bg-slate-100 overflow-hidden">
      {/* 1. Left Panel: Inputs & Route Results List */}
      <div className={`w-full md:w-[420px] lg:w-[460px] h-full flex flex-col bg-white border-r border-slate-200 z-20 shrink-0 shadow-sm ${
        activeMobileTab === 'map' ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Top Header Card */}
        <div className="p-4 border-b border-slate-100 bg-white space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shadow-blue-500/20">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">Yo'l-yo'lakay Navigator</h2>
                <p className="text-[11px] text-slate-400">Marshrut yo'li ustidagi barcha TJM-lar</p>
              </div>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex md:hidden bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveMobileTab('list')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  activeMobileTab === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                Ro'yxat
              </button>
              <button
                onClick={() => setActiveMobileTab('map')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  activeMobileTab === 'map' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                Xarita
              </button>
            </div>
          </div>

          {/* Form: Start & Destination Inputs */}
          <div className="space-y-2 relative">
            {/* Point A (Start) */}
            <div className="relative">
              <div className={`flex items-center gap-2 bg-slate-50 border rounded-xl px-3 py-2 text-xs transition-all ${
                pickingMode === 'A' 
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/50' 
                  : 'border-slate-200 focus-within:border-emerald-500 focus-within:bg-white'
              }`}>
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                  A
                </span>
                
                <input
                  type="text"
                  placeholder="Boshlanish manzili (Hozirgi turgan joyingiz)..."
                  value={startQuery}
                  onFocus={() => setIsStartOpen(true)}
                  onChange={(e) => {
                    setStartQuery(e.target.value);
                    setIsStartOpen(true);
                  }}
                  className="w-full bg-transparent outline-none font-medium text-slate-800 placeholder:text-slate-400"
                />

                {startQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartQuery('');
                      setStartPoint(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                    title="Tozalash"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* GPS Button */}
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/80 px-2 py-1 rounded-lg border border-emerald-300 flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                  title="Hozirgi GPS joylashuvimni olish"
                >
                  <LocateFixed className="w-3 h-3 text-emerald-600" />
                  <span className="hidden sm:inline">GPS</span>
                </button>

                {/* Pick on Map Button */}
                <button
                  type="button"
                  onClick={() => triggerPickingMode('A')}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 shrink-0 cursor-pointer transition-colors ${
                    pickingMode === 'A'
                      ? 'bg-emerald-600 text-white border-emerald-600 animate-pulse'
                      : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300'
                  }`}
                  title="Xaritadan belgilash"
                >
                  <Crosshair className="w-3 h-3 text-emerald-600" />
                  <span>Xarita</span>
                </button>
              </div>

              {/* Start Dropdown */}
              {isStartOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto p-1.5 space-y-1">
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-emerald-50 text-emerald-700 font-bold flex items-center gap-2 cursor-pointer border-b border-slate-100"
                  >
                    <LocateFixed className="w-3.5 h-3.5 text-emerald-600" />
                    <span>📍 Mening joriy joylashuvim (GPS)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerPickingMode('A')}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-blue-50 text-blue-700 font-bold flex items-center gap-2 cursor-pointer border-b border-slate-100"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                    <span>🗺️ Xaritadan belgilash</span>
                  </button>

                  {startSuggestions.map(obj => (
                    <button
                      key={obj.source_id}
                      type="button"
                      onClick={() => {
                        handleSetPointFromObject(obj, 'A');
                        setIsStartOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-slate-50 text-slate-800 font-medium flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="truncate">{obj.tjm_name || obj.object_name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{obj.district_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Swap Button (Floating) */}
            <div className="flex items-center justify-center -my-1 relative z-10">
              <button
                type="button"
                onClick={handleSwap}
                className="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 shadow-xs flex items-center justify-center transition-all cursor-pointer"
                title="A va B o'rnini almashtirish"
              >
                <ArrowDownUp className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Point B (Destination) */}
            <div className="relative">
              <div className={`flex items-center gap-2 bg-slate-50 border rounded-xl px-3 py-2 text-xs transition-all ${
                pickingMode === 'B' 
                  ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/50' 
                  : 'border-slate-200 focus-within:border-rose-500 focus-within:bg-white'
              }`}>
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                  B
                </span>

                <input
                  type="text"
                  placeholder="Borish manzili (TJM nomi yoki manzil)..."
                  value={endQuery}
                  onFocus={() => setIsEndOpen(true)}
                  onChange={(e) => {
                    setEndQuery(e.target.value);
                    setIsEndOpen(true);
                  }}
                  className="w-full bg-transparent outline-none font-medium text-slate-800 placeholder:text-slate-400"
                />

                {endQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setEndQuery('');
                      setEndPoint(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                    title="Tozalash"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Pick on Map Button */}
                <button
                  type="button"
                  onClick={() => triggerPickingMode('B')}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 shrink-0 cursor-pointer transition-colors ${
                    pickingMode === 'B'
                      ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                      : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300'
                  }`}
                  title="Xaritadan belgilash"
                >
                  <Crosshair className="w-3 h-3 text-rose-600" />
                  <span>Xarita</span>
                </button>
              </div>

              {/* End Dropdown */}
              {isEndOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto p-1.5 space-y-1">
                  <button
                    type="button"
                    onClick={() => triggerPickingMode('B')}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-rose-50 text-rose-700 font-bold flex items-center gap-2 cursor-pointer border-b border-slate-100"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-rose-600" />
                    <span>🗺️ Xaritadan belgilash</span>
                  </button>

                  {endSuggestions.map(obj => (
                    <button
                      key={obj.source_id}
                      type="button"
                      onClick={() => {
                        handleSetPointFromObject(obj, 'B');
                        setIsEndOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-slate-50 text-slate-800 font-medium flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="truncate">{obj.tjm_name || obj.object_name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{obj.district_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Radius and Action Controls */}
            <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-slate-500 mr-1">Radius:</span>
                {[100, 200, 500].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setBufferRadius(r)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      bufferRadius === r
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {r} m
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleCalculateRoute(startPoint, endPoint)}
                disabled={calculating || !startPoint || !endPoint}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer ml-auto"
              >
                <RouteIcon className="w-3.5 h-3.5" />
                <span>{calculating ? 'Hisoblanmoqda...' : 'Marshrut'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Route Stats Summary Banner */}
        {routeResult && (
          <div className="p-3 bg-blue-50/70 border-b border-blue-100 shrink-0">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-xl border border-blue-100/80 shadow-2xs">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Masofa</p>
                <p className="text-xs font-black text-blue-700 mt-0.5">
                  {formatDistance(routeResult.distanceMeters)}
                </p>
              </div>
              <div className="bg-white p-2 rounded-xl border border-blue-100/80 shadow-2xs">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Vaqt</p>
                <p className="text-xs font-black text-blue-700 mt-0.5">
                  {formatDuration(routeResult.durationSeconds)}
                </p>
              </div>
              <div className="bg-white p-2 rounded-xl border border-blue-100/80 shadow-2xs">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Yo'ldagi TJM</p>
                <p className="text-xs font-black text-emerald-600 mt-0.5">
                  {matchedTJMs.length} ta
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Matched TJMs List Header */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs shrink-0">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Yo'l bo'yidagi TJM-lar ({matchedTJMs.length})</span>
          </span>
          <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={showAllMarkers}
              onChange={(e) => setShowAllMarkers(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Boshqalarni ham ko'rsatish</span>
          </label>
        </div>

        {/* Scrollable List of TJMs along Route */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {matchedTJMs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Compass className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-medium">
                Tanlangan marshrutdan {bufferRadius} metr radiusda TJM topilmadi.
              </p>
              <p className="text-[11px] text-slate-400">
                Radiusni 500 metrga oshirib ko'ring yoki boshqa manzilni tanlang.
              </p>
            </div>
          ) : (
            matchedTJMs.map((item) => {
              const { object: obj, orderNumber, distFromRoadMeters, distAlongRouteMeters } = item;
              const isSelected = selectedId === obj.source_id;
              const isVisited = Boolean(obj.is_visited || obj.last_visit);

              return (
                <div
                  key={obj.source_id}
                  onClick={() => onSelectObject(obj.source_id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-400 shadow-sm ring-2 ring-blue-500/10'
                      : 'bg-white hover:bg-slate-50/90 border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Order Number Badge */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white shrink-0 shadow-2xs ${
                      isVisited ? 'bg-emerald-600' : 'bg-blue-600'
                    }`}>
                      #{orderNumber}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-bold text-xs text-slate-900 truncate">
                          {obj.tjm_name || obj.object_name}
                        </h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isVisited 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isVisited ? 'Borilgan' : 'Borilmagan'}
                        </span>
                      </div>

                      {/* Distance Badges */}
                      <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px]">
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          Yo'l boshidan: {formatDistance(distAlongRouteMeters)}
                        </span>
                        <span className="text-slate-500">
                          Yo'ldan: <b className="text-slate-700">{distFromRoadMeters} m</b>
                        </span>
                      </div>

                      {/* Contact & Action Row */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        {obj.phone ? (
                          <a
                            href={getCallUrl(obj.phone)}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{obj.phone}</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Telefon kiritilmagan</span>
                        )}

                        <div className="flex items-center gap-1">
                          {onRecordVisit && !isVisited && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRecordVisit(obj.source_id);
                              }}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Tashrif</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectObject(obj.source_id);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Batafsil ma'lumot"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Right Panel: Interactive Route Map */}
      <div className={`flex-1 h-full relative ${
        activeMobileTab === 'list' ? 'hidden md:block' : 'block'
      }`}>
        <RoutePlannerMap
          startPoint={startPoint}
          endPoint={endPoint}
          routeCoords={routeResult ? routeResult.coordinates : []}
          matchedTJMs={matchedTJMs}
          bufferRadiusMeters={bufferRadius}
          allObjects={objects}
          selectedTJMId={selectedId}
          onSelectTJM={onSelectObject}
          showAllMarkers={showAllMarkers}
          pickingMode={pickingMode}
          onMapClick={handleMapClick}
          onDragStartPoint={handleDragStartPoint}
          onDragEndPoint={handleDragEndPoint}
          onSetPointFromObject={handleSetPointFromObject}
          onCancelPicking={() => setPickingMode(null)}
        />

        {/* Mobile Switch to List button (Floating) */}
        <div className="md:hidden absolute bottom-4 left-4 z-[400]">
          <button
            onClick={() => setActiveMobileTab('list')}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5"
          >
            <Compass className="w-4 h-4" />
            <span>Ro'yxatni ko'rish ({matchedTJMs.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
