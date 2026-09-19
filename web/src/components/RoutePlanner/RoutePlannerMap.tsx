'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapObject } from '../../lib/types';
import { TJMAlongRoute, formatDistance } from '../../lib/routeUtils';

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
  showAllMarkers = false
}: RoutePlannerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapType, setMapType] = useState<'map' | 'satellite'>('map');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

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
    mapRef.current = map;

    return () => {
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

  // 3. Render Route, Buffer Corridor, and Markers
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
            radius: 4,
            color: '#94a3b8',
            fillColor: '#cbd5e1',
            fillOpacity: 0.5,
            weight: 1
          });
          smallDot.on('click', () => onSelectTJM(obj.source_id));
          layerGroup.addLayer(smallDot);
        }
      });
    }

    // B. Draw Route Line & Buffer Corridor
    if (routeCoords.length > 1) {
      // 1. Buffer corridor (semi-transparent glowing strip)
      // Visual approximation of corridor width
      const bufferCorridor = L.polyline(routeCoords, {
        color: '#60a5fa',
        weight: Math.max(16, Math.round(bufferRadiusMeters / 12)),
        opacity: 0.25,
        lineCap: 'round',
        lineJoin: 'round'
      });
      layerGroup.addLayer(bufferCorridor);

      // 2. Main route line (Yandex style blue navigation line)
      const routeLine = L.polyline(routeCoords, {
        color: '#2563eb',
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      });
      layerGroup.addLayer(routeLine);

      routeCoords.forEach(c => boundsPoints.push(c));
    }

    // C. Start Marker (Point A)
    if (startPoint) {
      const startIcon = L.divIcon({
        className: 'custom-start-marker',
        html: `
          <div style="
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            border: 3px solid white;
          ">
            <span style="transform: rotate(45deg); font-weight: 900; font-size: 14px;">A</span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36]
      });

      const startMarker = L.marker([startPoint.lat, startPoint.lng], { icon: startIcon })
        .bindPopup(`<b>Boshlanish nuqtasi (A):</b><br/>${startPoint.name}`);
      layerGroup.addLayer(startMarker);
      boundsPoints.push([startPoint.lat, startPoint.lng]);
    }

    // D. End Marker (Point B)
    if (endPoint) {
      const endIcon = L.divIcon({
        className: 'custom-end-marker',
        html: `
          <div style="
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
            border: 3px solid white;
          ">
            <span style="transform: rotate(45deg); font-weight: 900; font-size: 14px;">B</span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36]
      });

      const endMarker = L.marker([endPoint.lat, endPoint.lng], { icon: endIcon })
        .bindPopup(`<b>Maqsad nuqtasi (B):</b><br/>${endPoint.name}`);
      layerGroup.addLayer(endMarker);
      boundsPoints.push([endPoint.lat, endPoint.lng]);
    }

    // E. Numbered TJM Markers along the route (#1, #2, #3...)
    matchedTJMs.forEach((item) => {
      const { object: obj, orderNumber, distFromRoadMeters, distAlongRouteMeters } = item;
      const isSelected = selectedTJMId === obj.source_id;
      const isVisited = Boolean(obj.is_visited || obj.last_visit);

      const bgColor = isVisited ? '#059669' : isSelected ? '#4f46e5' : '#2563eb';
      const scale = isSelected ? 'scale(1.2)' : 'scale(1)';

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
            transition: transform 0.2s;
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
        <div style="font-family: sans-serif; min-width: 180px; font-size: 12px;">
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

      marker.on('click', () => {
        onSelectTJM(obj.source_id);
      });

      layerGroup.addLayer(marker);
      boundsPoints.push([obj.latitude, obj.longitude]);
    });

    // Fit map bounds
    if (boundsPoints.length > 0) {
      map.fitBounds(L.latLngBounds(boundsPoints), {
        padding: [50, 50],
        maxZoom: 16
      });
    }
  }, [routeCoords, matchedTJMs, startPoint, endPoint, bufferRadiusMeters, selectedTJMId, showAllMarkers, allObjects, onSelectTJM]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full z-10" />

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
