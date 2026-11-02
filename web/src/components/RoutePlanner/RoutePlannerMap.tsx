'use client';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapObject } from '../../lib/types';
import { 
  TJMAlongRoute, formatDistance, formatDuration,
  getRouteCumulativeDistances, interpolateRoutePosition, haversineMeters, calculateBearing 
} from '../../lib/routeUtils';
import { 
  Crosshair, X, RotateCcw, 
  Locate, Phone, CheckCircle2, Navigation, Volume2, VolumeX,
  Gauge, Compass, Play, Pause, Sparkles, Layers
} from 'lucide-react';
import { escapeHtml, getCallUrl, getYandexNavUrl } from '../../lib/utils';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Defensive patch for Leaflet's internal DomUtil.getPosition to prevent
// TypeError: Cannot read properties of undefined (reading '_leaflet_pos')
if (typeof window !== 'undefined' && (L as any)?.DomUtil) {
  const domUtil = (L as any).DomUtil;
  if (!domUtil._posPatched) {
    const origGetPosition = domUtil.getPosition;
    domUtil.getPosition = function(el: any) {
      if (!el) return new (L as any).Point(0, 0);
      try {
        return origGetPosition.call(this, el) || new (L as any).Point(0, 0);
      } catch (_) {
        return new (L as any).Point(0, 0);
      }
    };
    domUtil._posPatched = true;
  }
}

function safeFlyTo(map: L.Map | null, center: [number, number], zoom?: number, options?: L.ZoomPanOptions) {
  if (!map) return;
  const lat = typeof center[0] === 'number' ? center[0] : parseFloat(String(center[0]));
  const lng = typeof center[1] === 'number' ? center[1] : parseFloat(String(center[1]));
  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return;

  try {
    const size = map.getSize();
    if (!size || size.x <= 0 || size.y <= 0) {
      map.setView([lat, lng], zoom ?? map.getZoom());
      return;
    }
    map.flyTo([lat, lng], zoom, options);
  } catch (err) {
    try {
      map.setView([lat, lng], zoom ?? map.getZoom());
    } catch (_) {}
  }
}

interface RoutePlannerMapProps {
  startPoint: { lat: number; lng: number; name: string } | null;
  endPoint: { lat: number; lng: number; name: string } | null;
  routeCoords: [number, number][];
  matchedTJMs: TJMAlongRoute[];
  bufferRadiusMeters: number;
  allObjects: MapObject[];
  selectedTJMId: string | null;
  onSelectTJM: (id: string) => void;
  showAllMarkers?: boolean;
  pickingMode: 'A' | 'B' | null;
  onMapClick: (lat: number, lng: number) => void;
  onDragStartPoint: (lat: number, lng: number) => void;
  onDragEndPoint: (lat: number, lng: number) => void;
  onSetPointFromObject: (obj: MapObject, pointType: 'A' | 'B') => void;
  onCancelPicking: () => void;
  onClearRoute?: () => void;
  onStartNavigation?: () => void;
  isNavigating?: boolean;
  onStopNavigation?: () => void;
  onRecordVisit?: (id: string) => Promise<void>;
}

// Pleasant navigation sound alert when approaching a TJM
function playTJMAlertChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Audio may be blocked by browser autoplay policy
  }
}

/**
 * Yandex / Google Maps style 3D Navigation Arrow with floating speed badge
 */
function createYandexNavArrowIcon(bearing: number, speedKmh: number) {
  return L.divIcon({
    className: 'leaflet-yandex-arrow-marker',
    html: `
      <div style="position: relative; width: 68px; height: 68px; pointer-events: none;">
        <!-- 2. Rotating Arrow Wrapper -->
        <div class="nav-arrow-rotator" style="
          width: 68px;
          height: 68px;
          transform: rotate(${bearing}deg);
          transform-origin: 34px 34px;
          transition: transform 0.18s cubic-bezier(0.2, 0, 0, 1);
        ">
          <!-- Yandex/Google 3D Navigation Arrow SVG -->
          <svg width="68" height="68" viewBox="0 0 64 64" fill="none" style="filter: drop-shadow(0 6px 16px rgba(2, 6, 23, 0.6));">
            <!-- Pulsing Halo Circle -->
            <circle cx="32" cy="32" r="28" fill="rgba(56, 189, 248, 0.15)" />

            <!-- Outer Sharp Border for high contrast -->
            <path d="M32 4 L56 56 L32 43 L8 56 Z" fill="white" stroke="#090d16" stroke-width="2.2" stroke-linejoin="round"/>

            <!-- Left Wing (Cyan Gradient) -->
            <path d="M32 7 L11 53 L32 42 Z" fill="url(#nav-grad-left)" />

            <!-- Right Wing (Brighter Cyan Gradient) -->
            <path d="M32 7 L53 53 L32 42 Z" fill="url(#nav-grad-right)" />

            <!-- Center Spine Ridge -->
            <line x1="32" y1="7" x2="32" y2="42" stroke="#e0f2fe" stroke-width="1.8" stroke-linecap="round"/>

            <!-- Center GPS Core Dot -->
            <circle cx="32" cy="33" r="3.5" fill="#ffffff" filter="drop-shadow(0 0 5px #38bdf8)" />

            <defs>
              <linearGradient id="nav-grad-left" x1="11" y1="7" x2="32" y2="53" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#0284c7" />
                <stop offset="100%" stop-color="#0369a1" />
              </linearGradient>
              <linearGradient id="nav-grad-right" x1="53" y1="7" x2="32" y2="53" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#38bdf8" />
                <stop offset="100%" stop-color="#0ea5e9" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    `,
    iconSize: [68, 68],
    iconAnchor: [34, 34]
  });
}

/**
 * Custom SVG Location Pin Cursor for Point A (Emerald Green) and Point B (Rose Red)
 * Hotspot is precisely at the bottom tip of the pin (19, 45).
 */
function getPinCursor(type: 'A' | 'B'): string {
  const isA = type === 'A';
  const mainColor = isA ? '#10b981' : '#ef4444';
  const strokeInner = isA ? '#059669' : '#dc2626';
  const textColor = isA ? '#047857' : '#b91c1c';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="48" viewBox="0 0 38 48" fill="none"><ellipse cx="19" cy="45" rx="7" ry="2.5" fill="black" fill-opacity="0.35"/><path d="M19 45 C19 45 34 29 34 18 C34 9.16 27.28 2 19 2 C10.72 2 4 9.16 4 18 C4 29 19 45 19 45 Z" fill="${mainColor}" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/><circle cx="19" cy="18" r="9" fill="#ffffff" stroke="${strokeInner}" stroke-width="1.5"/><text x="19" y="22.5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" fill="${textColor}" text-anchor="middle">${type}</text></svg>`;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 19 45, crosshair`;
}

export default function RoutePlannerMap({
  startPoint,
  endPoint,
  routeCoords,
  matchedTJMs,
  bufferRadiusMeters,
  allObjects,
  selectedTJMId,
  onSelectTJM,
  showAllMarkers = false,
  pickingMode,
  onMapClick,
  onDragStartPoint,
  onDragEndPoint,
  onSetPointFromObject,
  onCancelPicking,
  onClearRoute,
  onStartNavigation,
  isNavigating = false,
  onStopNavigation,
  onRecordVisit
}: RoutePlannerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const navLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapType, setMapType] = useState<'map' | 'satellite'>('map');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Active pick type: 'A' (green pin) or 'B' (red pin) or null
  const activePickType: 'A' | 'B' | null = useMemo(() => {
    if (isNavigating) return null;
    if (pickingMode === 'A' || !startPoint) return 'A';
    if (pickingMode === 'B' || (startPoint && !endPoint)) return 'B';
    return null;
  }, [isNavigating, pickingMode, startPoint, endPoint]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => mapRef.current?.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Live Driver State (Real GPS)
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const [driverBearing, setDriverBearing] = useState<number>(0);
  const [speedKmh, setSpeedKmh] = useState<number>(0);

  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [approachingTJM, setApproachingTJM] = useState<{ tjm: TJMAlongRoute; distanceMeters: number } | null>(null);
  const [nextUpcomingTJM, setNextUpcomingTJM] = useState<{ tjm: TJMAlongRoute; distanceMeters: number } | null>(null);
  const [remainingDistance, setRemainingDistance] = useState<number>(0);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Animation & Watcher Refs
  const watchIdRef = useRef<number | null>(null);
  const prevGpsPosRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const alertedIdsRef = useRef<Set<string>>(new Set());

  // Demo simulation refs for indoor testing
  const demoAnimRef = useRef<number | null>(null);
  const demoProgressRef = useRef<number>(0);
  const demoLastTimeRef = useRef<number | null>(null);

  // Cumulative distances along route
  const cumulativeDists = useMemo(() => {
    return getRouteCumulativeDistances(routeCoords);
  }, [routeCoords]);

  const totalDistance = cumulativeDists[cumulativeDists.length - 1] || 0;

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [39.6542, 66.9597],
      zoom: 14,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    tileLayerRef.current = tile;
    layerGroupRef.current = L.layerGroup().addTo(map);
    navLayerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Detect user manual dragging to detach auto-follow
    map.on('dragstart', () => {
      setAutoFollow(false);
    });

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (demoAnimRef.current) cancelAnimationFrame(demoAnimRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Tile layer switcher (OSM vs Satellite)
  useEffect(() => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    if (mapType === 'satellite') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18, attribution: '&copy; Esri World Imagery' }
      ).addTo(mapRef.current);
    } else {
      tileLayerRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 19, attribution: '&copy; OpenStreetMap' }
      ).addTo(mapRef.current);
    }
  }, [mapType]);

  // 3. Map Click Event: 1st click = Point A, 2nd click = Point B
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!isNavigating) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleMapClick);

    if (containerRef.current) {
      if (activePickType) {
        containerRef.current.style.cursor = getPinCursor(activePickType);
      } else {
        containerRef.current.style.cursor = '';
      }
    }

    return () => {
      map.off('click', handleMapClick);
    };
  }, [activePickType, onMapClick, isNavigating]);


  // 4. Zoom in closely to Street Level when Navigation Starts!
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isNavigating) return;

    // Zoom in to level 17 (close street level with buildings and street names)
    const targetCenter: [number, number] = driverPos 
      ? driverPos 
      : routeCoords.length > 0 
        ? routeCoords[0]
        : startPoint 
          ? [startPoint.lat, startPoint.lng] 
          : [39.6542, 66.9597];

    map.setView(targetCenter, 17, {
      animate: true,
      duration: 0.8
    });
    setAutoFollow(true);
  }, [isNavigating]);

  // 5. Render Route, Buffer Corridor, and Static Markers
  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    try {
      map.closePopup();
    } catch (_) {}

    layerGroup.clearLayers();

    const boundsPoints: [number, number][] = [];

    // Background markers
    if (showAllMarkers) {
      allObjects.forEach(obj => {
        if (!obj.latitude || !obj.longitude) return;
        const isMatched = matchedTJMs.some(m => m.object.source_id === obj.source_id);
        if (!isMatched) {
          const smallDot = L.circleMarker([obj.latitude, obj.longitude], {
            radius: 5,
            color: '#64748b',
            fillColor: '#94a3b8',
            fillOpacity: 0.6,
            weight: 1.5
          });

          smallDot.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            if (pickingMode) {
              onSetPointFromObject(obj, pickingMode);
            } else {
              onSelectTJM(String(obj.source_id));
            }
          });

          const popupContent = `
            <div style="font-family: sans-serif; min-width: 170px; font-size: 12px;">
              <div style="font-weight: bold; color: #1e293b; margin-bottom: 4px;">${escapeHtml(obj.tjm_name || obj.object_name)}</div>
              <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">${escapeHtml(obj.district_name || obj.region_name || '')}</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 6px;">
                <button id="btn-pick-a-${escapeHtml(obj.source_id)}" style="padding: 5px; background: #10b981; color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
                  🟢 A: Boshlash
                </button>
                <button id="btn-pick-b-${escapeHtml(obj.source_id)}" style="padding: 5px; background: #ef4444; color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
                  🔴 B: Borish
                </button>
              </div>
            </div>
          `;

          smallDot.bindPopup(popupContent);
          smallDot.on('popupopen', () => {
            const btnA = document.getElementById(`btn-pick-a-${obj.source_id}`);
            const btnB = document.getElementById(`btn-pick-b-${obj.source_id}`);
            if (btnA) {
              btnA.onclick = () => {
                onSetPointFromObject(obj, 'A');
                map.closePopup();
              };
            }
            if (btnB) {
              btnB.onclick = () => {
                onSetPointFromObject(obj, 'B');
                map.closePopup();
              };
            }
          });

          layerGroup.addLayer(smallDot);
        }
      });
    }

    // Route Line & Buffer
    if (routeCoords.length > 1) {
      const bufferCorridor = L.polyline(routeCoords, {
        color: '#60a5fa',
        weight: Math.max(16, Math.round(bufferRadiusMeters / 12)),
        opacity: 0.25,
        lineCap: 'round',
        lineJoin: 'round'
      });
      layerGroup.addLayer(bufferCorridor);

      const routeLine = L.polyline(routeCoords, {
        color: '#2563eb',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      });
      layerGroup.addLayer(routeLine);

      routeCoords.forEach(c => boundsPoints.push(c));
    }

    // Point A (Start) - Visible always, Draggable when not navigating
    if (startPoint) {
      const startIcon = L.divIcon({
        className: 'custom-start-marker',
        html: `
          <div style="
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            width: 38px;
            height: 38px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.45);
            border: 3px solid white;
            cursor: grab;
          ">
            <span style="transform: rotate(45deg); font-weight: 900; font-size: 14px;">A</span>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38]
      });

      const startMarker = L.marker([startPoint.lat, startPoint.lng], {
        icon: startIcon,
        draggable: !isNavigating,
        title: "Boshlanish nuqtasi (A)"
      });

      startMarker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        onDragStartPoint(pos.lat, pos.lng);
      });

      startMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; min-width: 150px;">
          <div style="font-weight: bold; color: #059669; font-size: 13px;">🟢 Boshlanish nuqtasi (A)</div>
          <div style="color: #334155; font-weight: 600; margin-top: 4px;">${escapeHtml(startPoint.name)}</div>
          <div style="color: #94a3b8; font-size: 10px; margin-top: 4px;">📍 Joyini o'zgartirish uchun sudrang</div>
        </div>
      `);

      layerGroup.addLayer(startMarker);
      boundsPoints.push([startPoint.lat, startPoint.lng]);
    }

    // Point B (End) - Draggable when not navigating
    if (endPoint) {
      const endIcon = L.divIcon({
        className: 'custom-end-marker',
        html: `
          <div style="
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            width: 38px;
            height: 38px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.45);
            border: 3px solid white;
            cursor: grab;
          ">
            <span style="transform: rotate(45deg); font-weight: 900; font-size: 14px;">B</span>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38]
      });

      const endMarker = L.marker([endPoint.lat, endPoint.lng], {
        icon: endIcon,
        draggable: !isNavigating,
        title: "Maqsad nuqtasi (B)"
      });

      endMarker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        onDragEndPoint(pos.lat, pos.lng);
      });

      endMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; min-width: 150px;">
          <div style="font-weight: bold; color: #dc2626; font-size: 13px;">🔴 Borish manzili (B)</div>
          <div style="color: #334155; font-weight: 600; margin-top: 4px;">${escapeHtml(endPoint.name)}</div>
          <div style="color: #94a3b8; font-size: 10px; margin-top: 4px;">📍 Joyini o'zgartirish uchun sudrang</div>
        </div>
      `);

      layerGroup.addLayer(endMarker);
      boundsPoints.push([endPoint.lat, endPoint.lng]);
    }

    // Numbered TJM Markers along Route
    matchedTJMs.forEach((item) => {
      const { object: obj, orderNumber, distFromRoadMeters, distAlongRouteMeters } = item;
      const isSelected = selectedTJMId === obj.source_id;
      const isVisited = Boolean(obj.is_visited || obj.last_visit);
      const isApproaching = approachingTJM?.tjm.object.source_id === obj.source_id;

      let bgColor = isVisited ? '#059669' : isSelected ? '#4f46e5' : '#2563eb';
      if (isApproaching) {
        bgColor = '#f59e0b'; // Gold alert when approaching
      }

      const scale = isApproaching ? 'scale(1.4)' : isSelected ? 'scale(1.2)' : 'scale(1)';

      const tjmIcon = L.divIcon({
        className: `tjm-route-marker-${obj.source_id}`,
        html: `
          <div style="
            background: ${bgColor};
            color: white;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 13px;
            border: 3px solid white;
            box-shadow: 0 3px 10px rgba(0,0,0,0.3);
            transform: ${scale};
            transition: transform 0.25s, background 0.25s;
            cursor: pointer;
          ">
            ${orderNumber}
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const objLat = typeof obj.latitude === 'number' ? obj.latitude : parseFloat(String(obj.latitude));
      const objLng = typeof obj.longitude === 'number' ? obj.longitude : parseFloat(String(obj.longitude));
      if (isNaN(objLat) || isNaN(objLng) || !isFinite(objLat) || !isFinite(objLng)) return;

      const marker = L.marker([objLat, objLng], { icon: tjmIcon });

      const name = obj.tjm_name || obj.object_name;
      const phoneText = obj.phone ? `<div style="margin-top:4px; font-weight:bold; color:#059669;">📞 ${escapeHtml(obj.phone)}</div>` : '';

      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 190px; font-size: 12px;">
          <div style="font-weight:bold; color:#1e293b; margin-bottom:4px;">#${orderNumber}. ${escapeHtml(name)}</div>
          <div style="color:#64748b; font-size:11px;">📍 Yo'l boshidan: <b>${formatDistance(distAlongRouteMeters)}</b></div>
          <div style="color:#64748b; font-size:11px;">🛣️ Yo'ldan narida: <b>${distFromRoadMeters} metr</b></div>
          <div style="margin-top:4px;">
            <span style="display:inline-block; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:12px; background:${isVisited ? '#d1fae5' : '#fee2e2'}; color:${isVisited ? '#065f46' : '#991b1b'};">
              ${isVisited ? 'Tashrif qilingan' : 'Tashrif qilinmagan'}
            </span>
          </div>
          ${phoneText}
        </div>
      `, { autoPan: false });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (pickingMode) {
          onSetPointFromObject(obj, pickingMode);
        } else {
          onSelectTJM(String(obj.source_id));
        }
      });

      layerGroup.addLayer(marker);
      boundsPoints.push([objLat, objLng]);
    });

    // Fit map bounds to route ONLY when route coordinates first load/change, not on every object selection
    if (routeCoords.length > 1 && !pickingMode && !isNavigating && !selectedTJMId) {
      try {
        map.fitBounds(L.latLngBounds(routeCoords), {
          padding: [60, 60],
          maxZoom: 16
        });
      } catch (err) {
        console.warn('Map fitBounds safe catch:', err);
      }
    }
  }, [
    routeCoords, 
    matchedTJMs, 
    startPoint, 
    endPoint, 
    bufferRadiusMeters, 
    selectedTJMId, 
    showAllMarkers, 
    allObjects, 
    pickingMode,
    isNavigating,
    approachingTJM,
    onSelectTJM, 
    onSetPointFromObject, 
    onDragStartPoint, 
  ]);

  // Smoothly glide map to selected TJM with mobile bottom sheet offset (strictly numerical coords)
  useEffect(() => {
    if (!selectedTJMId || !mapRef.current || isNavigating) return;
    const target = allObjects.find(o => String(o.source_id) === String(selectedTJMId));
    if (target && target.latitude && target.longitude) {
      const map = mapRef.current;
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const numLat = typeof target.latitude === 'number' ? target.latitude : parseFloat(String(target.latitude));
      const numLng = typeof target.longitude === 'number' ? target.longitude : parseFloat(String(target.longitude));
      if (isNaN(numLat) || isNaN(numLng)) return;

      // On mobile, offset latitude down slightly so the marker sits nicely in the upper portion above the bottom drawer
      const offsetLat = isMobile ? -0.003 : 0;
      safeFlyTo(map, [numLat + offsetLat, numLng], Math.max(map.getZoom(), 15), {
        duration: 0.8,
        easeLinearity: 0.25
      });
    }
  }, [selectedTJMId, allObjects, isNavigating]);

  // 6. Update Driver Tracking state (GPS or Demo)
  const updateDriverPosition = useCallback((lat: number, lng: number, calculatedSpeed: number, calculatedBearing?: number) => {
    const map = mapRef.current;
    const navGroup = navLayerGroupRef.current;
    if (!map || !navGroup) return;

    setDriverPos([lat, lng]);
    setSpeedKmh(calculatedSpeed);

    // Compute bearing if not supplied
    let brg = calculatedBearing;
    if (brg === undefined && prevGpsPosRef.current) {
      const dMeters = haversineMeters(prevGpsPosRef.current.lat, prevGpsPosRef.current.lng, lat, lng);
      // Only update bearing if moved more than 1.5 meters to prevent jitter
      if (dMeters >= 1.5) {
        brg = calculateBearing(prevGpsPosRef.current.lat, prevGpsPosRef.current.lng, lat, lng);
      } else {
        brg = driverBearing;
      }
    }
    if (brg !== undefined && !isNaN(brg)) {
      setDriverBearing(brg);
    }

    // Render or update Yandex/Google Navigation Arrow Marker
    if (!driverMarkerRef.current) {
      const arrowMarker = L.marker([lat, lng], {
        icon: createYandexNavArrowIcon(brg || 0, calculatedSpeed),
        zIndexOffset: 2000
      });
      navGroup.addLayer(arrowMarker);
      driverMarkerRef.current = arrowMarker;
    } else {
      driverMarkerRef.current.setLatLng([lat, lng]);

      // Rotate arrow
      const rotatorEl = driverMarkerRef.current.getElement()?.querySelector('.nav-arrow-rotator') as HTMLElement;
      if (rotatorEl && brg !== undefined) {
        rotatorEl.style.transform = `rotate(${brg}deg)`;
      }

      // Update speed value inside floating speed bubble
      const speedValEl = driverMarkerRef.current.getElement()?.querySelector('.speed-val') as HTMLElement;
      if (speedValEl) {
        speedValEl.textContent = String(calculatedSpeed);
      }
    }

    // Auto-center camera on driver in street-level zoom
    if (autoFollow) {
      map.panTo([lat, lng], { animate: true, duration: 0.35 });
    }

    // Calculate remaining distance to destination (Point B)
    if (endPoint) {
      const dEnd = haversineMeters(lat, lng, endPoint.lat, endPoint.lng);
      setRemainingDistance(dEnd);
    }

    // Find the next upcoming TJM and any TJM we are currently passing (< 120m)
    let closestTJM: { tjm: TJMAlongRoute; distanceMeters: number } | null = null;
    let passingTJM: { tjm: TJMAlongRoute; distanceMeters: number } | null = null;
    let minUpcomingDist = Infinity;

    for (const item of matchedTJMs) {
      const dist = haversineMeters(lat, lng, item.object.latitude, item.object.longitude);
      
      // If within 120m, this is currently being approached
      if (dist <= 120 && (!passingTJM || dist < passingTJM.distanceMeters)) {
        passingTJM = { tjm: item, distanceMeters: Math.round(dist) };
      }

      // Upcoming closest ahead
      if (dist < minUpcomingDist) {
        minUpcomingDist = dist;
        closestTJM = { tjm: item, distanceMeters: Math.round(dist) };
      }
    }

    setApproachingTJM(passingTJM);
    setNextUpcomingTJM(closestTJM);

    // Play chime sound when entering approaching zone if not yet alerted
    if (passingTJM) {
      const tjmId = passingTJM.tjm.object.source_id;
      if (!alertedIdsRef.current.has(tjmId)) {
        alertedIdsRef.current.add(tjmId);
        if (soundEnabled) {
          playTJMAlertChime();
        }
      }
    }
  }, [autoFollow, endPoint, matchedTJMs, soundEnabled, driverBearing]);

  // 7. REAL IN-CAR GPS NAVIGATION (watchPosition)
  useEffect(() => {
    if (!isNavigating || isDemoMode) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    alertedIdsRef.current.clear();
    setAutoFollow(true);

    // Initial position: start from where the route starts (user's current location)
    const initialPos: [number, number] = (routeCoords.length > 0)
      ? routeCoords[0]
      : startPoint 
        ? [startPoint.lat, startPoint.lng]
        : [39.6542, 66.9597];

    updateDriverPosition(initialPos[0], initialPos[1], 0);

    if (!navigator.geolocation) {
      alert("Qurilmangizda geolokatsiya (GPS) qo'llab-quvvatlanmaydi.");
      return;
    }

    // Start watching real device GPS as car moves
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading } = pos.coords;
        const now = Date.now();

        // Calculate speed in km/h
        let currentSpeed = 0;
        if (speed !== null && !isNaN(speed) && speed > 0) {
          currentSpeed = Math.round(speed * 3.6);
        } else if (prevGpsPosRef.current) {
          const dMeters = haversineMeters(prevGpsPosRef.current.lat, prevGpsPosRef.current.lng, latitude, longitude);
          const dtSeconds = (now - prevGpsPosRef.current.time) / 1000;
          if (dtSeconds > 0 && dMeters > 1.5) {
            currentSpeed = Math.round((dMeters / dtSeconds) * 3.6);
          }
        }

        const brg: number | undefined = heading !== null && !isNaN(heading) ? heading : undefined;

        updateDriverPosition(latitude, longitude, currentSpeed, brg);
        prevGpsPosRef.current = { lat: latitude, lng: longitude, time: now };
      },
      (err) => {
        console.warn("GPS watch position error:", err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000
      }
    );

    watchIdRef.current = id;

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isNavigating, isDemoMode, startPoint, updateDriverPosition]);

  // 8. OPTIONAL INDOOR TEST / DEMO SIMULATION
  useEffect(() => {
    if (!isNavigating || !isDemoMode || routeCoords.length < 2) {
      if (demoAnimRef.current) {
        cancelAnimationFrame(demoAnimRef.current);
        demoAnimRef.current = null;
      }
      return;
    }

    demoLastTimeRef.current = performance.now();
    const tripDurationMs = 28000;

    const animateDemo = (now: number) => {
      if (!demoLastTimeRef.current) demoLastTimeRef.current = now;
      const dt = now - demoLastTimeRef.current;
      demoLastTimeRef.current = now;

      const deltaProg = dt / tripDurationMs;
      demoProgressRef.current = Math.min(1, demoProgressRef.current + deltaProg);

      const state = interpolateRoutePosition(routeCoords, cumulativeDists, demoProgressRef.current);
      const simulatedSpeed = demoProgressRef.current >= 1 ? 0 : 45 + Math.round(Math.sin(now / 1000) * 8); // 40-52 km/h

      updateDriverPosition(state.position[0], state.position[1], simulatedSpeed, state.bearing);

      if (demoProgressRef.current < 1) {
        demoAnimRef.current = requestAnimationFrame(animateDemo);
      }
    };

    demoAnimRef.current = requestAnimationFrame(animateDemo);

    return () => {
      if (demoAnimRef.current) {
        cancelAnimationFrame(demoAnimRef.current);
        demoAnimRef.current = null;
      }
    };
  }, [isNavigating, isDemoMode, routeCoords, cumulativeDists, updateDriverPosition]);

  // Cleanup nav layer when exiting navigation
  useEffect(() => {
    if (!isNavigating && navLayerGroupRef.current) {
      navLayerGroupRef.current.clearLayers();
      driverMarkerRef.current = null;
      setDriverPos(null);
      setApproachingTJM(null);
      setNextUpcomingTJM(null);
      setIsDemoMode(false);
      demoProgressRef.current = 0;
    }
  }, [isNavigating]);

  // Re-center camera onto car at close street level
  const handleRecenter = () => {
    setAutoFollow(true);
    if (mapRef.current && driverPos) {
      mapRef.current.setView(driverPos, 17, { animate: true });
    }
  };

  return (
    <div 
      className={`relative w-full h-full select-none ${
        activePickType === 'A' 
          ? 'cursor-pin-A' 
          : activePickType === 'B' 
            ? 'cursor-pin-B' 
            : ''
      }`}
    >
      {/* Global Scoped Cursor Rules for Leaflet Elements */}
      <style>{`
        .cursor-pin-A,
        .cursor-pin-A *,
        .cursor-pin-A .leaflet-container,
        .cursor-pin-A .leaflet-grab,
        .cursor-pin-A .leaflet-interactive {
          cursor: ${getPinCursor('A')} !important;
        }
        .cursor-pin-B,
        .cursor-pin-B *,
        .cursor-pin-B .leaflet-container,
        .cursor-pin-B .leaflet-grab,
        .cursor-pin-B .leaflet-interactive {
          cursor: ${getPinCursor('B')} !important;
        }
      `}</style>

      <div ref={containerRef} className="w-full h-full z-10" />

      {/* 1. Point picking hint (the phone layout shows its own) */}
      {activePickType && (
        <div className="hidden md:flex absolute top-4 left-1/2 -translate-x-1/2 z-[500] h-10 px-4 rounded-lg bg-white shadow-md items-center gap-3 text-[13px]">
          <span className="text-slate-900 whitespace-nowrap">
            {activePickType === 'A' ? 'Boshlanish joyini tanlang' : 'Borish joyini tanlang'}
          </span>
          {pickingMode && (
            <button type="button" onClick={onCancelPicking} className="text-slate-500 hover:text-slate-900 cursor-pointer">
              Bekor
            </button>
          )}
        </div>
      )}

      {/* 2. Driving: next stop */}
      {isNavigating && (() => {
        const stop = approachingTJM ?? nextUpcomingTJM;
        const obj = stop?.tjm.object;
        const iconLink = 'w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 shrink-0';

        return (
          <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-[500] w-[calc(100%-1.5rem)] max-w-md bg-white rounded-xl shadow-md px-3 py-2 flex items-center gap-2 ${
            approachingTJM ? 'ring-2 ring-[#1b815f]' : ''
          }`}>
            {stop && obj ? (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">
                    {approachingTJM ? `${approachingTJM.distanceMeters} m qoldi` : `Keyingi: ${formatDistance(stop.distanceMeters)}`}
                  </p>
                  <p className="text-[13px] font-medium text-slate-900 truncate">{obj.tjm_name || obj.object_name}</p>
                </div>
                {obj.phone && (
                  <a href={getCallUrl(obj.phone)} title={obj.phone} className={iconLink}>
                    <Phone className="w-4 h-4" />
                  </a>
                )}
                <a
                  href={getYandexNavUrl(obj.latitude, obj.longitude)}
                  target="_blank"
                  rel="noreferrer"
                  title="Yandex Navigator"
                  className={iconLink}
                >
                  <Navigation className="w-4 h-4" />
                </a>
                {approachingTJM && onRecordVisit && (
                  <button
                    type="button"
                    onClick={() => onRecordVisit(obj.source_id)}
                    className="h-9 px-3 rounded-lg bg-[#1b815f] hover:bg-[#15674c] text-white text-xs font-medium cursor-pointer shrink-0"
                  >
                    Bordim
                  </button>
                )}
              </>
            ) : (
              <p className="py-1.5 text-[13px] text-slate-900">Manzilga yaqinlashyapsiz</p>
            )}
          </div>
        );
      })()}

      {/* 3. Driving: speed, remaining distance and controls */}
      {isNavigating && (() => {
        const control = (active: boolean) => `w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
          active ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
        }`;

        return (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[500] w-[calc(100%-1.5rem)] max-w-md bg-white rounded-xl shadow-md p-2 flex items-center gap-2">
            <div className="px-2 text-center shrink-0">
              <p className="text-lg font-semibold text-slate-900 leading-none tabular-nums">{speedKmh}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">km/soat</p>
            </div>

            <div className="min-w-0 flex-1 pl-2 border-l border-slate-100">
              <p className="text-[13px] font-medium text-slate-900 truncate tabular-nums">{formatDistance(remainingDistance || totalDistance)} qoldi</p>
              <p className="text-xs text-slate-500 truncate">{matchedTJMs.length} ta TJM</p>
            </div>

            <button type="button" onClick={() => setSoundEnabled(!soundEnabled)} title={soundEnabled ? 'Ovozni o\'chirish' : 'Ovozni yoqish'} className={control(soundEnabled)}>
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button type="button" onClick={handleRecenter} title="Mashinani markazga olish" className={control(autoFollow)}>
              <Locate className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                demoProgressRef.current = 0;
                setIsDemoMode(!isDemoMode);
              }}
              title={isDemoMode ? 'GPS ga qaytish' : 'Sinov rejimi'}
              className={`${control(isDemoMode)} max-md:hidden`}
            >
              {isDemoMode ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onStopNavigation}
              title="Tugatish"
              className="h-9 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer shrink-0"
            >
              Tugatish
            </button>
          </div>
        );
      })()}

      {/* 4. Map Switcher (Map / Satellite) */}
      <div className="absolute top-1/2 -translate-y-1/2 right-2 md:top-4 md:translate-y-0 md:right-4 z-[400] flex bg-white rounded-lg p-0.5 shadow-md text-xs">
        <button
          onClick={() => setMapType('map')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            mapType === 'map' ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Xarita
        </button>
        <button
          onClick={() => setMapType('satellite')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            mapType === 'satellite' ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Satelit
        </button>
      </div>
    </div>
  );
}
