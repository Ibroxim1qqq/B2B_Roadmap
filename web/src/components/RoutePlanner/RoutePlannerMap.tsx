'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapObject } from '../../lib/types';
import { 
  TJMAlongRoute, formatDistance, 
  getRouteCumulativeDistances, interpolateRoutePosition, haversineMeters 
} from '../../lib/routeUtils';
import { 
  Crosshair, X, Play, Pause, RotateCcw, FastForward, 
  Locate, Phone, CheckCircle2, Navigation
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
  isDriving?: boolean;
  setIsDriving?: (val: boolean) => void;
  onRecordVisit?: (id: string) => Promise<void>;
}

function createCarDivIcon(bearing: number) {
  return L.divIcon({
    className: 'leaflet-nav-car-icon',
    html: `
      <div class="car-outer" style="position: relative; width: 48px; height: 48px;">
        <div class="car-inner" style="width: 48px; height: 48px; transform: rotate(${bearing}deg); transform-origin: 24px 24px; transition: transform 0.08s linear;">
          <!-- Headlight projection beam on road -->
          <div style="
            position: absolute;
            top: -28px;
            left: 6px;
            width: 36px;
            height: 32px;
            background: linear-gradient(to top, rgba(254, 240, 138, 0.75), rgba(254, 240, 138, 0));
            clip-path: polygon(25% 100%, 75% 100%, 100% 0%, 0% 0%);
            pointer-events: none;
          "></div>

          <!-- Top-down navigation sports car -->
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.55));">
            <!-- Tires -->
            <rect x="6" y="9" width="4.5" height="9" rx="2" fill="#0f172a" />
            <rect x="37.5" y="9" width="4.5" height="9" rx="2" fill="#0f172a" />
            <rect x="6" y="30" width="4.5" height="9" rx="2" fill="#0f172a" />
            <rect x="37.5" y="30" width="4.5" height="9" rx="2" fill="#0f172a" />

            <!-- Car Body -->
            <rect x="8.5" y="7" width="31" height="35" rx="8" fill="#1e3a8a" />
            <rect x="10" y="8" width="28" height="33" rx="7" fill="#2563eb" />

            <!-- Hood Accent -->
            <path d="M14 9 L34 9 L31 15 L17 15 Z" fill="#1d4ed8" opacity="0.6"/>

            <!-- Front Windshield -->
            <path d="M13 16 L35 16 L31 22 L17 22 Z" fill="#93c5fd" opacity="0.9" />

            <!-- Roof & Sunroof -->
            <rect x="14" y="21" width="20" height="12" rx="3" fill="#1e40af" />
            <rect x="16" y="23" width="16" height="8" rx="2" fill="#3b82f6" />

            <!-- Rear Windshield -->
            <path d="M15 33 L33 33 L35 37 L13 37 Z" fill="#93c5fd" opacity="0.9" />

            <!-- LED Headlights -->
            <circle cx="12" cy="8.5" r="2.5" fill="#fef08a" />
            <circle cx="36" cy="8.5" r="2.5" fill="#fef08a" />

            <!-- Taillights -->
            <rect x="11" y="40.5" width="6" height="1.8" rx="0.9" fill="#ef4444" />
            <rect x="31" y="40.5" width="6" height="1.8" rx="0.9" fill="#ef4444" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24]
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
  isDriving = false,
  setIsDriving,
  onRecordVisit
}: RoutePlannerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const driveLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapType, setMapType] = useState<'map' | 'satellite'>('map');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Driving animation state
  const [progress, setProgress] = useState<number>(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [followCar, setFollowCar] = useState<boolean>(true);
  const [activePassingTJM, setActivePassingTJM] = useState<TJMAlongRoute | null>(null);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Refs for animation loop
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const progressRef = useRef<number>(0);
  const carMarkerRef = useRef<L.Marker | null>(null);
  const traveledPolylineRef = useRef<L.Polyline | null>(null);

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
      zoom: 13,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    tileLayerRef.current = tile;
    layerGroupRef.current = L.layerGroup().addTo(map);
    driveLayerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
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
      if (pickingMode) {
        containerRef.current.style.cursor = 'crosshair';
      } else {
        containerRef.current.style.cursor = '';
      }
    }

    return () => {
      map.off('click', handleMapClick);
    };
  }, [pickingMode, onMapClick]);

  // 4. Render Route, Buffer Corridor, and Markers
  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const boundsPoints: [number, number][] = [];

    // A. Show off-route background markers if enabled
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

          const popupContent = `
            <div style="font-family: sans-serif; min-width: 170px; font-size: 12px;">
              <div style="font-weight: bold; color: #1e293b; margin-bottom: 4px;">${obj.tjm_name || obj.object_name}</div>
              <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">${obj.district_name || ''}</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 6px;">
                <button id="btn-pick-a-${obj.source_id}" style="padding: 4px; background: #10b981; color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
                  🟢 A: Shu yerdan
                </button>
                <button id="btn-pick-b-${obj.source_id}" style="padding: 4px; background: #ef4444; color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
                  🔴 B: Shu yerga
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

    // B. Draw Route Line & Buffer Corridor
    if (routeCoords.length > 1) {
      // 1. Buffer corridor
      const bufferCorridor = L.polyline(routeCoords, {
        color: '#60a5fa',
        weight: Math.max(16, Math.round(bufferRadiusMeters / 12)),
        opacity: 0.25,
        lineCap: 'round',
        lineJoin: 'round'
      });
      layerGroup.addLayer(bufferCorridor);

      // 2. Main route line (Blue navigation line)
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

    // C. Start Marker (Point A) - DRAGGABLE
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
        draggable: true,
        title: "Boshlanish nuqtasi (A) - Ko'chirish uchun suring"
      });

      startMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px;">
          <div style="font-weight: bold; color: #059669;">📍 Boshlanish nuqtasi (A)</div>
          <div style="color: #334155; margin-top: 2px;">${startPoint.name}</div>
          <div style="color: #94a3b8; font-size: 10px; margin-top: 4px;">💡 Joyini o'zgartirish uchun nishonni surishingiz mumkin</div>
        </div>
      `);

      startMarker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        onDragStartPoint(pos.lat, pos.lng);
      });

      layerGroup.addLayer(startMarker);
      boundsPoints.push([startPoint.lat, startPoint.lng]);
    }

    // D. End Marker (Point B) - DRAGGABLE
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
        draggable: true,
        title: "Maqsad nuqtasi (B) - Ko'chirish uchun suring"
      });

      endMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px;">
          <div style="font-weight: bold; color: #dc2626;">🏁 Borish manzili (B)</div>
          <div style="color: #334155; margin-top: 2px;">${endPoint.name}</div>
          <div style="color: #94a3b8; font-size: 10px; margin-top: 4px;">💡 Joyini o'zgartirish uchun nishonni surishingiz mumkin</div>
        </div>
      `);

      endMarker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        onDragEndPoint(pos.lat, pos.lng);
      });

      layerGroup.addLayer(endMarker);
      boundsPoints.push([endPoint.lat, endPoint.lng]);
    }

    // E. Numbered TJM Markers along the route (#1, #2, #3...)
    matchedTJMs.forEach((item) => {
      const { object: obj, orderNumber, distFromRoadMeters, distAlongRouteMeters } = item;
      const isSelected = selectedTJMId === obj.source_id;
      const isVisited = Boolean(obj.is_visited || obj.last_visit);
      const isCurrentPassing = activePassingTJM?.object.source_id === obj.source_id;

      let bgColor = isVisited ? '#059669' : isSelected ? '#4f46e5' : '#2563eb';
      if (isCurrentPassing) {
        bgColor = '#f59e0b'; // Gold pulse when passing by
      }

      const scale = isCurrentPassing ? 'scale(1.35)' : isSelected ? 'scale(1.2)' : 'scale(1)';

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
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 8px;">
            <button id="btn-route-a-${obj.source_id}" style="padding: 4px; background: #10b981; color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
              🟢 A: Shu yerdan
            </button>
            <button id="btn-route-b-${obj.source_id}" style="padding: 4px; background: #ef4444; color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">
              🔴 B: Shu yerga
            </button>
          </div>
        </div>
      `);

      marker.on('popupopen', () => {
        const btnA = document.getElementById(`btn-route-a-${obj.source_id}`);
        const btnB = document.getElementById(`btn-route-b-${obj.source_id}`);
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

    // Fit map bounds initially if not driving
    if (boundsPoints.length > 0 && !pickingMode && !isDriving && progressRef.current === 0) {
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
    activePassingTJM,
    onSelectTJM, 
    onSetPointFromObject, 
    onDragStartPoint, 
    onDragEndPoint
  ]);

  // 5. DRIVING SIMULATION ENGINE (RequestAnimationFrame loop)
  useEffect(() => {
    const map = mapRef.current;
    const driveGroup = driveLayerGroupRef.current;
    if (!map || !driveGroup) return;

    // If route has < 2 points, clear drive layer
    if (routeCoords.length < 2) {
      driveGroup.clearLayers();
      carMarkerRef.current = null;
      traveledPolylineRef.current = null;
      return;
    }

    // Initialize car marker and traveled trail polyline if not yet created
    if (!carMarkerRef.current) {
      const initialInterpolation = interpolateRoutePosition(routeCoords, cumulativeDists, progressRef.current);
      
      // Traveled trail (Emerald line showing passed road)
      const traveledLine = L.polyline([routeCoords[0]], {
        color: '#10b981',
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      });
      driveGroup.addLayer(traveledLine);
      traveledPolylineRef.current = traveledLine;

      // Animated Car Marker
      const carMarker = L.marker(initialInterpolation.position, {
        icon: createCarDivIcon(initialInterpolation.bearing),
        zIndexOffset: 1000
      });
      driveGroup.addLayer(carMarker);
      carMarkerRef.current = carMarker;
    }

    // Animation Tick
    if (isDriving) {
      setIsFinished(false);
      lastTimeRef.current = performance.now();

      // Base trip duration: 25 seconds for an average trip
      const baseDurationMs = 26000;

      const animate = (now: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = now;
        const deltaMs = now - lastTimeRef.current;
        lastTimeRef.current = now;

        const deltaProgress = (deltaMs * speedMultiplier) / baseDurationMs;
        const newProgress = Math.min(1, progressRef.current + deltaProgress);
        progressRef.current = newProgress;
        setProgress(newProgress);

        // Compute current car position and bearing
        const state = interpolateRoutePosition(routeCoords, cumulativeDists, newProgress);

        // Update Car Marker LatLng & Rotation
        if (carMarkerRef.current) {
          carMarkerRef.current.setLatLng(state.position);
          const el = carMarkerRef.current.getElement()?.querySelector('.car-inner') as HTMLElement;
          if (el) {
            el.style.transform = `rotate(${state.bearing}deg)`;
          }
        }

        // Update Traveled Polyline trail
        if (traveledPolylineRef.current) {
          traveledPolylineRef.current.setLatLngs(state.traveledCoords);
        }

        // Camera follow
        if (followCar) {
          map.panTo(state.position, { animate: false });
        }

        // Check if passing near any TJM along route (< 70m)
        const passing = matchedTJMs.find(m => {
          const d = haversineMeters(state.position[0], state.position[1], m.object.latitude, m.object.longitude);
          return d <= 70;
        });
        setActivePassingTJM(passing || null);

        // Check if destination is reached
        if (newProgress >= 1) {
          setIsFinished(true);
          if (setIsDriving) setIsDriving(false);
          return;
        }

        animFrameRef.current = requestAnimationFrame(animate);
      };

      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isDriving, speedMultiplier, followCar, routeCoords, cumulativeDists, matchedTJMs, setIsDriving]);

  // Jump to specific progress when user drags slider
  const handleSeek = (newProg: number) => {
    progressRef.current = newProg;
    setProgress(newProg);
    setIsFinished(newProg >= 1);

    const state = interpolateRoutePosition(routeCoords, cumulativeDists, newProg);
    if (carMarkerRef.current) {
      carMarkerRef.current.setLatLng(state.position);
      const el = carMarkerRef.current.getElement()?.querySelector('.car-inner') as HTMLElement;
      if (el) el.style.transform = `rotate(${state.bearing}deg)`;
    }
    if (traveledPolylineRef.current) {
      traveledPolylineRef.current.setLatLngs(state.traveledCoords);
    }
    if (mapRef.current && followCar) {
      mapRef.current.panTo(state.position, { animate: false });
    }
  };

  // Reset Simulation
  const handleReset = () => {
    handleSeek(0);
    if (setIsDriving) setIsDriving(true);
  };

  // Close Simulation
  const handleCloseSimulation = () => {
    if (setIsDriving) setIsDriving(false);
    handleSeek(0);
    if (driveLayerGroupRef.current) {
      driveLayerGroupRef.current.clearLayers();
      carMarkerRef.current = null;
      traveledPolylineRef.current = null;
    }
    // Re-center map to full route
    if (mapRef.current && routeCoords.length > 0) {
      mapRef.current.fitBounds(L.latLngBounds(routeCoords), { padding: [60, 60] });
    }
  };

  // Current passed distance
  const currentPassedDistance = progress * totalDistance;

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full z-10" />

      {/* 1. Picking Mode Floating Banner */}
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

      {/* 2. Approaching/Passing TJM Floating Alert */}
      {activePassingTJM && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] max-w-sm w-11/12 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="bg-white/95 backdrop-blur-md text-slate-900 p-3 rounded-2xl shadow-xl border border-amber-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                #{activePassingTJM.orderNumber}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">Hozirgi TJM</p>
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {activePassingTJM.object.tjm_name || activePassingTJM.object.object_name}
                </h4>
                <p className="text-[10px] text-slate-500">
                  Yo'ldan: <b className="text-slate-700">{activePassingTJM.distFromRoadMeters} m</b>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {activePassingTJM.object.phone && (
                <a
                  href={getCallUrl(activePassingTJM.object.phone)}
                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200"
                  title="Qo'ng'iroq qilish"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              )}
              {onRecordVisit && (
                <button
                  type="button"
                  onClick={() => onRecordVisit(activePassingTJM.object.source_id)}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Tashrif</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Destination Reached Banner */}
      {isFinished && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[500] max-w-sm w-11/12 animate-in zoom-in-95 duration-200">
          <div className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🏁</span>
              <div>
                <p className="text-xs font-black">Manzilga yetib kelindi!</p>
                <p className="text-[11px] text-emerald-100">
                  Marshrutdagi jami {matchedTJMs.length} ta TJM bosib o'tildi.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1 bg-white text-emerald-700 rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-50 cursor-pointer"
            >
              Qayta boshlash
            </button>
          </div>
        </div>
      )}

      {/* 4. DRIVING HUD CONTROLS (Bottom Floating Panel) */}
      {(isDriving || progress > 0 || isFinished) && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] w-11/12 max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 text-white p-3.5 rounded-3xl shadow-2xl flex flex-col gap-2.5">
            {/* Upper row: Play/Pause, Speed, Distance, Camera Toggle, Close */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                {/* Play / Pause */}
                <button
                  type="button"
                  onClick={() => {
                    if (isFinished) {
                      handleReset();
                    } else if (setIsDriving) {
                      setIsDriving(!isDriving);
                    }
                  }}
                  className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                  title={isDriving ? 'Pauza' : 'Davom ettirish'}
                >
                  {isDriving ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                </button>

                {/* Reset */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Qayta boshidan yurish"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Speed Multipliers */}
                <div className="flex items-center bg-white/10 rounded-xl p-0.5 ml-1">
                  {[1, 2, 4].map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setSpeedMultiplier(sp)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-colors cursor-pointer ${
                        speedMultiplier === sp
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {sp}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Distance info */}
              <div className="text-center px-2">
                <span className="text-xs font-bold text-white">
                  {formatDistance(currentPassedDistance)}
                </span>
                <span className="text-[10px] text-slate-400 mx-1">/</span>
                <span className="text-[10px] text-slate-400">
                  {formatDistance(totalDistance)}
                </span>
              </div>

              {/* Camera Follow Toggle & Close */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setFollowCar(!followCar)}
                  className={`px-2 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    followCar
                      ? 'bg-emerald-600/80 text-white'
                      : 'bg-white/10 text-slate-400 hover:text-white'
                  }`}
                  title="Mashinani kuzatish kamerasi"
                >
                  <Locate className="w-3 h-3" />
                  <span>Kamera</span>
                </button>

                <button
                  type="button"
                  onClick={handleCloseSimulation}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Simulyatsiyani yopish"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lower row: Draggable Progress Scrub Bar */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-400 shrink-0">A</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(progress * 100)}
                onChange={(e) => handleSeek(Number(e.target.value) / 100)}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-[10px] font-bold text-rose-400 shrink-0">B</span>
            </div>
          </div>
        </div>
      )}

      {/* Map Switcher (Map / Satellite) */}
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
