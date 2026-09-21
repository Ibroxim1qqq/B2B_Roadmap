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
import { getCallUrl } from '../../lib/utils';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
        <!-- 1. Floating Speed Badge Directly Above the Arrow -->
        <div class="nav-speed-bubble" style="
          position: absolute;
          top: -18px;
          left: 50%;
          transform: translateX(-50%);
          background: #090d16;
          color: #38bdf8;
          border: 1.5px solid #0284c7;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
          padding: 2px 7px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 900;
          font-family: ui-monospace, monospace;
          white-space: nowrap;
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 3px;
        ">
          <span style="color: #22c55e; font-size: 8px;">●</span>
          <span class="speed-val">${speedKmh}</span>
          <span style="font-size: 9px; color: #94a3b8; font-weight: bold;">km/s</span>
        </div>

        <!-- 2. Rotating Arrow Wrapper -->
        <div class="nav-arrow-rotator" style="
          width: 68px;
          height: 68px;
          transform: rotate(${bearing}deg);
          transform-origin: 34px 34px;
          transition: transform 0.18s cubic-bezier(0.2, 0, 0, 1);
        ">
          <!-- Directional Light Beam ahead -->
          <div style="
            position: absolute;
            top: -34px;
            left: 14px;
            width: 40px;
            height: 44px;
            background: linear-gradient(to top, rgba(56, 189, 248, 0.6), rgba(56, 189, 248, 0));
            clip-path: polygon(25% 100%, 75% 100%, 100% 0%, 0% 0%);
            pointer-events: none;
          "></div>

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
      containerRef.current.style.cursor = (!isNavigating && (!startPoint || !endPoint || pickingMode)) 
        ? 'crosshair' 
        : '';
    }

    return () => {
      map.off('click', handleMapClick);
    };
  }, [pickingMode, onMapClick, isNavigating, startPoint, endPoint]);

  // 4. Zoom in closely to Street Level when Navigation Starts!
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isNavigating) return;

    // Zoom in to level 17 (close street level with buildings and street names)
    const targetCenter: [number, number] = driverPos 
      ? driverPos 
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
            } else if (!startPoint) {
              onSetPointFromObject(obj, 'A');
            } else if (!endPoint) {
              onSetPointFromObject(obj, 'B');
            } else {
              onSelectTJM(obj.source_id);
            }
          });

          const popupContent = `
            <div style="font-family: sans-serif; min-width: 170px; font-size: 12px;">
              <div style="font-weight: bold; color: #1e293b; margin-bottom: 4px;">${obj.tjm_name || obj.object_name}</div>
              <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">${obj.district_name || 'Samarqand'}</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 6px;">
                <button id="btn-pick-a-${obj.source_id}" style="padding: 5px; background: #10b981; color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
                  🟢 A: Boshlash
                </button>
                <button id="btn-pick-b-${obj.source_id}" style="padding: 5px; background: #ef4444; color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
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

    // Point A (Start) - Draggable when not navigating
    if (startPoint && !isNavigating) {
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
        draggable: true,
        title: "Boshlanish nuqtasi (A)"
      });

      startMarker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        onDragStartPoint(pos.lat, pos.lng);
      });

      startMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; min-width: 150px;">
          <div style="font-weight: bold; color: #059669; font-size: 13px;">🟢 Boshlanish nuqtasi (A)</div>
          <div style="color: #334155; font-weight: 600; margin-top: 4px;">${startPoint.name}</div>
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
          <div style="color: #334155; font-weight: 600; margin-top: 4px;">${endPoint.name}</div>
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

      const marker = L.marker([obj.latitude, obj.longitude], { icon: tjmIcon });

      const name = obj.tjm_name || obj.object_name;
      const phoneText = obj.phone ? `<div style="margin-top:4px; font-weight:bold; color:#059669;">📞 ${obj.phone}</div>` : '';

      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 190px; font-size: 12px;">
          <div style="font-weight:bold; color:#1e293b; margin-bottom:4px;">#${orderNumber}. ${name}</div>
          <div style="color:#64748b; font-size:11px;">📍 Yo'l boshidan: <b>${formatDistance(distAlongRouteMeters)}</b></div>
          <div style="color:#64748b; font-size:11px;">🛣️ Yo'ldan narida: <b>${distFromRoadMeters} metr</b></div>
          <div style="margin-top:4px;">
            <span style="display:inline-block; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:12px; background:${isVisited ? '#d1fae5' : '#fee2e2'}; color:${isVisited ? '#065f46' : '#991b1b'};">
              ${isVisited ? 'Tashrif qilingan' : 'Tashrif qilinmagan'}
            </span>
          </div>
          ${phoneText}
        </div>
      `);

      marker.on('click', (e) => {
        if (pickingMode) {
          L.DomEvent.stopPropagation(e);
          onSetPointFromObject(obj, pickingMode);
        } else {
          onSelectTJM(obj.source_id);
        }
      });

      layerGroup.addLayer(marker);
      boundsPoints.push([obj.latitude, obj.longitude]);
    });

    // Fit map bounds to route when calculated
    if (routeCoords.length > 1 && !pickingMode && !isNavigating) {
      map.fitBounds(L.latLngBounds(routeCoords), {
        padding: [60, 60],
        maxZoom: 16
      });
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
    onDragEndPoint
  ]);

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

    // Initial position
    if (startPoint) {
      updateDriverPosition(startPoint.lat, startPoint.lng, 0);
    }

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

        let brg: number | undefined = heading !== null && !isNaN(heading) ? heading : undefined;

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
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full z-10" />

      {/* 1. Point Picking Mode Banner */}
      {pickingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] max-w-md w-11/12 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-3 h-3 rounded-full animate-ping shrink-0 ${
                pickingMode === 'A' ? 'bg-emerald-400' : 'bg-rose-400'
              }`} />
              <div className="text-xs font-medium">
                <span className="font-bold block text-white">
                  {pickingMode === 'A' ? "📍 Boshlang'ich nuqtani (A) tanlang:" : "🏁 Borish manzilini (B) tanlang:"}
                </span>
                <span className="text-slate-300 text-[11px]">
                  Xaritada ixtiyoriy joyni yoki TJM obyektini bosing
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onCancelPicking}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
              title="Bekor qilish"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. IN-CAR TURN-BY-TURN DRIVER HUD: TOP UPCOMING TJM CARD */}
      {isNavigating && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] w-11/12 max-w-md animate-in slide-in-from-top-4 duration-200">
          {approachingTJM ? (
            /* Approaching Alert Banner (< 120m) */
            <div className="bg-amber-500 text-slate-950 p-3.5 rounded-2xl shadow-2xl border-2 border-white flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 font-black text-sm flex items-center justify-center shrink-0">
                  #{approachingTJM.tjm.orderNumber}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-900">
                    ⚠️ Oldinda TJM ({approachingTJM.distanceMeters} metrda):
                  </div>
                  <h3 className="text-sm font-black text-slate-950 truncate">
                    {approachingTJM.tjm.object.tjm_name || approachingTJM.tjm.object.object_name}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-900">
                    Yo'ldan: {approachingTJM.tjm.distFromRoadMeters} metr narida
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {approachingTJM.tjm.object.phone && (
                  <a
                    href={getCallUrl(approachingTJM.tjm.object.phone)}
                    className="p-2.5 bg-slate-950 text-white rounded-xl shadow-xs"
                    title="Qo'ng'iroq qilish"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
                {onRecordVisit && (
                  <button
                    type="button"
                    onClick={() => onRecordVisit(approachingTJM.tjm.object.source_id)}
                    className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Tashrif</span>
                  </button>
                )}
              </div>
            </div>
          ) : nextUpcomingTJM ? (
            /* Next Upcoming TJM Banner */
            <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-white/15 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  #{nextUpcomingTJM.tjm.orderNumber}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-blue-400 block uppercase tracking-wider">
                    Keyingi manzil ({formatDistance(nextUpcomingTJM.distanceMeters)}):
                  </span>
                  <p className="text-xs font-bold text-white truncate">
                    {nextUpcomingTJM.tjm.object.tjm_name || nextUpcomingTJM.tjm.object.object_name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Yo'l yoqasida ({nextUpcomingTJM.tjm.distFromRoadMeters} m)
                  </p>
                </div>
              </div>

              {nextUpcomingTJM.tjm.object.phone && (
                <a
                  href={getCallUrl(nextUpcomingTJM.tjm.object.phone)}
                  className="p-2 bg-white/10 hover:bg-white/20 text-emerald-400 rounded-xl"
                  title="Qo'ng'iroq"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/90 backdrop-blur-md text-white p-2.5 rounded-xl shadow-lg border border-white/15 text-center text-xs font-semibold">
              🏁 Manzilga yaqinlashyapsiz
            </div>
          )}
        </div>
      )}

      {/* 3. IN-CAR DRIVER BOTTOM DASHBOARD (Speedometer & Controls) */}
      {isNavigating && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] w-11/12 max-w-lg animate-in slide-in-from-bottom-4 duration-200">
          <div className="bg-slate-950/95 backdrop-blur-xl border-2 border-white/20 text-white p-4 rounded-3xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between gap-3">
              {/* Real Speedometer */}
              <div className="flex items-center gap-2.5 bg-slate-900/90 border border-white/10 px-3.5 py-2 rounded-2xl shrink-0">
                <Gauge className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-xl font-black text-emerald-400 leading-none">
                    {speedKmh}
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    km/soat
                  </div>
                </div>
              </div>

              {/* Distance & ETA to Destination */}
              <div className="min-w-0 flex-1 text-center">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Qolgan masofa
                </p>
                <div className="text-base font-black text-white truncate">
                  {formatDistance(remainingDistance || totalDistance)}
                </div>
                <p className="text-[10px] text-blue-400 font-semibold">
                  Yo'lda: {matchedTJMs.length} ta TJM
                </p>
              </div>

              {/* End Navigation Button */}
              <button
                type="button"
                onClick={onStopNavigation}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
                <span>Tugatish</span>
              </button>
            </div>

            {/* Sub Controls: Sound, Recenter, Mode Switcher */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                {/* Sound Alert Toggle */}
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1.5 rounded-xl border flex items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer ${
                    soundEnabled 
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                  title="Ovozli signal"
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>Signal</span>
                </button>

                {/* Recenter Camera at Close Street Level */}
                <button
                  type="button"
                  onClick={handleRecenter}
                  className={`p-1.5 rounded-xl border flex items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer ${
                    autoFollow 
                      ? 'bg-blue-600/30 border-blue-500 text-blue-400' 
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                  title="Mashinani markazlashtirish (Yaqinlashtirish)"
                >
                  <Locate className="w-3.5 h-3.5" />
                  <span>Kuzatish (17x)</span>
                </button>
              </div>

              {/* Demo Mode toggle (for testing indoors without a car) */}
              <button
                type="button"
                onClick={() => {
                  demoProgressRef.current = 0;
                  setIsDemoMode(!isDemoMode);
                }}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black border transition-colors cursor-pointer ${
                  isDemoMode 
                    ? 'bg-amber-500 text-slate-950 border-amber-400' 
                    : 'bg-white/10 text-slate-300 border-white/10 hover:text-white'
                }`}
              >
                {isDemoMode ? "🛑 GPS ga qaytish" : "🚗 Sinov (Demo)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Top Guidance Banner for 2-Click Setup (A then B) */}
      {!isNavigating && (
        <div className="absolute top-4 left-4 sm:left-1/2 sm:-translate-x-1/2 z-[400] max-w-[calc(100%-170px)] sm:max-w-md pointer-events-auto">
          {!startPoint && (
            <div className="bg-white/95 backdrop-blur-md border border-emerald-400 px-3.5 py-2 rounded-2xl shadow-lg flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                A
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-800 leading-tight">
                  1-bosqich: Boshlanish (A) nuqtasini bosing
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  Xaritadan yoki istalgan TJM ustiga bosing
                </p>
              </div>
            </div>
          )}

          {startPoint && !endPoint && (
            <div className="bg-white/95 backdrop-blur-md border border-rose-400 px-3.5 py-2 rounded-2xl shadow-lg flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
              <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                B
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-800 leading-tight">
                  2-bosqich: Borish (B) manzilini bosing
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  Xaritadan ikkinchi nuqtani bosing
                </p>
              </div>
              {onClearRoute && (
                <button
                  type="button"
                  onClick={onClearRoute}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer shrink-0"
                >
                  Bekor qilish
                </button>
              )}
            </div>
          )}

          {startPoint && endPoint && (
            <div className="bg-white/95 backdrop-blur-md border border-blue-200 px-3.5 py-2 rounded-2xl shadow-lg flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                ✓
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-900 leading-tight">
                  Marshrut: {formatDistance(totalDistance)}
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold truncate">
                  {matchedTJMs.length} ta TJM yo'l bo'yida
                </p>
              </div>
              {onClearRoute && (
                <button
                  type="button"
                  onClick={onClearRoute}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  title="Nuqtalarni tozalash"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Qayta</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Map Switcher (Map / Satellite) */}
      <div className="absolute top-4 right-4 z-[400] flex bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-xl p-1 shadow-sm text-xs font-semibold">
        <button
          onClick={() => setMapType('map')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            mapType === 'map' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Xarita
        </button>
        <button
          onClick={() => setMapType('satellite')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            mapType === 'satellite' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Yo'ldosh
        </button>
      </div>
    </div>
  );
}
