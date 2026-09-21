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
  Gauge, Compass, Play, Pause, Sparkles
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
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Audio may be blocked by browser autoplay policy
  }
}

// Realistic 3D In-Car Navigation Marker Icon
function createDriverNavIcon(bearing: number) {
  return L.divIcon({
    className: 'leaflet-driver-nav-icon',
    html: `
      <div class="nav-marker-wrapper" style="position: relative; width: 50px; height: 50px;">
        <!-- Pulsing radar glow -->
        <div style="
          position: absolute;
          inset: 5px;
          border-radius: 50%;
          background: rgba(37, 99, 235, 0.25);
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          pointer-events: none;
        "></div>

        <!-- Direction light beam on road -->
        <div style="
          position: absolute;
          top: -26px;
          left: 7px;
          width: 36px;
          height: 32px;
          background: linear-gradient(to top, rgba(59, 130, 246, 0.55), rgba(59, 130, 246, 0));
          clip-path: polygon(25% 100%, 75% 100%, 100% 0%, 0% 0%);
          pointer-events: none;
          transform: rotate(${bearing}deg);
          transform-origin: 18px 51px;
        "></div>

        <!-- 3D Sports Navigation Car -->
        <div style="
          width: 50px;
          height: 50px;
          transform: rotate(${bearing}deg);
          transform-origin: 25px 25px;
          transition: transform 0.15s ease-out;
        ">
          <svg width="50" height="50" viewBox="0 0 48 48" fill="none" style="filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));">
            <!-- Tires -->
            <rect x="6" y="9" width="4.5" height="9" rx="2" fill="#0f172a" />
            <rect x="37.5" y="9" width="4.5" height="9" rx="2" fill="#0f172a" />
            <rect x="6" y="30" width="4.5" height="9" rx="2" fill="#0f172a" />
            <rect x="37.5" y="30" width="4.5" height="9" rx="2" fill="#0f172a" />

            <!-- Car Body -->
            <rect x="8.5" y="7" width="31" height="35" rx="8" fill="#1e3a8a" />
            <rect x="10" y="8" width="28" height="33" rx="7" fill="#2563eb" />

            <!-- Windshield -->
            <path d="M13 16 L35 16 L31 22 L17 22 Z" fill="#93c5fd" opacity="0.95" />
            <rect x="14" y="21" width="20" height="11" rx="3" fill="#1d4ed8" />
            <rect x="16" y="23" width="16" height="7" rx="2" fill="#3b82f6" />
            <path d="M15 33 L33 33 L35 37 L13 37 Z" fill="#93c5fd" opacity="0.95" />

            <!-- Headlights -->
            <circle cx="12" cy="8.5" r="2.5" fill="#fef08a" />
            <circle cx="36" cy="8.5" r="2.5" fill="#fef08a" />

            <!-- Taillights -->
            <rect x="11" y="40.5" width="6" height="1.8" rx="0.9" fill="#ef4444" />
            <rect x="31" y="40.5" width="6" height="1.8" rx="0.9" fill="#ef4444" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25]
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
  const accuracyCircleRef = useRef<L.Circle | null>(null);
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

  // 3. Map Click Event when Picking Mode is Active
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (pickingMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleMapClick);

    if (containerRef.current) {
      containerRef.current.style.cursor = pickingMode ? 'crosshair' : '';
    }

    return () => {
      map.off('click', handleMapClick);
    };
  }, [pickingMode, onMapClick]);

  // 4. Render Route, Buffer Corridor, and Static Markers
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
            } else {
              onSelectTJM(obj.source_id);
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

    // Point A (Start) - Draggable when not in active navigation
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

      layerGroup.addLayer(startMarker);
      boundsPoints.push([startPoint.lat, startPoint.lng]);
    }

    // Point B (End) - Draggable when not in active navigation
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
        bgColor = '#f59e0b'; // Gold alert when passing
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

    // Fit map bounds initially when NOT in active navigation
    if (boundsPoints.length > 0 && !pickingMode && !isNavigating) {
      map.fitBounds(L.latLngBounds(boundsPoints), {
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

  // 5. Update Driver Tracking state (GPS or Demo)
  const updateDriverPosition = useCallback((lat: number, lng: number, calculatedSpeed: number, calculatedBearing?: number) => {
    const map = mapRef.current;
    const navGroup = navLayerGroupRef.current;
    if (!map || !navGroup) return;

    setDriverPos([lat, lng]);
    setSpeedKmh(calculatedSpeed);

    // Compute bearing if not supplied
    let brg = calculatedBearing;
    if (brg === undefined && prevGpsPosRef.current) {
      brg = calculateBearing(prevGpsPosRef.current.lat, prevGpsPosRef.current.lng, lat, lng);
    }
    if (brg !== undefined && !isNaN(brg)) {
      setDriverBearing(brg);
    }

    // Render or update Driver Marker
    if (!driverMarkerRef.current) {
      const carMarker = L.marker([lat, lng], {
        icon: createDriverNavIcon(brg || 0),
        zIndexOffset: 2000
      });
      navGroup.addLayer(carMarker);
      driverMarkerRef.current = carMarker;
    } else {
      driverMarkerRef.current.setLatLng([lat, lng]);
      const el = driverMarkerRef.current.getElement()?.querySelector('.nav-marker-wrapper > div:last-child') as HTMLElement;
      if (el && brg !== undefined) {
        el.style.transform = `rotate(${brg}deg)`;
      }
    }

    // Auto-center camera on driver in navigation mode
    if (autoFollow) {
      map.panTo([lat, lng], { animate: true, duration: 0.4 });
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
      
      // If within 120m, this is currently being approached/passed
      if (dist <= 120 && (!passingTJM || dist < passingTJM.distanceMeters)) {
        passingTJM = { tjm: item, distanceMeters: Math.round(dist) };
      }

      // Check upcoming (closest ahead)
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
  }, [autoFollow, endPoint, matchedTJMs, soundEnabled]);

  // 6. REAL IN-CAR GPS NAVIGATION (watchPosition)
  useEffect(() => {
    if (!isNavigating || isDemoMode) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    // Clean previous alerts
    alertedIdsRef.current.clear();
    setAutoFollow(true);

    // Initial position: startPoint or live GPS
    if (startPoint) {
      updateDriverPosition(startPoint.lat, startPoint.lng, 0);
    }

    if (!navigator.geolocation) {
      alert("Qurilmangizda geolokatsiya (GPS) qo'llab-quvvatlanmaydi.");
      return;
    }

    // Start watching real device GPS as car drives
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
          if (dtSeconds > 0 && dMeters > 1) {
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

  // 7. OPTIONAL INDOOR TEST / DEMO SIMULATION
  useEffect(() => {
    if (!isNavigating || !isDemoMode || routeCoords.length < 2) {
      if (demoAnimRef.current) {
        cancelAnimationFrame(demoAnimRef.current);
        demoAnimRef.current = null;
      }
      return;
    }

    demoLastTimeRef.current = performance.now();
    const tripDurationMs = 28000; // ~28 seconds test drive

    const animateDemo = (now: number) => {
      if (!demoLastTimeRef.current) demoLastTimeRef.current = now;
      const dt = now - demoLastTimeRef.current;
      demoLastTimeRef.current = now;

      const deltaProg = dt / tripDurationMs;
      demoProgressRef.current = Math.min(1, demoProgressRef.current + deltaProg);

      const state = interpolateRoutePosition(routeCoords, cumulativeDists, demoProgressRef.current);
      const simulatedSpeed = demoProgressRef.current >= 1 ? 0 : 45 + Math.round(Math.sin(now / 1000) * 8); // 40-50 km/h

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

  // Re-center camera onto car
  const handleRecenter = () => {
    setAutoFollow(true);
    if (mapRef.current && driverPos) {
      mapRef.current.setView(driverPos, 16, { animate: true });
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

                {/* Recenter Camera */}
                <button
                  type="button"
                  onClick={handleRecenter}
                  className={`p-1.5 rounded-xl border flex items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer ${
                    autoFollow 
                      ? 'bg-blue-600/30 border-blue-500 text-blue-400' 
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                  title="Mashinani markazlashtirish"
                >
                  <Locate className="w-3.5 h-3.5" />
                  <span>Kuzatish</span>
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
