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
  Navigation, MapPin, ArrowDownUp, Search, Compass,
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

export default function RoutePlannerView({
  objects: rawObjects,
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
  const objects = useMemo(() => {
    return (rawObjects || []).filter(o => {
      const isDomtut = String(o.source_id).startsWith('domtut_') || Boolean((o as any).is_uysot);
      return isUysot ? isDomtut : !isDomtut;
    });
  }, [rawObjects, isUysot]);

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

    const waypoints: { lat: number; lng: number }[] = [
      { lat: startPt.lat, lng: startPt.lng },
      ...stops.map(s => ({ lat: s.latitude || startPt.lat, lng: s.longitude || startPt.lng }))
    ];

    setCalculating(true);
    try {
      const multiRes = await calculateOSRMRouteMulti(waypoints);
      if (multiRes && multiRes.coordinates.length > 0) {
        setRouteResult(multiRes);
        const tjms = findTJMsAlongRoute(objects, multiRes.coordinates, bufferRadius);
        const merged = mergeAIStopsWithBufferTJMs(tjms, stops);
        setMatchedTJMs(merged);
      }
    } catch (err) {
      console.error('Failed to calculate AI multi-route:', err);
    } finally {
      setCalculating(false);
    }
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
  
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  // Picking mode: 'A' or 'B' or null
  const [pickingMode, setPickingMode] = useState<'A' | 'B' | null>(null);

  // Buffer Radius (default: 200m)
  const [bufferRadius, setBufferRadius] = useState<number>(200);
  const [showAllMarkers, setShowAllMarkers] = useState<boolean>(false);

  // Calculation state - Starts as null!
  const [calculating, setCalculating] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [matchedTJMs, setMatchedTJMs] = useState<TJMAlongRoute[]>([]);
  const [activeMobileTab, setActiveMobileTab] = useState<'list' | 'map'>('list');

  // Mobile drawer filter & swipe state
  const [stopsDrawerFilter, setStopsDrawerFilter] = useState<'all' | 'unvisited' | 'phone' | 'priority'>('all');
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const triggerHaptic = useCallback((ms = 25) => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && (navigator as any).vibrate) {
      try { (navigator as any).vibrate(ms); } catch (_) {}
    }
  }, []);

  const getDetourBadge = useCallback((distMeters: number) => {
    if (distMeters <= 50) {
      return {
        label: "⚡ Yo'l yoqasida (+0 daq)",
        className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      };
    } else if (distMeters <= 150) {
      return {
        label: `↩ Qisqa burilish (+${distMeters} m)`,
        className: "bg-blue-500/20 text-blue-300 border-blue-500/30"
      };
    } else {
      return {
        label: `↗ Yo'ldan chetda (+${distMeters} m)`,
        className: "bg-amber-500/20 text-amber-300 border-amber-500/30"
      };
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
        if (matchedTJMs[nextIdx]) onSelectObject(matchedTJMs[nextIdx].object.source_id);
      } else if (dx > 0 && mobileActiveStopIndex > 0) {
        triggerHaptic(20);
        const prevIdx = mobileActiveStopIndex - 1;
        setMobileActiveStopIndex(prevIdx);
        if (matchedTJMs[prevIdx]) onSelectObject(matchedTJMs[prevIdx].object.source_id);
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
      const merged = mergeAIStopsWithBufferTJMs(found, aiPlannedStops);
      setMatchedTJMs(merged);
    }
  }, [bufferRadius, routeResult, objects, aiPlannedStops, mergeAIStopsWithBufferTJMs]);

  // Trigger calculation when both start and end points exist and change
  useEffect(() => {
    if (startPoint && endPoint) {
      handleCalculateRoute(startPoint, endPoint);
    } else {
      setRouteResult(null);
      setMatchedTJMs([]);
    }
  }, [startPoint?.lat, startPoint?.lng, endPoint?.lat, endPoint?.lng]);

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
        bufferRadius
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [startPoint, startQuery, endPoint, endQuery, bufferRadius, isStorageInitialized, activeUser]);


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

    if (pickingMode === 'A') {
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

    return [...objects]
      .filter(o => !o.last_visit && !Boolean((o as any).is_visited) && o.latitude && o.longitude)
      .map(o => ({
        object: o,
        dist: haversineMeters(centerLat, centerLng, o.latitude, o.longitude)
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 8);
  }, [objects, startPoint?.lat, startPoint?.lng, userLat, userLng, isUysot]);

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
  const triggerPickingMode = (mode: 'A' | 'B') => {
    setPickingMode(mode);
    setIsStartOpen(false);
    setIsEndOpen(false);
    setActiveMobileTab('map');
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

    if (endPoint) {
      waypoints.push({ lat: endPoint.lat, lng: endPoint.lng });
    }

    if (waypoints.length >= 2) {
      try {
        const res = await calculateOSRMRouteMulti(waypoints);
        setRouteResult(res);
        const matched = findTJMsAlongRoute(objects, res.coordinates, bufferRadius);
        setMatchedTJMs(matched);
      } catch (err) {
        console.error('Multi-point navigation routing failed:', err);
      }
    }

    setCalculating(false);
    setIsNavigating(true);
    setShowSidebarInNav(false);
    setActiveMobileTab('map');
  };

  // Fetch saved routes from Google Sheets
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

  // Save current route to Google Sheets (Routes sheet)
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
        notes: `${matchedTJMs.length} ta TJM topildi. Qidiruv radiusi: ${bufferRadius}m`,
        status: 'Rejalashtirilgan'
      };

      const res = await api.saveRoute(routePayload);
      if (res.success) {
        setSaveSuccessMsg(`Marshrut Google Sheets (Routes) jadvaliga saqlandi! (${matchedTJMs.length} ta TJM)`);
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

  // Load a saved route from Google Sheets into the planner
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

    setShowSavedRoutesModal(false);
    handleCalculateRoute(startPt, endPt);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full min-w-0 bg-slate-100 overflow-hidden">
      {/* 1. Left Panel: Inputs & Route Results List (Desktop view) */}
      <div className={`hidden md:flex md:w-[420px] lg:w-[460px] h-full flex-col bg-white border-r border-slate-200 z-20 shrink-0 shadow-sm transition-all duration-200 ${
        isNavigating && !showSidebarInNav ? 'md:hidden' : ''
      }`}>
        {/* Top Header Card */}
        <div className="p-4 border-b border-slate-100 bg-white space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shadow-blue-500/20">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 leading-tight">Navigator</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* AI Route Modal Trigger */}
              <button
                type="button"
                onClick={() => setShowAIRouteModal(true)}
                className="px-2.5 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                title="Sun'iy intellekt yordamida aqlli marshrut tuzish (Bepul)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>AI Marshrut</span>
              </button>

              {/* Saved Routes Modal Trigger */}
              <button
                type="button"
                onClick={() => setShowSavedRoutesModal(true)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer shadow-2xs"
                title="Google Sheets'da saqlangan marshrutlar"
              >
                <Bookmark className="w-3.5 h-3.5 text-blue-600" />
                <span>Saqlanganlar</span>
              </button>

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
                  placeholder="Boshlanish joyi (Qayerdan?)..."
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
                      setRouteResult(null);
                      setMatchedTJMs([]);
                      if (!endPoint && typeof window !== 'undefined') {
                        const user = activeUser || getCurrentUser();
                        localStorage.removeItem(getAccountRouteStorageKey(user));
                      }
                    }}
                    className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer transition-colors"
                    title="A nuqtani bekor qilish (X)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* GPS Button */}
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/80 px-2 py-1 rounded-lg border border-emerald-300 flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                  title="Mening GPS joylashuvim"
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
                  <MapPin className="w-3 h-3 text-emerald-600" />
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
                    onClick={handleUseRegiston}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-blue-50 text-blue-700 font-bold flex items-center gap-2 cursor-pointer border-b border-slate-100"
                  >
                    <span>🏛️ {isUysot ? 'Toshkent markazi (Amir Temur)' : 'Samarqand markazi (Registon)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerPickingMode('A')}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-emerald-50 text-emerald-700 font-bold flex items-center gap-2 cursor-pointer border-b border-slate-100"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
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

            {/* Point B (Destination) - COMPLETELY EMPTY BY DEFAULT */}
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
                      setRouteResult(null);
                      setMatchedTJMs([]);
                      if (!startPoint && typeof window !== 'undefined') {
                        const user = activeUser || getCurrentUser();
                        localStorage.removeItem(getAccountRouteStorageKey(user));
                      }
                    }}
                    className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer transition-colors"
                    title="B nuqtani bekor qilish (X)"
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
                  <MapPin className="w-3 h-3 text-rose-600" />
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
                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
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

              <div className="flex items-center gap-1.5 ml-auto">
                {(startPoint || endPoint) && (
                  <button
                    type="button"
                    onClick={handleClearRoute}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Barcha nuqtalarni tozalash"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Tozalash</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleCalculateRoute(startPoint, endPoint)}
                  disabled={calculating || !startPoint || !endPoint}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
                  title="Marshrutni hisoblash"
                >
                  <RouteIcon className="w-3.5 h-3.5" />
                  <span>{calculating ? 'Hisoblanmoqda...' : 'Marshrut'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Route Stats Summary Banner with Real In-Car Navigation Button */}
        {routeResult && (
          <div className="p-3 bg-blue-50/70 border-b border-blue-100 shrink-0 space-y-2.5">
            {/* Active Route Persistent Indicator & Clear (X) Button */}
            <div className="flex items-center justify-between pb-1.5 border-b border-blue-200/50">
              <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                <RouteIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Faol yo&apos;nalish (Akkountda saqlangan)</span>
              </span>
              <button
                type="button"
                onClick={handleClearRoute}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer border border-rose-200/80 bg-white shadow-2xs"
                title="Yo'nalishni bekor qilish va tozalash (X)"
              >
                <X className="w-3 h-3 text-rose-600" />
                <span>Bekor qilish (X)</span>
              </button>
            </div>

            {/* Success Alert when route saved to Google Sheets */}
            {saveSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="flex-1 leading-snug">{saveSuccessMsg}</span>
              </div>
            )}

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

            {/* Action Buttons: Save to Google Sheets & Live Navigation */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSaveRouteToSheets}
                disabled={isSavingRoute}
                className="py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 hover:border-emerald-400 active:scale-[0.98] cursor-pointer disabled:opacity-60"
                title="Google Sheets (Routes) jadvaliga saqlash"
              >
                {isSavingRoute ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                    <span>Saqlanmoqda...</span>
                  </>
                ) : (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                    <span>Saqlash</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleStartInCarNavigation}
                className="py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/30 active:scale-[0.98] cursor-pointer"
                title="Jonli haydovchi navigator rejimini ishga tushirish"
              >
                <Navigation className="w-3.5 h-3.5 fill-white" />
                <span>Boshlash 🧭</span>
              </button>
            </div>
          </div>
        )}

        {/* Matched TJMs List or Recommended TJMs */}
        {!routeResult ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Recommended TJMs List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Tavsiya etilgan TJM-lar:</span>
                </p>
                <span className="text-[11px] font-semibold text-slate-400">
                  Jami: {objects.length} ta
                </span>
              </div>

              <div className="space-y-2">
                {objects.slice(0, 20).map((obj, index) => (
                  <div
                    key={obj.source_id}
                    onClick={() => onSelectObject(obj.source_id)}
                    className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all flex items-center justify-between gap-3 cursor-pointer"
                  >
                    {/* Number Badge: 1, 2, 3, 4, 5... */}
                    <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {obj.tjm_name || obj.object_name}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{obj.district_name || 'Obyekt'}</p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetPointFromObject(obj, 'B');
                      }}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl text-[10px] font-bold border border-blue-200 transition-colors shrink-0 cursor-pointer"
                      title="Borish manzili (B) qilib tanlash"
                    >
                      B qilib tanlash →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (

          <>
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
              className="px-3.5 py-2 bg-slate-950/90 hover:bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-xl flex items-center gap-2 backdrop-blur-md cursor-pointer border border-white/15 transition-all"
            >
              <Layers className="w-4 h-4 text-blue-400" />
              <span>{showSidebarInNav ? "Xaritani to'liq yoyish" : `TJM Ro'yxati (${matchedTJMs.length})`}</span>
            </button>
          </div>
        )}

        {/* Mobile Floating Top Route Bar (Yandex Maps / Yandex Go style) */}
        {!isNavigating && (
          <div className="md:hidden absolute top-2 left-2 right-2 z-[450] animate-in slide-in-from-top-2 duration-200 pointer-events-auto">
            {pickingMode ? (
              <div className={`p-3 rounded-2xl shadow-xl flex items-center justify-between gap-2 border text-white ${
                pickingMode === 'A' ? 'bg-emerald-600 border-emerald-400' : 'bg-rose-600 border-rose-400'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 animate-bounce shrink-0" />
                  <span className="text-xs font-black truncate">
                    {pickingMode === 'A' ? "📍 Xaritadan A (Boshlanish) nuqtani tanlang" : "🏁 Xaritadan B (Borish) manzilini tanlang"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPickingMode(null)}
                  className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold text-white shrink-0 cursor-pointer"
                >
                  Bekor qilish
                </button>
              </div>
            ) : isMobileControlsCollapsed ? (
              <div 
                onClick={() => setIsMobileControlsCollapsed(false)}
                className="bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-lg rounded-2xl p-2.5 flex items-center justify-between gap-2 cursor-pointer active:scale-98 transition-all"
              >
                <div className="flex items-center gap-2 min-w-0 text-xs font-bold text-slate-800">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                    A
                  </div>
                  <span className="truncate max-w-[100px] text-slate-700">
                    {startPoint ? (startPoint.name || 'A nuqta') : 'Boshlanish'}
                  </span>
                  <span className="text-slate-400">➔</span>
                  <div className="w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                    B
                  </div>
                  <span className="truncate max-w-[100px] text-slate-700">
                    {endPoint ? (endPoint.name || 'B nuqta') : 'Borish manzili'}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <span>Ochish</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-xl rounded-2xl p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Navigation className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-black text-slate-900 tracking-tight">Yo&apos;l-yo&apos;lakay</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowAIRouteModal(true)}
                      className="px-2 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
                      title="AI Marshrut"
                    >
                      <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                      <span>AI Marshrut</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSavedRoutesModal(true)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-slate-200 cursor-pointer"
                      title="Saqlanganlar"
                    >
                      <Bookmark className="w-3 h-3 text-blue-600" />
                      <span>Saqlanganlar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMobileControlsCollapsed(true)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                      title="Kichraytirish"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {/* Point A */}
                  <div className="relative">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs">
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-white font-black text-[9px] flex items-center justify-center shrink-0">
                        A
                      </span>
                      <input
                        type="text"
                        placeholder="Qayerdan? (Boshlanish nuqtasi)..."
                        value={startQuery}
                        onFocus={() => setIsStartOpen(true)}
                        onChange={(e) => {
                          setStartQuery(e.target.value);
                          setIsStartOpen(true);
                        }}
                        className="w-full bg-transparent outline-none font-medium text-slate-800 placeholder:text-slate-400 text-xs"
                      />
                      {startQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setStartQuery('');
                            setStartPoint(null);
                            setRouteResult(null);
                            setMatchedTJMs([]);
                            if (!endPoint && typeof window !== 'undefined') {
                              const user = activeUser || getCurrentUser();
                              localStorage.removeItem(getAccountRouteStorageKey(user));
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleUseMyLocation}
                        className="p-1 bg-emerald-100 text-emerald-700 rounded-md border border-emerald-300 shrink-0 cursor-pointer"
                        title="Mening GPS joylashuvim"
                      >
                        <LocateFixed className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerPickingMode('A')}
                        className="p-1 bg-slate-200 text-slate-700 rounded-md shrink-0 cursor-pointer"
                        title="Xaritadan belgilash"
                      >
                        <MapPin className="w-3 h-3 text-emerald-600" />
                      </button>
                    </div>

                    {isStartOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto p-1.5 space-y-1">
                        <button
                          type="button"
                          onClick={handleUseMyLocation}
                          className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs hover:bg-emerald-50 text-emerald-700 font-bold flex items-center gap-2 cursor-pointer border-b border-slate-100"
                        >
                          <LocateFixed className="w-3 h-3 text-emerald-600" />
                          <span>📍 Mening joriy joylashuvim (GPS)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleUseRegiston}
                          className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs hover:bg-blue-50 text-blue-700 font-bold flex items-center gap-2 cursor-pointer border-b border-slate-100"
                        >
                          <span>🏛️ {isUysot ? 'Toshkent markazi' : 'Samarqand markazi (Registon)'}</span>
                        </button>
                        {startSuggestions.map(obj => (
                          <button
                            key={obj.source_id}
                            type="button"
                            onClick={() => {
                              handleSetPointFromObject(obj, 'A');
                              setIsStartOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs hover:bg-slate-50 text-slate-800 font-medium flex items-center justify-between gap-1.5 cursor-pointer"
                          >
                            <span className="truncate">{obj.tjm_name || obj.object_name}</span>
                            <span className="text-[9px] text-slate-400 shrink-0">{obj.district_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Point B */}
                  <div className="relative">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs">
                      <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center shrink-0">
                        B
                      </span>
                      <input
                        type="text"
                        placeholder="Qayerga? (Borish manzili / TJM)..."
                        value={endQuery}
                        onFocus={() => setIsEndOpen(true)}
                        onChange={(e) => {
                          setEndQuery(e.target.value);
                          setIsEndOpen(true);
                        }}
                        className="w-full bg-transparent outline-none font-medium text-slate-800 placeholder:text-slate-400 text-xs"
                      />
                      {endQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setEndQuery('');
                            setEndPoint(null);
                            setRouteResult(null);
                            setMatchedTJMs([]);
                            if (!startPoint && typeof window !== 'undefined') {
                              const user = activeUser || getCurrentUser();
                              localStorage.removeItem(getAccountRouteStorageKey(user));
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleSwap}
                        className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md shrink-0 cursor-pointer"
                        title="A va B ni almashtirish"
                      >
                        <ArrowDownUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerPickingMode('B')}
                        className="p-1 bg-slate-200 text-slate-700 rounded-md shrink-0 cursor-pointer"
                        title="Xaritadan belgilash"
                      >
                        <MapPin className="w-3 h-3 text-rose-600" />
                      </button>
                    </div>

                    {isEndOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto p-1.5 space-y-1">
                        {endSuggestions.map(obj => (
                          <button
                            key={obj.source_id}
                            type="button"
                            onClick={() => {
                              handleSetPointFromObject(obj, 'B');
                              setIsEndOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs hover:bg-slate-50 text-slate-800 font-medium flex items-center justify-between gap-1.5 cursor-pointer"
                          >
                            <span className="truncate">{obj.tjm_name || obj.object_name}</span>
                            <span className="text-[9px] text-slate-400 shrink-0">{obj.district_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Action Chips Strip */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={handleQuickNearestAIRoute}
                    className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg shrink-0 flex items-center gap-1 border border-blue-200 active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>⚡ AI Eng yaqin 5</span>
                  </button>

                  <span className="text-slate-400 shrink-0">Radius:</span>
                  {[100, 200, 500].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setBufferRadius(r)}
                      className={`px-1.5 py-0.5 rounded-md shrink-0 font-bold transition-all cursor-pointer ${
                        bufferRadius === r ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {r}m
                    </button>
                  ))}

                  {(startPoint || endPoint) && (
                    <button
                      type="button"
                      onClick={handleClearRoute}
                      className="ml-auto px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-md shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Tozalash</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <RoutePlannerMap
          startPoint={startPoint}
          endPoint={endPoint}
          routeCoords={routeResult ? routeResult.coordinates : []}
          matchedTJMs={matchedTJMs}
          bufferRadiusMeters={bufferRadius}
          allObjects={objects}
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

        {/* Mobile Bottom En-Route Card (Yandex Maps / Yandex Go Navigator style) */}
        {!isNavigating && (
          <div className="md:hidden absolute bottom-2 left-2 right-2 z-[450] animate-in slide-in-from-bottom-3 duration-200 pointer-events-auto">
            {routeResult && matchedTJMs.length > 0 ? (
              /* State B: Active Route En-Route Card */
              <div className="bg-slate-950/95 backdrop-blur-xl border border-white/20 text-white rounded-3xl p-3 shadow-2xl space-y-2.5">
                {/* Top Summary Bar */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[11px] font-semibold text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-black text-xs">
                      📏 {formatDistance(routeResult.distanceMeters)}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-blue-400 font-bold">
                      ⏱️ {formatDuration(routeResult.durationSeconds)}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-emerald-400 font-bold">
                      🏢 {matchedTJMs.length} ta TJM
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSaveRouteToSheets}
                      disabled={isSavingRoute}
                      className="px-2 py-1 bg-white/10 hover:bg-white/20 text-emerald-400 rounded-lg text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <BookmarkCheck className="w-3 h-3" />
                      <span>Saqlash</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearRoute}
                      className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-[10px] font-bold border border-rose-500/30 flex items-center gap-1 active:scale-95 cursor-pointer"
                      title="Bekor qilish (X)"
                    >
                      <X className="w-3 h-3" />
                      <span>Bekor qilish (X)</span>
                    </button>
                  </div>
                </div>

                {/* Current Active Stop Card with Touch Swipe Gestures */}
                {(() => {
                  const currentTJM = matchedTJMs[Math.min(mobileActiveStopIndex, matchedTJMs.length - 1)];
                  if (!currentTJM) return null;
                  const obj = currentTJM.object;
                  const isVisited = Boolean((obj as any).last_visit || (obj as any).is_visited);
                  const detour = getDetourBadge(currentTJM.distFromRoadMeters);

                  return (
                    <div 
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      className="space-y-2 select-none"
                    >
                      {/* Swipe handle hint */}
                      <div 
                        onClick={() => {
                          triggerHaptic(20);
                          setShowMobileStopsDrawer(true);
                        }}
                        className="w-10 h-1 bg-white/30 hover:bg-white/50 rounded-full mx-auto -mt-1 mb-1 cursor-pointer transition-colors" 
                        title="Barcha to'xtashlarni ko'rish uchun bosing yoki yuqoriga suring"
                      />

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                            #{currentTJM.orderNumber}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                                To&apos;xtash {mobileActiveStopIndex + 1}/{matchedTJMs.length}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                isVisited ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {isVisited ? '✓ Borilgan' : 'Borilmagan'}
                              </span>
                            </div>
                            <h4 className="text-xs font-black text-white truncate max-w-[210px]">
                              {obj.tjm_name || obj.object_name}
                            </h4>
                          </div>
                        </div>

                        {/* Prev / Next Stop Steppers */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={mobileActiveStopIndex === 0}
                            onClick={() => {
                              triggerHaptic(20);
                              const newIdx = Math.max(0, mobileActiveStopIndex - 1);
                              setMobileActiveStopIndex(newIdx);
                              if (matchedTJMs[newIdx]) onSelectObject(matchedTJMs[newIdx].object.source_id);
                            }}
                            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-xs flex items-center justify-center cursor-pointer transition-all active:scale-95"
                            title="Oldingi bino (chapga surish)"
                          >
                            ◀
                          </button>
                          <button
                            type="button"
                            disabled={mobileActiveStopIndex >= matchedTJMs.length - 1}
                            onClick={() => {
                              triggerHaptic(20);
                              const newIdx = Math.min(matchedTJMs.length - 1, mobileActiveStopIndex + 1);
                              setMobileActiveStopIndex(newIdx);
                              if (matchedTJMs[newIdx]) onSelectObject(matchedTJMs[newIdx].object.source_id);
                            }}
                            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-xs flex items-center justify-center cursor-pointer transition-all active:scale-95"
                            title="Keyingi bino (o'ngga surish)"
                          >
                            ▶
                          </button>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-300 flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md font-bold border text-[10px] ${detour.className}`}>
                          {detour.label}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span>Marshrut: <b>{formatDistance(currentTJM.distAlongRouteMeters)}</b></span>
                      </div>

                      {/* Big Tactile Action Buttons */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-white/10">
                        <a
                          href={getYandexNavUrl(obj.latitude, obj.longitude)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => triggerHaptic(30)}
                          className="flex-1 py-2 px-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1 shadow-md transition-all"
                          title="Yandex Navigator da ochish"
                        >
                          <Navigation className="w-3.5 h-3.5 text-slate-950" />
                          <span>Yandex Nav</span>
                        </a>

                        {obj.phone && (
                          <a
                            href={getCallUrl(obj.phone)}
                            onClick={() => triggerHaptic(20)}
                            className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md transition-all"
                            title="Qo'ng'iroq"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {onRecordVisit && !isVisited && (
                          <button
                            type="button"
                            onClick={async () => {
                              triggerHaptic(40);
                              await onRecordVisit(obj.source_id);
                              if (mobileActiveStopIndex < matchedTJMs.length - 1) {
                                setMobileActiveStopIndex(prev => prev + 1);
                              }
                            }}
                            className="py-2 px-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                            title="Tashrifni qayd qilish"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Bordim</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic(30);
                            handleStartInCarNavigation();
                          }}
                          className="py-2 px-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 cursor-pointer"
                          title="Jonli haydovchi navigator"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>Haydash</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic(20);
                            setShowMobileStopsDrawer(true);
                          }}
                          className="py-2 px-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                          title="Barcha to'xtash joylari ro'yxati"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>{matchedTJMs.length}</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* State A: No Route Yet - 1-Tap Quick Start Card */
              <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-xl rounded-3xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900">🚗 Yo&apos;l-yo&apos;lakay: Tezkor borish</span>
                    <span className="text-[10px] text-slate-500">(1-bosishda)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(25);
                      handleQuickNearestAIRoute();
                    }}
                    className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold rounded-lg shadow-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>AI 5 ta TJM</span>
                  </button>
                </div>

                {/* Horizontal scroll list of nearest unvisited buildings */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                  {nearestUnvisited.slice(0, 5).map(item => (
                    <button
                      key={item.object.source_id}
                      type="button"
                      onClick={() => {
                        triggerHaptic(20);
                        handleSetDestinationFromNearest(item.object);
                      }}
                      className="bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 p-2 rounded-2xl shrink-0 text-left min-w-[140px] max-w-[180px] space-y-1 transition-all active:scale-95 cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-100/70 px-1.5 py-0.2 rounded-md">
                          {formatDistance(item.dist)}
                        </span>
                        <span className="text-[9px] text-slate-400 truncate">
                          {item.object.district_name || 'Samarqand'}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-800 truncate leading-snug">
                        {item.object.tjm_name || item.object.object_name}
                      </p>
                      <span className="text-[9px] text-emerald-600 font-semibold block">
                        ➔ B nuqta qilib tanlash
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mobile Full Itinerary Drawer with Filter Tabs */}
        {showMobileStopsDrawer && (
          <div 
            className="fixed inset-0 z-[600] flex flex-col justify-end bg-slate-950/60 backdrop-blur-xs md:hidden animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowMobileStopsDrawer(false);
            }}
          >
            <div className="bg-white w-full max-h-[82vh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2 shrink-0" />
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/90">
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Yo&apos;ldagi barcha to&apos;xtashlar ({matchedTJMs.length} ta)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Marshrut bo&apos;ylab ketma-ket joylashuv
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMobileStopsDrawer(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Tabs inside Drawer */}
              <div className="p-2 bg-slate-100/90 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => { triggerHaptic(15); setStopsDrawerFilter('all'); }}
                  className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                    stopsDrawerFilter === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  Barchasi ({matchedTJMs.length})
                </button>
                <button
                  type="button"
                  onClick={() => { triggerHaptic(15); setStopsDrawerFilter('unvisited'); }}
                  className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                    stopsDrawerFilter === 'unvisited' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  ⏳ Borilmagan ({matchedTJMs.filter(t => !t.object.last_visit && !Boolean((t.object as any).is_visited)).length})
                </button>
                <button
                  type="button"
                  onClick={() => { triggerHaptic(15); setStopsDrawerFilter('phone'); }}
                  className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                    stopsDrawerFilter === 'phone' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  📞 Telefon bor ({matchedTJMs.filter(t => Boolean(t.object.phone)).length})
                </button>
                <button
                  type="button"
                  onClick={() => { triggerHaptic(15); setStopsDrawerFilter('priority'); }}
                  className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                    stopsDrawerFilter === 'priority' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  ⭐ Yuqori ustuvor ({matchedTJMs.filter(t => (t.object.priority || '').toLowerCase().includes('yuqori')).length})
                </button>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredDrawerStops.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400 font-semibold">
                    Ushbu filtr bo&apos;yicha to&apos;xtash joyi topilmadi
                  </div>
                ) : (
                  filteredDrawerStops.map((tjm) => {
                    const obj = tjm.object;
                    const isVisited = Boolean((obj as any).last_visit || (obj as any).is_visited);
                    const originalIndex = matchedTJMs.findIndex(m => m.object.source_id === obj.source_id);
                    const isCurrent = originalIndex === mobileActiveStopIndex;
                    const detour = getDetourBadge(tjm.distFromRoadMeters);

                    return (
                      <div
                        key={obj.source_id}
                        onClick={() => {
                          triggerHaptic(20);
                          if (originalIndex !== -1) setMobileActiveStopIndex(originalIndex);
                          onSelectObject(obj.source_id);
                          setShowMobileStopsDrawer(false);
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                          isCurrent 
                            ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                              isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              #{tjm.orderNumber}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-slate-900 truncate">
                                {obj.tjm_name || obj.object_name}
                              </h4>
                              <p className="text-[10px] text-slate-500 truncate">
                                {obj.address || obj.district_name}
                              </p>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                            isVisited ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isVisited ? '✓ Borilgan' : 'Borilmagan'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100/80 mt-2">
                          <span className={`px-1.5 py-0.2 rounded-md font-bold text-[9px] ${detour.className}`}>
                            {detour.label}
                          </span>

                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={getYandexNavUrl(obj.latitude, obj.longitude)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => triggerHaptic(25)}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-[10px] flex items-center gap-1"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>Nav</span>
                            </a>

                            {obj.phone && (
                              <a
                                href={getCallUrl(obj.phone)}
                                onClick={() => triggerHaptic(20)}
                                className="p-1 bg-emerald-600 text-white rounded-lg"
                                title="Qo'ng'iroq"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                            )}

                            {onRecordVisit && !isVisited && (
                              <button
                                type="button"
                                onClick={async () => {
                                  triggerHaptic(30);
                                  await onRecordVisit(obj.source_id);
                                }}
                                className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold rounded-lg text-[10px] cursor-pointer"
                              >
                                Bordim
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Saved Routes Modal (Google Sheets Routes) */}
      {showSavedRoutesModal && (
        <div 
          className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSavedRoutesModal(false);
          }}
        >
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <BookmarkCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Saqlangan Marshrutlar (Google Sheets)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Google Sheets &quot;Routes&quot; varag&apos;ida saqlangan marshrutlar
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
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
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
                      className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          {/* A & B Points */}
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white font-black text-[9px] flex items-center justify-center shrink-0">
                              A
                            </span>
                            <span className="truncate">{rt.start_name}</span>
                            <span className="text-slate-400">➔</span>
                            <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center shrink-0">
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
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
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
                            className="ml-auto text-[10px] text-blue-600 hover:underline cursor-pointer"
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
        objects={objects}
        userLat={userLat}
        userLng={userLng}
        companyId={companyId}
        onApplyRoute={handleApplyAIRoute}
      />
    </div>
  );
}
