'use client';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { MapObject, UserProfile, SavedRoute, AIRouteRecommendation } from '../../lib/types';
import { api, isUysotCompany } from '../../lib/api';
import { getCurrentUser } from '../../lib/auth';
import AIRouteModal from './AIRouteModal';
import { 
  calculateOSRMRoute, calculateOSRMRouteMulti, findTJMsAlongRoute, RouteResult, TJMAlongRoute, 
  formatDistance, formatDuration, haversineMeters 
} from '../../lib/routeUtils';
import { 
  Navigation, MapPin, ArrowDownUp, Search, Compass, SlidersHorizontal, Plus,
  CheckCircle2, Clock, Phone, ChevronRight, Eye, Layers, 
  Route as RouteIcon, Sparkles, Check, Crosshair, X, LocateFixed, RotateCcw,
  BookmarkCheck, Bookmark, Calendar, Building2, User, Loader2,
  ChevronUp, ChevronDown
} from 'lucide-react';


import { getCallUrl, getYandexNavUrl, getNavigationUrl } from '../../lib/utils';

// Dynamic import for Leaflet map (SSR disabled)
const RoutePlannerMap = dynamic(() => import('./RoutePlannerMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <div className="text-slate-500 font-semibold text-xs flex items-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-[#1b815f] border-t-transparent animate-spin"></div>
        <span>Marshrut xaritasi yuklanmoqda...</span>
      </div>
    </div>
  )
});

interface RoutePlannerViewProps {
  objects: MapObject[];
  filteredObjects?: MapObject[];
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  userLat?: number | null;
  userLng?: number | null;
  onSelectObject: (id: string) => void;
  selectedId: string | null;
  onRecordVisit?: (id: string) => Promise<void>;
  currentUser?: UserProfile | null;
  companyId?: string;
  initialAIStops?: AIRouteRecommendation[] | null;
}

const REGISTON_LAT = 39.6542;
const REGISTON_LNG = 66.9597;

function getAccountRouteStorageKey(user?: UserProfile | null): string {
  if (user) {
    const accountId = user.user_id || user.id || user.login || 'default_user';
    return `b2b_active_route_${accountId}`;
  }
  return 'b2b_active_route_guest';
}

interface RoutePoint {
  lat: number;
  lng: number;
  name: string;
  source_id?: string;
}

interface PointFieldProps {
  kind: 'A' | 'B' | 'via';
  query: string;
  placeholder: string;
  isOpen: boolean;
  isPicking: boolean;
  onQueryChange: (value: string) => void;
  onFocus: () => void;
  onClear: () => void;
  onPick: () => void;
  onUseLocation?: () => void;
  children?: React.ReactNode;
}

function PointField({
  kind, query, placeholder, isOpen, isPicking, onQueryChange, onFocus, onClear, onPick, onUseLocation, children
}: PointFieldProps) {
  return (
    <div className="relative">
      <div className={`flex items-center gap-2 h-10 px-3 rounded-lg bg-slate-50 border transition-colors ${
        isPicking ? 'border-[#1b815f] bg-white' : 'border-transparent focus-within:border-slate-300 focus-within:bg-white'
      }`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${kind === 'A' ? 'bg-[#1b815f]' : kind === 'B' ? 'bg-slate-900' : 'bg-slate-400'}`} />
        <input
          type="text"
          aria-label={kind === 'A' ? 'Qayerdan' : kind === 'B' ? 'Qayerga' : "Oraliq nuqta"}
          placeholder={placeholder}
          value={query}
          onFocus={onFocus}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full min-w-0 bg-transparent outline-none text-[13px] text-slate-900 placeholder:text-slate-400"
        />
        {query && (
          <button type="button" onClick={onClear} title="Tozalash" className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {onUseLocation && (
          <button type="button" onClick={onUseLocation} title="Mening joylashuvim" className="p-1 text-slate-400 hover:text-[#1b815f] cursor-pointer shrink-0">
            <LocateFixed className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onPick}
          title="Xaritadan tanlash"
          className={`p-1 cursor-pointer shrink-0 ${isPicking ? 'text-[#1b815f]' : 'text-slate-400 hover:text-[#1b815f]'}`}
        >
          <MapPin className="w-4 h-4" />
        </button>
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto py-1">
          {children}
        </div>
      )}
    </div>
  );
}

const OPTION_CLASS = 'w-full text-left px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 flex items-center justify-between gap-2 cursor-pointer';

export default function RoutePlannerView({
  objects: rawObjects,
  filteredObjects,
  onOpenFilters,
  activeFilterCount = 0,
  userLat,
  userLng,
  onSelectObject,
  selectedId,
  onRecordVisit,
  currentUser,
  companyId,
  initialAIStops
}: RoutePlannerViewProps) {
  // Multi-Company User Context
  const [activeUser, setActiveUser] = useState<UserProfile | null>(currentUser || null);
  useEffect(() => {
    if (currentUser) {
      setActiveUser(currentUser);
    } else {
      const u = getCurrentUser();
      if (u) setActiveUser(u);
    }
  }, [currentUser]);

  const isUysot = isUysotCompany(companyId || activeUser?.company_id);
  const inDataset = useCallback((o: MapObject) => {
    const isDomtut = String(o.source_id).startsWith('domtut_') || Boolean((o as any).is_uysot);
    return isUysot ? isDomtut : !isDomtut;
  }, [isUysot]);
  // Any object can be a start or end point; only those matching the filters count as stops and map markers.
  const objects = useMemo(() => (rawObjects || []).filter(inDataset), [rawObjects, inDataset]);
  const stopObjects = useMemo(() => (filteredObjects || rawObjects || []).filter(inDataset), [filteredObjects, rawObjects, inDataset]);

  // Route persistence per account
  const [isStorageInitialized, setIsStorageInitialized] = useState(false);

  // Route saving & Saved routes modal state
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [showSavedRoutesModal, setShowSavedRoutesModal] = useState(false);
  const [showAIRouteModal, setShowAIRouteModal] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [loadingSavedRoutes, setLoadingSavedRoutes] = useState(false);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const [aiPlannedStops, setAiPlannedStops] = useState<AIRouteRecommendation[] | null>(null);
  const [mobileActiveStopIndex, setMobileActiveStopIndex] = useState(0);
  const [showMobileStopsDrawer, setShowMobileStopsDrawer] = useState(false);
  const [isMobileControlsCollapsed, setIsMobileControlsCollapsed] = useState(false);

  // Helper to guarantee AI recommended stops appear even if slightly offset from road polyline
  const mergeAIStopsWithBufferTJMs = useCallback((
    baseTJMs: TJMAlongRoute[],
    aiStops: AIRouteRecommendation[] | null
  ): TJMAlongRoute[] => {
    if (!aiStops || aiStops.length === 0) return baseTJMs;

    const existingIds = new Set<string>();
    const guaranteedStops: TJMAlongRoute[] = [];

    // 1. Add all planned AI stops in their designated sequence
    aiStops.forEach((stop, index) => {
      const matchedObj = objects.find(o => String(o.source_id) === String(stop.source_id));
      if (matchedObj) {
        existingIds.add(String(matchedObj.source_id));
        guaranteedStops.push({
          object: matchedObj,
          orderNumber: index + 1,
          distFromRoadMeters: 0,
          distAlongRouteMeters: index * 1000
        });
      }
    });

    // 2. Add other buildings along the road buffer
    let nextOrder = guaranteedStops.length + 1;
    const additional: TJMAlongRoute[] = [];
    baseTJMs.forEach(t => {
      if (!existingIds.has(String(t.object.source_id))) {
        additional.push({
          ...t,
          orderNumber: nextOrder++
        });
      }
    });

    return guaranteedStops.length > 0 ? [...guaranteedStops, ...additional] : baseTJMs;
  }, [objects]);

  // Apply AI Generated Route with multi-point waypoints
  const handleApplyAIRoute = async (stops: AIRouteRecommendation[]) => {
    if (!stops || stops.length === 0) return;
    setAiPlannedStops(stops);

    const centerLat = isUysot ? 41.2995 : REGISTON_LAT;
    const centerLng = isUysot ? 69.2401 : REGISTON_LNG;

    const hasLocation = Boolean(userLat && userLng);
    const startPt = (userLat && userLng) ? {
      lat: userLat,
      lng: userLng,
      name: 'Mening joriy joylashuvim (GPS)'
    } : {
      lat: stops[0].latitude || centerLat,
      lng: stops[0].longitude || centerLng,
      name: stops[0].object_name
    };

    const lastStop = stops[stops.length - 1];
    const endPt = {
      lat: lastStop.latitude || (stops[0].latitude || centerLat),
      lng: lastStop.longitude || (stops[0].longitude || centerLng),
      name: lastStop.object_name
    };

    setStartPoint(startPt);
    setStartQuery(startPt.name);
    setEndPoint(endPt);
    setEndQuery(endPt.name);
    // The route itself is calculated by the effect that watches the points.
    setViaPoints(stops.slice(hasLocation ? 0 : 1, -1).filter(s => s.latitude && s.longitude).map(s => ({
      lat: s.latitude as number,
      lng: s.longitude as number,
      name: s.object_name,
      source_id: String(s.source_id)
    })));
  };

  // React to initialAIStops passed from parent
  useEffect(() => {
    if (initialAIStops && initialAIStops.length > 0) {
      handleApplyAIRoute(initialAIStops);
    }
  }, [initialAIStops]);

  // Point A (Start) & Point B (End)
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [startPoint, setStartPoint] = useState<{ lat: number; lng: number; name: string } | null>(null);
  
  // DEFAULT: Destination (Point B) is completely empty! No TJM is auto-selected!
  const [endPoint, setEndPoint] = useState<{ lat: number; lng: number; name: string } | null>(null);

  // Optional points between A and B, as many as the user wants
  const [viaPoints, setViaPoints] = useState<RoutePoint[]>([]);
  const [isAddingVia, setIsAddingVia] = useState(false);
  const [viaQuery, setViaQuery] = useState('');
  const [isViaOpen, setIsViaOpen] = useState(false);
  const viaKey = viaPoints.map(p => `${p.lat},${p.lng}`).join(';');
  
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  // Picking mode: 'A' or 'B' or null
  const [pickingMode, setPickingMode] = useState<'A' | 'B' | 'via' | null>(null);

  // Buffer Radius (default: 200m)
  const [bufferRadius, setBufferRadius] = useState<number>(200);
  const [showAllMarkers, setShowAllMarkers] = useState<boolean>(false);

  // Calculation state - Starts as null!
  const [calculating, setCalculating] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [matchedTJMs, setMatchedTJMs] = useState<TJMAlongRoute[]>([]);

  // Mobile drawer filter & swipe state
  const [stopsDrawerFilter, setStopsDrawerFilter] = useState<'all' | 'unvisited' | 'phone' | 'priority'>('all');
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const triggerHaptic = useCallback((ms = 25) => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && (navigator as any).vibrate) {
      try { (navigator as any).vibrate(ms); } catch (_) {}
    }
  }, []);

  // Filtered stops for mobile stops drawer
  const filteredDrawerStops = useMemo(() => {
    if (stopsDrawerFilter === 'unvisited') {
      return matchedTJMs.filter(t => !t.object.last_visit && !Boolean((t.object as any).is_visited));
    }
    if (stopsDrawerFilter === 'phone') {
      return matchedTJMs.filter(t => Boolean(t.object.phone));
    }
    if (stopsDrawerFilter === 'priority') {
      return matchedTJMs.filter(t => (t.object.priority || '').toLowerCase().includes('yuqori'));
    }
    return matchedTJMs;
  }, [matchedTJMs, stopsDrawerFilter]);

  // Touch swipe handlers for active stop card
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0 && mobileActiveStopIndex < matchedTJMs.length - 1) {
        triggerHaptic(20);
        const nextIdx = mobileActiveStopIndex + 1;
        setMobileActiveStopIndex(nextIdx);
      } else if (dx > 0 && mobileActiveStopIndex > 0) {
        triggerHaptic(20);
        const prevIdx = mobileActiveStopIndex - 1;
        setMobileActiveStopIndex(prevIdx);
      }
    } else if (dy < -45 && Math.abs(dy) > Math.abs(dx)) {
      triggerHaptic(25);
      setShowMobileStopsDrawer(true);
    }
  };

  // Real-time In-Car Navigation mode (Yandex "Поехали" / Google Maps "Start")
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [showSidebarInNav, setShowSidebarInNav] = useState<boolean>(false);

  // Default: Start Point and End Point are BOTH null initially!
  // First click on map selects Point A, second click selects Point B!

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

  const viaSuggestions = useMemo(() => {
    if (!viaQuery.trim()) return objects.slice(0, 8);
    const q = viaQuery.toLowerCase();
    return objects.filter(o =>
      (o.tjm_name || '').toLowerCase().includes(q) ||
      (o.object_name || '').toLowerCase().includes(q) ||
      (o.address || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [objects, viaQuery]);

  // Calculate Route
  const handleCalculateRoute = useCallback(async (
    customStart = startPoint,
    customEnd = endPoint,
    customVia = viaPoints
  ) => {
    if (!customStart || !customEnd) return;

    setCalculating(true);
    try {
      const res = await calculateOSRMRouteMulti([customStart, ...customVia, customEnd].map(p => ({ lat: p.lat, lng: p.lng })));

      setRouteResult(res);

      // Find TJMs along this route within the selected radius
      const found = findTJMsAlongRoute(stopObjects, res.coordinates, bufferRadius);
      setMatchedTJMs(found);
    } catch (e) {
      console.error(e);
    } finally {
      setCalculating(false);
    }
  }, [startPoint, endPoint, viaPoints, stopObjects, bufferRadius]);

  // Re-run matching when buffer radius changes
  useEffect(() => {
    if (routeResult && routeResult.coordinates.length > 0) {
      const found = findTJMsAlongRoute(stopObjects, routeResult.coordinates, bufferRadius);
      const merged = mergeAIStopsWithBufferTJMs(found, aiPlannedStops);
      setMatchedTJMs(merged);
    }
  }, [bufferRadius, routeResult, stopObjects, aiPlannedStops, mergeAIStopsWithBufferTJMs]);

  // Trigger calculation when both start and end points exist and change
  useEffect(() => {
    if (startPoint && endPoint) {
      handleCalculateRoute(startPoint, endPoint);
    } else {
      setRouteResult(null);
      setMatchedTJMs([]);
    }
  }, [startPoint?.lat, startPoint?.lng, endPoint?.lat, endPoint?.lng, viaKey]);

  // 1. Restore active route for this user account on mount or when account changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const user = activeUser || getCurrentUser();
    const storageKey = getAccountRouteStorageKey(user);

    try {
      const savedRaw = localStorage.getItem(storageKey);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved) {
          if (saved.startPoint) {
            setStartPoint(saved.startPoint);
            setStartQuery(saved.startQuery || saved.startPoint.name || '');
          }
          if (saved.endPoint) {
            setEndPoint(saved.endPoint);
            setEndQuery(saved.endQuery || saved.endPoint.name || '');
          }
          setViaPoints(Array.isArray(saved.viaPoints) ? saved.viaPoints : []);
          if (saved.bufferRadius) {
            setBufferRadius(saved.bufferRadius);
          }
        }
      }
    } catch (e) {
      console.warn('Faol marshrutni tiklashda xatolik:', e);
    } finally {
      setIsStorageInitialized(true);
    }
  }, [activeUser?.id, activeUser?.user_id, activeUser?.login]);

  // 2. Automatically save active route to account storage whenever points or radius change
  useEffect(() => {
    if (!isStorageInitialized || typeof window === 'undefined') return;
    const user = activeUser || getCurrentUser();
    const storageKey = getAccountRouteStorageKey(user);

    if (startPoint || endPoint) {
      const payload = {
        startPoint,
        startQuery,
        endPoint,
        endQuery,
        viaPoints,
        bufferRadius
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [startPoint, startQuery, endPoint, endQuery, viaPoints, bufferRadius, isStorageInitialized, activeUser]);


  // Swap Point A and Point B
  const handleSwap = () => {
    const tempPt = startPoint;
    const tempQ = startQuery;
    setStartPoint(endPoint);
    setStartQuery(endQuery);
    setEndPoint(tempPt);
    setEndQuery(tempQ);
    setViaPoints(prev => [...prev].reverse());
  };

  const addViaPoint = (point: RoutePoint) => {
    setViaPoints(prev => [...prev, point]);
    setViaQuery('');
    setIsViaOpen(false);
    setIsAddingVia(false);
  };

  const removeViaPoint = (index: number) => {
    const removed = viaPoints[index];
    setViaPoints(prev => prev.filter((_, i) => i !== index));
    if (removed?.source_id) {
      setAiPlannedStops(prev => prev && prev.filter(s => String(s.source_id) !== removed.source_id));
    }
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

  // Set Start Point to Center
  const handleUseRegiston = () => {
    const pt = {
      lat: isUysot ? 41.2995 : REGISTON_LAT,
      lng: isUysot ? 69.2401 : REGISTON_LNG,
      name: isUysot ? 'Toshkent markazi (Amir Temur xiyoboni)' : 'Samarqand markazi (Registon)'
    };
    setStartPoint(pt);
    setStartQuery(pt.name);
    setIsStartOpen(false);
  };

  // Handle map click picking (1st click = Point A, 2nd click = Point B)
  const handleMapClick = (lat: number, lng: number) => {
    const nearby = objects.find(o => {
      if (!o.latitude || !o.longitude) return false;
      const dLat = (o.latitude - lat) * 111000;
      const dLng = (o.longitude - lng) * 111000 * Math.cos(lat * Math.PI / 180);
      return Math.sqrt(dLat * dLat + dLng * dLng) < 60;
    });

    const pointName = nearby 
      ? (nearby.tjm_name || nearby.object_name) 
      : `Xaritadagi nuqta (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

    if (pickingMode === 'via') {
      addViaPoint({ lat, lng, name: pointName });
      setPickingMode(null);
    } else if (pickingMode === 'A') {
      const pt = { lat, lng, name: pointName };
      setStartPoint(pt);
      setStartQuery(pointName);
      setPickingMode(null);
      if (endPoint) {
        handleCalculateRoute(pt, endPoint);
      }
    } else if (pickingMode === 'B') {
      const pt = { lat, lng, name: pointName };
      setEndPoint(pt);
      setEndQuery(pointName);
      setPickingMode(null);
      if (startPoint) {
        handleCalculateRoute(startPoint, pt);
      }
    } else {
      // Natural 2-click workflow:
      if (!startPoint) {
        // 1-bosqich: A nuqta belgilanadi va A iconi chiqadi!
        const pt = { lat, lng, name: pointName };
        setStartPoint(pt);
        setStartQuery(pointName);
      } else if (!endPoint) {
        // 2-bosqich: B nuqta belgilanadi, B iconi chiqadi va marshrut hisoblanadi!
        const pt = { lat, lng, name: pointName };
        setEndPoint(pt);
        setEndQuery(pointName);
        handleCalculateRoute(startPoint, pt);
      } else {
        // Ikkala nuqta ham mavjud bo'lsa: borish manzilini yangilash
        const pt = { lat, lng, name: pointName };
        setEndPoint(pt);
        setEndQuery(pointName);
        handleCalculateRoute(startPoint, pt);
      }
    }
  };

  // Handle setting point directly from an object
  const handleSetPointFromObject = (obj: MapObject, pointType: 'A' | 'B' | 'via') => {
    const pt = {
      lat: obj.latitude,
      lng: obj.longitude,
      name: obj.tjm_name || obj.object_name
    };

    if (pointType === 'via') {
      addViaPoint({ ...pt, source_id: String(obj.source_id) });
      setPickingMode(null);
    } else if (pointType === 'A') {
      setStartPoint(pt);
      setStartQuery(pt.name);
      setPickingMode(null);
      if (endPoint) {
        handleCalculateRoute(pt, endPoint);
      }
    } else {
      setEndPoint(pt);
      setEndQuery(pt.name);
      setPickingMode(null);
      if (startPoint) {
        handleCalculateRoute(startPoint, pt);
      }
    }
  };

  // Nearest unvisited buildings for 1-tap mobile suggestions (Yandex Go style)
  const nearestUnvisited = useMemo(() => {
    const centerLat = (startPoint?.lat) || userLat || (isUysot ? 41.2995 : REGISTON_LAT);
    const centerLng = (startPoint?.lng) || userLng || (isUysot ? 69.2401 : REGISTON_LNG);

    return [...stopObjects]
      .filter(o => !o.last_visit && !Boolean((o as any).is_visited) && o.latitude && o.longitude)
      .map(o => ({
        object: o,
        dist: haversineMeters(centerLat, centerLng, o.latitude, o.longitude)
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 8);
  }, [stopObjects, startPoint?.lat, startPoint?.lng, userLat, userLng, isUysot]);

  // 1-Tap quick auto AI route with 5 nearest unvisited TJMs
  const handleQuickNearestAIRoute = async () => {
    const candidates = nearestUnvisited.slice(0, 5);
    if (candidates.length === 0) return;

    const stops: AIRouteRecommendation[] = candidates.map((c, i) => ({
      source_id: c.object.source_id,
      order: i + 1,
      object_name: c.object.tjm_name || c.object.object_name,
      latitude: c.object.latitude,
      longitude: c.object.longitude,
      reason: `Eng yaqin borilmagan TJM (${formatDistance(c.dist)})`,
      pitch_tip: `Qurilish bosqichi bo'yicha taklif (${c.object.phone ? 'Tel: ' + c.object.phone : 'Joyida uchrashuv'})`
    }));

    await handleApplyAIRoute(stops);
  };

  // Set destination from nearest recommendation and auto calculate
  const handleSetDestinationFromNearest = (obj: MapObject) => {
    if (!startPoint) {
      if (userLat && userLng) {
        setStartPoint({ lat: userLat, lng: userLng, name: 'Mening joriy joylashuvim (GPS)' });
        setStartQuery('Mening joriy joylashuvim (GPS)');
      } else {
        const centerLat = isUysot ? 41.2995 : REGISTON_LAT;
        const centerLng = isUysot ? 69.2401 : REGISTON_LNG;
        const centerName = isUysot ? 'Toshkent markazi' : 'Samarqand markazi (Registon)';
        setStartPoint({ lat: centerLat, lng: centerLng, name: centerName });
        setStartQuery(centerName);
      }
    }
    handleSetPointFromObject(obj, 'B');
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
    if (endPoint) {
      handleCalculateRoute(pt, endPoint);
    }
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
    if (startPoint) {
      handleCalculateRoute(startPoint, pt);
    }
  };

  // Clear / Reset all route points back to empty ("X" bosilganda)
  const handleClearRoute = () => {
    setStartPoint(null);
    setStartQuery('');
    setEndPoint(null);
    setEndQuery('');
    setViaPoints([]);
    setIsAddingVia(false);
    setViaQuery('');
    setRouteResult(null);
    setMatchedTJMs([]);
    setAiPlannedStops(null);
    setPickingMode(null);
    setIsNavigating(false);

    // Remove active route from user account storage
    if (typeof window !== 'undefined') {
      const user = activeUser || getCurrentUser();
      const storageKey = getAccountRouteStorageKey(user);
      localStorage.removeItem(storageKey);
    }
  };

  // Enter Picking Mode
  const triggerPickingMode = (mode: 'A' | 'B' | 'via') => {
    setPickingMode(mode);
    setIsStartOpen(false);
    setIsEndOpen(false);
  };

  // Start Real In-Car Live Navigation Mode: Routes from User's Current Location to A and B!
  const handleStartInCarNavigation = async () => {
    if (!startPoint && !endPoint) {
      alert("Iltimos, avval xaritadan borish manzilini tanlang!");
      return;
    }

    setCalculating(true);

    // 1. Get user's current GPS position
    const getUserLocation = (): Promise<{ lat: number; lng: number } | null> => {
      return new Promise((resolve) => {
        if (typeof window !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {
              if (userLat && userLng) {
                resolve({ lat: userLat, lng: userLng });
              } else {
                resolve(null);
              }
            },
            { enableHighAccuracy: true, timeout: 5000 }
          );
        } else if (userLat && userLng) {
          resolve({ lat: userLat, lng: userLng });
        } else {
          resolve(null);
        }
      });
    };

    const myLoc = await getUserLocation();
    const targetRef = startPoint || endPoint;

    // Build multi-stop waypoints: [My Current Location] -> [Point A] -> [Point B]
    const waypoints: { lat: number; lng: number }[] = [];

    if (myLoc && targetRef) {
      const distToTarget = haversineMeters(myLoc.lat, myLoc.lng, targetRef.lat, targetRef.lng);
      if (distToTarget <= 80000) {
        // Real user in Samarkand: start from their real GPS!
        waypoints.push(myLoc);
      } else if (startPoint) {
        // Testing outside Samarkand (desktop): simulate starting ~700m before Point A
        waypoints.push({
          lat: startPoint.lat - 0.005,
          lng: startPoint.lng - 0.005
        });
      }
    } else if (startPoint) {
      // Fallback if no geolocation
      waypoints.push({
        lat: startPoint.lat - 0.005,
        lng: startPoint.lng - 0.005
      });
    }

    if (startPoint) {
      // Avoid duplicate waypoint if already standing right at Point A
      if (waypoints.length === 0 || haversineMeters(waypoints[0].lat, waypoints[0].lng, startPoint.lat, startPoint.lng) > 30) {
        waypoints.push({ lat: startPoint.lat, lng: startPoint.lng });
      }
    }

    viaPoints.forEach(p => waypoints.push({ lat: p.lat, lng: p.lng }));

    if (endPoint) {
      waypoints.push({ lat: endPoint.lat, lng: endPoint.lng });
    }

    if (waypoints.length >= 2) {
      try {
        const res = await calculateOSRMRouteMulti(waypoints);
        setRouteResult(res);
        const matched = findTJMsAlongRoute(stopObjects, res.coordinates, bufferRadius);
        setMatchedTJMs(matched);
      } catch (err) {
        console.error('Multi-point navigation routing failed:', err);
      }
    }

    setCalculating(false);
    setIsNavigating(true);
    setShowSidebarInNav(false);
  };

  // Fetch saved routes
  const fetchSavedRoutes = useCallback(async () => {
    setLoadingSavedRoutes(true);
    try {
      const user = activeUser || getCurrentUser();
      const compId = companyId || user?.company_id;
      const res = await api.getSavedRoutes(compId);
      if (res.success && Array.isArray(res.data)) {
        setSavedRoutes(res.data);
      }
    } catch (err) {
      console.error('Error fetching saved routes:', err);
    } finally {
      setLoadingSavedRoutes(false);
    }
  }, [activeUser, companyId]);

  useEffect(() => {
    if (showSavedRoutesModal) {
      fetchSavedRoutes();
    }
  }, [showSavedRoutesModal, fetchSavedRoutes]);

  // Save current route
  const handleSaveRouteToSheets = async () => {
    if (!startPoint || !endPoint || !routeResult) {
      alert('Iltimos, avval marshrutni tanlang (A va B nuqtalar)');
      return;
    }

    setIsSavingRoute(true);
    setSaveSuccessMsg(null);

    try {
      const user = activeUser || getCurrentUser();
      const compId = companyId || user?.company_id || 'comp_default';
      const uId = user?.user_id || user?.id || '';
      const uName = user?.name || 'Menejer';

      // Format TJMs list into string
      const tjmListString = matchedTJMs.map(t => 
        `#${t.orderNumber} ${t.object.tjm_name || t.object.object_name} (${t.object.district_name || ''})`
      ).join(' | ');

      const distKm = Math.round((routeResult.distanceMeters / 1000) * 10) / 10;
      const durMin = Math.round(routeResult.durationSeconds / 60);

      const routePayload: Partial<SavedRoute> & { tjm_list: string } = {
        company_id: compId,
        user_id: uId,
        user_name: uName,
        start_name: startPoint.name || 'A nuqta',
        start_lat: startPoint.lat,
        start_lng: startPoint.lng,
        end_name: endPoint.name || 'B nuqta',
        end_lat: endPoint.lat,
        end_lng: endPoint.lng,
        distance_km: distKm,
        duration_min: durMin,
        tjm_count: matchedTJMs.length,
        tjm_list: tjmListString,
        buffer_radius_m: bufferRadius,
        via_points: viaPoints.length > 0 ? JSON.stringify(viaPoints) : '',
        notes: `${matchedTJMs.length} ta TJM topildi. Qidiruv radiusi: ${bufferRadius}m`,
        status: 'Rejalashtirilgan'
      };

      const res = await api.saveRoute(routePayload);
      if (res.success) {
        setSaveSuccessMsg(`Marshrut saqlandi! (${matchedTJMs.length} ta TJM)`);
        setTimeout(() => setSaveSuccessMsg(null), 5000);
      } else {
        alert('Marshrutni saqlashda xatolik: ' + (res.error || 'Noma\'lum xatolik'));
      }
    } catch (e: any) {
      console.error('Error saving route:', e);
      alert('Marshrutni saqlashda xatolik: ' + e.message);
    } finally {
      setIsSavingRoute(false);
    }
  };

  // Load a saved route into the planner
  const handleLoadSavedRoute = (route: SavedRoute) => {
    const startPt = {
      lat: route.start_lat,
      lng: route.start_lng,
      name: route.start_name
    };
    const endPt = {
      lat: route.end_lat,
      lng: route.end_lng,
      name: route.end_name
    };

    setStartPoint(startPt);
    setStartQuery(route.start_name);
    setEndPoint(endPt);
    setEndQuery(route.end_name);

    if (route.buffer_radius_m) {
      setBufferRadius(route.buffer_radius_m);
    }

    let savedVia: RoutePoint[] = [];
    try {
      savedVia = route.via_points ? JSON.parse(route.via_points) : [];
    } catch {
      // An unreadable list still leaves a usable A to B route.
    }
    setViaPoints(savedVia);

    setShowSavedRoutesModal(false);
    handleCalculateRoute(startPt, endPt, savedVia);
  };

  // The form folds away once a route exists, so the map stays visible on a phone.
  useEffect(() => {
    if (routeResult) setIsMobileControlsCollapsed(true);
  }, [routeResult]);

  const clearPoint = (kind: 'A' | 'B') => {
    if (kind === 'A') {
      setStartQuery('');
      setStartPoint(null);
    } else {
      setEndQuery('');
      setEndPoint(null);
    }
    setRouteResult(null);
    setMatchedTJMs([]);
    const otherPoint = kind === 'A' ? endPoint : startPoint;
    if (!otherPoint && typeof window !== 'undefined') {
      const user = activeUser || getCurrentUser();
      localStorage.removeItem(getAccountRouteStorageKey(user));
    }
  };

  const suggestionOptions = (list: MapObject[], kind: 'A' | 'B' | 'via') => list.map(obj => (
    <button
      key={obj.source_id}
      type="button"
      onClick={() => {
        handleSetPointFromObject(obj, kind);
        if (kind === 'A') setIsStartOpen(false);
        else if (kind === 'B') setIsEndOpen(false);
      }}
      className={OPTION_CLASS}
    >
      <span className="truncate">{obj.tjm_name || obj.object_name}</span>
      <span className="text-xs text-slate-400 shrink-0">{obj.district_name}</span>
    </button>
  ));

  const routeForm = (
    <div className="relative space-y-1">
      <PointField
        kind="A"
        query={startQuery}
        placeholder="Qayerdan"
        isOpen={isStartOpen}
        isPicking={pickingMode === 'A'}
        onFocus={() => setIsStartOpen(true)}
        onQueryChange={(value) => {
          setStartQuery(value);
          setIsStartOpen(true);
        }}
        onClear={() => clearPoint('A')}
        onPick={() => triggerPickingMode('A')}
        onUseLocation={handleUseMyLocation}
      >
        <button type="button" onClick={handleUseMyLocation} className={OPTION_CLASS}>
          Mening joylashuvim
        </button>
        <button type="button" onClick={handleUseRegiston} className={OPTION_CLASS}>
          {isUysot ? 'Toshkent markazi' : 'Samarqand markazi'}
        </button>
        <button type="button" onClick={() => triggerPickingMode('A')} className={OPTION_CLASS}>
          Xaritadan tanlash
        </button>
        {suggestionOptions(startSuggestions, 'A')}
      </PointField>

      {viaPoints.map((point, index) => (
        <div key={`${point.lat},${point.lng},${index}`} className="flex items-center gap-2 h-9 px-3 rounded-lg bg-slate-50">
          <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-medium flex items-center justify-center shrink-0 -ml-1">{index + 1}</span>
          <span className="flex-1 min-w-0 text-[13px] text-slate-800 truncate" title={point.name}>{point.name}</span>
          <button type="button" onClick={() => removeViaPoint(index)} title="Nuqtani olib tashlash" aria-label={`${point.name} nuqtasini olib tashlash`} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {isAddingVia && (
        <PointField
          kind="via"
          query={viaQuery}
          placeholder="Oraliq nuqta: TJM nomi yoki manzil"
          isOpen={isViaOpen}
          isPicking={pickingMode === 'via'}
          onFocus={() => setIsViaOpen(true)}
          onQueryChange={(value) => {
            setViaQuery(value);
            setIsViaOpen(true);
          }}
          onClear={() => {
            setViaQuery('');
            setIsViaOpen(false);
            setIsAddingVia(false);
          }}
          onPick={() => triggerPickingMode('via')}
        >
          <button type="button" onClick={() => triggerPickingMode('via')} className={OPTION_CLASS}>
            Xaritadan tanlash
          </button>
          {suggestionOptions(viaSuggestions, 'via')}
        </PointField>
      )}

      <PointField
        kind="B"
        query={endQuery}
        placeholder="Qayerga: TJM nomi yoki manzil"
        isOpen={isEndOpen}
        isPicking={pickingMode === 'B'}
        onFocus={() => setIsEndOpen(true)}
        onQueryChange={(value) => {
          setEndQuery(value);
          setIsEndOpen(true);
        }}
        onClear={() => clearPoint('B')}
        onPick={() => triggerPickingMode('B')}
      >
        <button type="button" onClick={() => triggerPickingMode('B')} className={OPTION_CLASS}>
          Xaritadan tanlash
        </button>
        {suggestionOptions(endSuggestions, 'B')}
      </PointField>

      <button
        type="button"
        onClick={() => {
          setIsAddingVia(true);
          setIsViaOpen(true);
        }}
        className="h-8 px-1 flex items-center gap-1.5 text-xs font-medium text-[#1b815f] hover:text-[#15674c] cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Nuqta qo&apos;shish</span>
      </button>

      <button
        type="button"
        onClick={handleSwap}
        title="Almashtirish"
        className="absolute right-[76px] top-[33px] z-10 w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer"
      >
        <ArrowDownUp className="w-3 h-3" />
      </button>
    </div>
  );

  const filterButton = onOpenFilters && (
    <button
      type="button"
      onClick={onOpenFilters}
      title="Filtrlar: TJM, brend, MChJ va boshqalar"
      className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors shrink-0 ${
        activeFilterCount > 0 ? 'bg-[#1b815f] text-white hover:bg-[#15674c]' : 'bg-slate-100 text-slate-700 hover:text-slate-900'
      }`}
    >
      <SlidersHorizontal className="w-3.5 h-3.5" />
      <span>Filtr</span>
      {activeFilterCount > 0 && <span className="tabular-nums">{activeFilterCount}</span>}
    </button>
  );

  const radiusControl = (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span>Yo&apos;ldan</span>
      <div className="flex rounded-lg bg-slate-100 p-0.5">
        {[100, 200, 500].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setBufferRadius(r)}
            className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
              bufferRadius === r ? 'bg-white text-slate-900 font-medium shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {r} m
          </button>
        ))}
      </div>
    </div>
  );

  const unvisitedStopCount = matchedTJMs.filter(t => !t.object.last_visit && !(t.object as any).is_visited).length;
  const phoneStopCount = matchedTJMs.filter(t => Boolean(t.object.phone)).length;
  const priorityStopCount = matchedTJMs.filter(t => (t.object.priority || '').toLowerCase().includes('yuqori')).length;

  const stopFilters = (
    <div className="flex items-center gap-4 px-4 border-b border-slate-100 overflow-x-auto no-scrollbar shrink-0 text-xs">
      {([
        ['all', 'Barchasi', matchedTJMs.length],
        ['unvisited', 'Borilmagan', unvisitedStopCount],
        ['phone', 'Telefoni bor', phoneStopCount],
        ['priority', 'Ustuvor', priorityStopCount]
      ] as const).map(([value, label, count]) => (
        <button
          key={value}
          type="button"
          onClick={() => {
            triggerHaptic(15);
            setStopsDrawerFilter(value);
          }}
          className={`py-2.5 whitespace-nowrap border-b-2 -mb-px cursor-pointer transition-colors ${
            stopsDrawerFilter === value ? 'border-[#1b815f] text-slate-900 font-medium' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {label} <span className="text-slate-400">{count}</span>
        </button>
      ))}
    </div>
  );

  const renderStopRow = (item: TJMAlongRoute, onOpen: () => void) => {
    const obj = item.object;
    const isSelected = String(selectedId) === String(obj.source_id);
    const isVisited = Boolean(obj.is_visited || obj.last_visit);

    return (
      <div
        key={obj.source_id}
        onClick={onOpen}
        className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 cursor-pointer transition-colors ${
          isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
        }`}
      >
        <span className={`w-6 h-6 rounded-full text-[11px] font-medium flex items-center justify-center shrink-0 ${
          isVisited ? 'bg-[#1b815f] text-white' : 'bg-slate-100 text-slate-600'
        }`}>
          {isVisited ? <Check className="w-3.5 h-3.5" /> : item.orderNumber}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-slate-900 truncate">{obj.tjm_name || obj.object_name}</p>
          <p className="text-xs text-slate-500 truncate">
            {formatDistance(item.distAlongRouteMeters)} &middot; yo&apos;ldan {item.distFromRoadMeters} m
          </p>
        </div>

        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {obj.phone && (
            <a href={getCallUrl(obj.phone)} title={obj.phone} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              <Phone className="w-4 h-4" />
            </a>
          )}
          <a
            href={getYandexNavUrl(obj.latitude, obj.longitude)}
            target="_blank"
            rel="noreferrer"
            title="Yandex Navigator"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <Navigation className="w-4 h-4" />
          </a>
          {onRecordVisit && !isVisited && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(30);
                onRecordVisit(obj.source_id);
              }}
              title="Tashrifni belgilash"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-emerald-50 hover:text-[#1b815f] cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const emptyStops = (
    <p className="px-6 py-10 text-center text-[13px] text-slate-500">
      {matchedTJMs.length === 0
        ? activeFilterCount > 0
          ? `Yo'ldan ${bufferRadius} m ichida filtrga mos TJM yo'q. Filtrni o'zgartirib ko'ring.`
          : `Yo'ldan ${bufferRadius} m ichida TJM topilmadi. Masofani oshirib ko'ring.`
        : "Bu filtrga mos to'xtash joyi yo'q."}
    </p>
  );

  const routeTotals = routeResult
    ? `${formatDistance(routeResult.distanceMeters)} · ${formatDuration(routeResult.durationSeconds)}`
    : '';

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full min-w-0 bg-slate-100 overflow-hidden">
      {/* 1. Left Panel: route form and results (desktop) */}
      <div className={`hidden md:flex md:w-[360px] lg:w-[380px] h-full flex-col bg-white border-r border-slate-200 z-20 shrink-0 ${
        isNavigating && !showSidebarInNav ? 'md:hidden' : ''
      }`}>
        <div className="p-4 space-y-3 border-b border-slate-100 shrink-0">
          {routeForm}

          <div className="flex items-center justify-between gap-2">
            {radiusControl}
            <div className="flex items-center gap-2">
              {filterButton}
              {(startPoint || endPoint) && (
                <button type="button" onClick={handleClearRoute} className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer">
                  Tozalash
                </button>
              )}
            </div>
          </div>

          {!routeResult && (
            <>
              <button
                type="button"
                onClick={() => handleCalculateRoute(startPoint, endPoint)}
                disabled={calculating || !startPoint || !endPoint}
                className="w-full h-10 bg-[#1b815f] hover:bg-[#15674c] text-white rounded-lg text-[13px] font-medium transition-colors disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
              >
                {calculating ? 'Hisoblanmoqda...' : 'Marshrut tuzish'}
              </button>
              <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                <button type="button" onClick={() => setShowAIRouteModal(true)} className="hover:text-slate-900 cursor-pointer">
                  AI marshrut
                </button>
                <span className="text-slate-300">|</span>
                <button type="button" onClick={() => setShowSavedRoutesModal(true)} className="hover:text-slate-900 cursor-pointer">
                  Saqlanganlar
                </button>
              </div>
            </>
          )}
        </div>

        {routeResult && (
          <div className="px-4 py-3 border-b border-slate-100 shrink-0 space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-lg font-semibold text-slate-900 tabular-nums">{routeTotals}</p>
              <p className="text-xs text-slate-500">{matchedTJMs.length} ta TJM</p>
            </div>

            {saveSuccessMsg && <p className="text-xs text-[#1b815f]">{saveSuccessMsg}</p>}

            <div className="grid grid-cols-[auto_1fr] gap-2">
              <button
                type="button"
                onClick={handleSaveRouteToSheets}
                disabled={isSavingRoute}
                className="h-10 px-4 rounded-lg text-[13px] font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-60"
              >
                {isSavingRoute ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
              <button
                type="button"
                onClick={handleStartInCarNavigation}
                className="h-10 rounded-lg text-[13px] font-medium bg-[#1b815f] hover:bg-[#15674c] text-white cursor-pointer transition-colors"
              >
                Boshlash
              </button>
            </div>
          </div>
        )}

        {!routeResult ? (
          <div className="flex-1 overflow-y-auto">
            {nearestUnvisited.length > 0 && (
              <>
                <p className="px-4 pt-4 pb-2 text-xs text-slate-500">Yaqindagi borilmaganlar</p>
                {nearestUnvisited.slice(0, 10).map(item => (
                  <button
                    key={item.object.source_id}
                    type="button"
                    onClick={() => handleSetDestinationFromNearest(item.object)}
                    className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                  >
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-slate-900 truncate">{item.object.tjm_name || item.object.object_name}</span>
                      <span className="block text-xs text-slate-500 truncate">{item.object.district_name || '—'}</span>
                    </span>
                    <span className="text-xs text-slate-500 shrink-0 tabular-nums">{formatDistance(item.dist)}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        ) : (
          <>
            {stopFilters}
            <div className="flex-1 overflow-y-auto">
              {filteredDrawerStops.length === 0
                ? emptyStops
                : filteredDrawerStops.map(item => renderStopRow(item, () => {
                    triggerHaptic(15);
                    onSelectObject(String(item.object.source_id));
                  }))}
            </div>
            <label className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={showAllMarkers}
                onChange={(e) => setShowAllMarkers(e.target.checked)}
                className="rounded accent-[#1b815f]"
              />
              <span>Boshqa TJM-larni ham xaritada ko&apos;rsatish</span>
            </label>
          </>
        )}
      </div>

      {/* 2. Right Panel: Interactive Route Map & In-Car Driver View (Always visible on mobile & desktop) */}
      <div className="flex-1 h-full relative block min-w-0">
        {/* Toggle Left Sidebar when in full navigation mode (Desktop) */}
        {isNavigating && (
          <div className="hidden md:block absolute top-4 left-4 z-[400]">
            <button
              onClick={() => setShowSidebarInNav(!showSidebarInNav)}
              className="h-9 px-3 bg-white rounded-lg shadow-md text-xs text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              {showSidebarInNav ? "Ro'yxatni yopish" : `Ro'yxat (${matchedTJMs.length})`}
            </button>
          </div>
        )}

        {/* Mobile top bar: only the route, the map stays visible */}
        {!isNavigating && (
          <div className="md:hidden absolute top-2 left-2 right-2 z-[450] pointer-events-auto">
            {pickingMode ? (
              <div className="h-11 px-3 rounded-xl bg-white shadow-md flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-slate-900 truncate">
                  {pickingMode === 'A' ? 'Boshlanish joyini xaritadan tanlang' : pickingMode === 'via' ? 'Oraliq nuqtani xaritadan tanlang' : 'Borish joyini xaritadan tanlang'}
                </span>
                <button type="button" onClick={() => setPickingMode(null)} className="text-[13px] text-slate-500 shrink-0 cursor-pointer">
                  Bekor
                </button>
              </div>
            ) : isMobileControlsCollapsed ? (
              <button
                type="button"
                onClick={() => setIsMobileControlsCollapsed(false)}
                className="w-full h-11 px-3 rounded-xl bg-white shadow-md flex items-center justify-between gap-2 cursor-pointer"
              >
                <span className="min-w-0 flex items-center gap-2 text-[13px] text-slate-900">
                  <span className="truncate">{startPoint?.name || 'Qayerdan'}</span>
                  <span className="text-slate-400 shrink-0">&rarr;</span>
                  {viaPoints.length > 0 && <span className="text-xs text-slate-500 shrink-0">+{viaPoints.length} &rarr;</span>}
                  <span className="truncate">{endPoint?.name || 'Qayerga'}</span>
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ) : (
              <div className="bg-white shadow-md rounded-xl p-2 space-y-2">
                {routeForm}
                <div className="flex items-center justify-between gap-2 px-1">
                  {radiusControl}
                  {filterButton}
                  <button
                    type="button"
                    onClick={() => setIsMobileControlsCollapsed(true)}
                    title="Yig'ish"
                    className="w-8 h-8 flex items-center justify-center text-slate-400 cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <RoutePlannerMap
          startPoint={startPoint}
          endPoint={endPoint}
          viaPoints={viaPoints}
          routeCoords={routeResult ? routeResult.coordinates : []}
          matchedTJMs={matchedTJMs}
          bufferRadiusMeters={bufferRadius}
          allObjects={stopObjects}
          selectedTJMId={selectedId}
          onSelectTJM={onSelectObject}
          showAllMarkers={showAllMarkers || !routeResult}
          pickingMode={pickingMode}
          onMapClick={handleMapClick}
          onDragStartPoint={handleDragStartPoint}
          onDragEndPoint={handleDragEndPoint}
          onSetPointFromObject={handleSetPointFromObject}
          onCancelPicking={() => setPickingMode(null)}
          onClearRoute={handleClearRoute}
          onStartNavigation={handleStartInCarNavigation}
          isNavigating={isNavigating}
          onStopNavigation={() => {
            setIsNavigating(false);
            setShowSidebarInNav(false);
          }}
          onRecordVisit={onRecordVisit}
        />

        {/* Mobile bottom card: the next stop, or nearby objects before a route exists */}
        {!isNavigating && !pickingMode && (
          <div className="md:hidden absolute bottom-2 left-2 right-2 z-[450] pointer-events-auto">
            {routeResult ? (
              <div className="bg-white shadow-md rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[15px] font-semibold text-slate-900 tabular-nums truncate">{routeTotals}</p>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleSaveRouteToSheets}
                      disabled={isSavingRoute}
                      title="Saqlash"
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 cursor-pointer disabled:opacity-50"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleClearRoute}
                      title="Bekor qilish"
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {saveSuccessMsg && <p className="text-xs text-[#1b815f]">{saveSuccessMsg}</p>}

                {(() => {
                  const current = matchedTJMs[Math.min(mobileActiveStopIndex, matchedTJMs.length - 1)];
                  if (!current) return <p className="text-[13px] text-slate-500">Yo&apos;lda TJM topilmadi. Masofani oshirib ko&apos;ring.</p>;
                  const obj = current.object;
                  const isVisited = Boolean(obj.last_visit || obj.is_visited);

                  return (
                    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="flex items-center gap-1 select-none">
                      <button
                        type="button"
                        disabled={mobileActiveStopIndex === 0}
                        onClick={() => setMobileActiveStopIndex(Math.max(0, mobileActiveStopIndex - 1))}
                        title="Oldingi"
                        className="w-8 h-9 flex items-center justify-center text-slate-400 disabled:opacity-30 cursor-pointer shrink-0"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectObject(String(obj.source_id))}
                        className="min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <span className="block text-[13px] font-medium text-slate-900 truncate">{obj.tjm_name || obj.object_name}</span>
                        <span className="block text-xs text-slate-500 truncate">
                          {mobileActiveStopIndex + 1}/{matchedTJMs.length} &middot; {isVisited ? 'borilgan' : `yo'ldan ${current.distFromRoadMeters} m`}
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={mobileActiveStopIndex >= matchedTJMs.length - 1}
                        onClick={() => setMobileActiveStopIndex(Math.min(matchedTJMs.length - 1, mobileActiveStopIndex + 1))}
                        title="Keyingi"
                        className="w-8 h-9 flex items-center justify-center text-slate-400 disabled:opacity-30 cursor-pointer shrink-0"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })()}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(30);
                      handleStartInCarNavigation();
                    }}
                    className="flex-1 h-10 rounded-lg bg-[#1b815f] text-white text-[13px] font-medium cursor-pointer"
                  >
                    Boshlash
                  </button>
                  {(() => {
                    const current = matchedTJMs[Math.min(mobileActiveStopIndex, matchedTJMs.length - 1)];
                    if (!current) return null;
                    const obj = current.object;
                    const isVisited = Boolean(obj.last_visit || obj.is_visited);
                    const iconClass = 'w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 cursor-pointer shrink-0';
                    return (
                      <>
                        {onRecordVisit && !isVisited && (
                          <button
                            type="button"
                            title="Tashrifni belgilash"
                            onClick={async () => {
                              triggerHaptic(40);
                              await onRecordVisit(obj.source_id);
                              if (mobileActiveStopIndex < matchedTJMs.length - 1) {
                                setMobileActiveStopIndex(prev => prev + 1);
                              }
                            }}
                            className={iconClass}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {obj.phone && (
                          <a href={getCallUrl(obj.phone)} title={obj.phone} className={iconClass}>
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        <a href={getYandexNavUrl(obj.latitude, obj.longitude)} target="_blank" rel="noreferrer" title="Yandex Navigator" className={iconClass}>
                          <Navigation className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          title="Barcha to'xtash joylari"
                          onClick={() => setShowMobileStopsDrawer(true)}
                          className={`${iconClass} text-xs font-medium tabular-nums`}
                        >
                          {matchedTJMs.length}
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="bg-white shadow-md rounded-xl py-3 space-y-2">
                <div className="flex items-center justify-between gap-2 px-3 text-xs">
                  <span className="text-slate-500">Yaqindagi borilmaganlar</span>
                  <span className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(25);
                        handleQuickNearestAIRoute();
                      }}
                      className="font-medium text-[#1b815f] cursor-pointer"
                    >
                      Eng yaqin 5 ta
                    </button>
                    <button type="button" onClick={() => setShowAIRouteModal(true)} className="text-slate-500 cursor-pointer">AI</button>
                    <button type="button" onClick={() => setShowSavedRoutesModal(true)} title="Saqlanganlar" className="text-slate-500 cursor-pointer">
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar px-3">
                  {nearestUnvisited.slice(0, 5).map(item => (
                    <button
                      key={item.object.source_id}
                      type="button"
                      onClick={() => {
                        triggerHaptic(20);
                        handleSetDestinationFromNearest(item.object);
                      }}
                      className="bg-slate-50 rounded-lg px-3 py-2 shrink-0 text-left w-[170px] cursor-pointer"
                    >
                      <span className="block text-xs font-medium text-slate-900 truncate">{item.object.tjm_name || item.object.object_name}</span>
                      <span className="block text-[11px] text-slate-500 truncate tabular-nums">
                        {formatDistance(item.dist)} &middot; {item.object.district_name || '—'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mobile list of all stops */}
        {showMobileStopsDrawer && (
          <div
            className="fixed inset-0 z-[600] flex flex-col justify-end bg-slate-900/40 md:hidden"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowMobileStopsDrawer(false);
            }}
          >
            <div className="bg-white w-full max-h-[82vh] rounded-t-2xl flex flex-col overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between shrink-0">
                <h3 className="text-[15px] font-semibold text-slate-900">To&apos;xtash joylari</h3>
                <button type="button" onClick={() => setShowMobileStopsDrawer(false)} title="Yopish" className="w-9 h-9 flex items-center justify-center text-slate-500 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {stopFilters}
              <div className="flex-1 overflow-y-auto">
                {filteredDrawerStops.length === 0
                  ? emptyStops
                  : filteredDrawerStops.map(item => renderStopRow(item, () => {
                      triggerHaptic(20);
                      const index = matchedTJMs.findIndex(m => m.object.source_id === item.object.source_id);
                      if (index !== -1) setMobileActiveStopIndex(index);
                      onSelectObject(String(item.object.source_id));
                      setShowMobileStopsDrawer(false);
                    }))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Saved Routes Modal */}
      {showSavedRoutesModal && (
        <div 
          className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSavedRoutesModal(false);
          }}
        >
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <BookmarkCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                    Saqlangan Marshrutlar
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Kompaniyangiz saqlagan marshrutlar
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={fetchSavedRoutes}
                  disabled={loadingSavedRoutes}
                  className="p-2 hover:bg-slate-200/70 rounded-xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Yangilash"
                >
                  <RotateCcw className={`w-4 h-4 ${loadingSavedRoutes ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowSavedRoutesModal(false)}
                  className="p-2 hover:bg-slate-200/70 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Yopish"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingSavedRoutes ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#1b815f]" />
                  <p className="text-xs font-semibold">Google Sheets&apos;dan yuklanmoqda...</p>
                </div>
              ) : savedRoutes.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Compass className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">Hozircha saqlangan marshrutlar yo&apos;q</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    A va B nuqtalarni xaritadan tanlang va &quot;Saqlash&quot; tugmasi orqali marshrutni Google Sheets jadvaliga kiriting.
                  </p>
                </div>
              ) : (
                savedRoutes.map((rt) => {
                  const isExpanded = expandedRouteId === rt.id;
                  return (
                    <div
                      key={rt.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          {/* A & B Points */}
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white font-semibold text-[9px] flex items-center justify-center shrink-0">
                              A
                            </span>
                            <span className="truncate">{rt.start_name}</span>
                            <span className="text-slate-400">➔</span>
                            <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-semibold text-[9px] flex items-center justify-center shrink-0">
                              B
                            </span>
                            <span className="truncate">{rt.end_name}</span>
                          </div>

                          {/* Meta: User & Date */}
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                            {rt.user_name && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {rt.user_name}
                              </span>
                            )}
                            {rt.created_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(rt.created_at).toLocaleDateString('uz-UZ', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                              {rt.status || 'Rejalashtirilgan'}
                            </span>
                          </div>
                        </div>

                        {/* Load Route Button */}
                        <button
                          type="button"
                          onClick={() => handleLoadSavedRoute(rt)}
                          className="px-3 py-1.5 bg-[#1b815f] hover:bg-[#15674c] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs shadow-emerald-600/20 transition-all cursor-pointer"
                          title="Ushbu marshrutni xaritaga yuklash"
                        >
                          <RouteIcon className="w-3.5 h-3.5" />
                          <span>Ochish</span>
                        </button>
                      </div>

                      {/* Route metrics badge row */}
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100 flex-wrap">
                        <span>📏 {rt.distance_km} km</span>
                        <span className="text-slate-300">•</span>
                        <span>⏱️ {rt.duration_min} daq</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-emerald-700 font-bold">🏢 {rt.tjm_count} ta TJM</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-400">Radius: {rt.buffer_radius_m || 200}m</span>

                        {rt.tjm_list && (
                          <button
                            type="button"
                            onClick={() => setExpandedRouteId(isExpanded ? null : rt.id)}
                            className="ml-auto text-[10px] text-[#1b815f] hover:underline cursor-pointer"
                          >
                            {isExpanded ? "TJM ro'yxatini yashirish" : "TJM ro'yxatini ko'rish"}
                          </button>
                        )}
                      </div>

                      {/* Expanded TJMs list */}
                      {isExpanded && rt.tjm_list && (
                        <div className="p-2.5 bg-slate-50/80 rounded-xl text-xs text-slate-700 border border-slate-200/80 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                          {rt.tjm_list}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Smart Route Modal */}
      <AIRouteModal
        isOpen={showAIRouteModal}
        onClose={() => setShowAIRouteModal(false)}
        objects={stopObjects}
        activeFilterCount={activeFilterCount}
        userLat={userLat}
        userLng={userLng}
        companyId={companyId}
        onApplyRoute={handleApplyAIRoute}
      />
    </div>
  );
}
