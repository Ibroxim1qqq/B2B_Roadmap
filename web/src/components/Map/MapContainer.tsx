'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import 'leaflet.markercluster';
import { MapObject } from '../../lib/types';
import { getRegionBySoato, UZBEKISTAN_CENTER, UZBEKISTAN_ZOOM } from '../../lib/regions';

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapContainerProps {
  markers: (MapObject & { distance?: number })[];
  onSelect: (id: string) => void;
  selectedId: string | null;
  userLat?: number | null;
  userLng?: number | null;
  selectedRegion?: string;
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function MapContainer({ markers, onSelect, selectedId, userLat, userLng, selectedRegion }: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layerRef = useRef<any>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [mapType, setMapType] = useState<'map' | 'satellite'>('map');

  // Pin icons differentiated by CRM status (Visited: Green, Filled: Blue, Empty: Amber, Paused: Slate)
  const createPinIcon = useCallback((marker: MapObject, isSelected: boolean) => {
    const isVisited = Boolean(marker.is_visited || marker.last_visit);
    const hasInternal = Boolean(marker.has_internal || marker.phone || marker.manager_name || marker.tjm_name);
    const isPaused = (marker.status || '').toLowerCase().includes("to'xtatilgan") || 
                     (marker.status || '').toLowerCase().includes('muzlatilgan') || 
                     marker.status_id === 3;

    let bg = 'bg-amber-500'; // Default: ma'lumot to'ldirilmagan (sariq/qahrabo)
    let ringColor = 'ring-amber-500/40';
    let badgeHtml = '';
    let iconSvg = `
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    `;

    if (isVisited) {
      // 1. Borgan bo'lsa: Yashil (Emerald)
      bg = 'bg-emerald-600';
      ringColor = 'ring-emerald-500/40';
      badgeHtml = `
        <div class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border border-white rounded-full flex items-center justify-center text-white text-[8px] font-black shadow-xs">
          ✓
        </div>
      `;
      iconSvg = `
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
    } else if (hasInternal) {
      // 2. Ma'lumot to'ldirilgan bo'lsa: Ko'k (Blue)
      bg = 'bg-blue-600';
      ringColor = 'ring-blue-500/40';
      badgeHtml = `
        <div class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-400 border border-white rounded-full shadow-xs"></div>
      `;
    } else if (isPaused) {
      // 3. To'xtatilgan / Muzlatilgan: Kulrang (Slate)
      bg = 'bg-slate-500';
      ringColor = 'ring-slate-500/30';
    } else {
      // 4. Ma'lumot to'ldirilmagan: Sariq / Qahrabo (Amber)
      bg = 'bg-amber-500';
      ringColor = 'ring-amber-500/30';
    }

    const ring = isSelected ? `ring-4 ${ringColor} scale-125 z-50` : '';

    return L.divIcon({
      className: 'custom-pin',
      html: `
        <div class="relative flex items-center justify-center transition-transform ${ring}">
          <div class="w-8 h-8 rounded-full ${bg} border-2 border-white shadow-md flex items-center justify-center text-white">
            ${iconSvg}
          </div>
          <div class="absolute -bottom-1 w-2 h-2 ${bg} rotate-45"></div>
          ${badgeHtml}
        </div>
      `,
      iconSize: [32, 36],
      iconAnchor: [16, 36],
      popupAnchor: [0, -36]
    });
  }, []);

  // Cluster icon: Displays number of clustered buildings
  const createClusterCustomIcon = useCallback((cluster: any) => {
    const count = cluster.getChildCount();
    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center cursor-pointer">
          <div class="absolute w-12 h-12 rounded-full bg-blue-500/20 animate-pulse"></div>
          <div class="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-md">
            <span>${count}</span>
          </div>
        </div>
      `,
      className: 'custom-cluster-icon',
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
  }, []);

  const userIcon = L.divIcon({
    className: 'user-location-icon',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-8 h-8 rounded-full bg-blue-500/30 animate-ping absolute"></div>
        <div class="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white">
          <div class="w-2 h-2 bg-white rounded-full"></div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  // 1. Initialize Map on Mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Clean any prior instance
    const el = containerRef.current as any;
    if (el._leaflet_id) {
      delete el._leaflet_id;
    }

    const map = L.map(containerRef.current, {
      center: [39.6542, 66.9597],
      zoom: 13,
      zoomControl: false
    });

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    mapRef.current = map;
    tileLayerRef.current = tileLayer;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // 2. Switch Tile Layer (Map vs Satellite)
  useEffect(() => {
    if (!tileLayerRef.current) return;
    if (mapType === 'map') {
      tileLayerRef.current.setUrl('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    } else {
      tileLayerRef.current.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
    }
  }, [mapType]);

  // 3. Render Markers & Clusters
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    let layer: any = null;
    if (typeof (L as any).markerClusterGroup === 'function') {
      layer = (L as any).markerClusterGroup({
        iconCreateFunction: createClusterCustomIcon,
        showCoverageOnHover: false,
        maxClusterRadius: 55, // Groups around 15-25 points when zoomed out
        disableClusteringAtZoom: 13, // At zoom 13+ (city/street level), individual pins are ALWAYS shown
        spiderfyOnMaxZoom: true,
        zoomToBoundsOnClick: true
      });
    } else {
      layer = L.layerGroup();
    }

    markers.forEach((marker) => {
      const isSelected = selectedId === marker.source_id;
      const dist = marker.distance !== undefined
        ? (marker.distance < 1 ? `${Math.round(marker.distance * 1000)} m` : `${marker.distance.toFixed(1)} km`)
        : '—';

      const icon = createPinIcon(marker, isSelected);
      const leafletMarker = L.marker([marker.latitude, marker.longitude], { icon });

      // Custom Popup DOM element to avoid innerHTML click issues
      const popupDiv = document.createElement('div');
      popupDiv.className = 'p-1.5 flex items-center gap-3 cursor-pointer min-w-[240px] hover:bg-slate-50 transition-colors rounded-xl';
      popupDiv.innerHTML = `
        ${marker.image_url 
          ? `<img src="${marker.image_url}" alt="" class="w-12 h-12 rounded-lg object-cover border border-slate-100 shrink-0" />`
          : `<div class="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
              <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M3 7v14M21 7v14M6 7V3h12v4M9 21v-4h6v4M9 7h6M9 11h6M9 15h6"/>
              </svg>
            </div>`
        }
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 mb-1">
            ${Boolean(marker.is_visited || marker.last_visit)
              ? '<span class="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-300">✓ Borgan</span>'
              : Boolean(marker.has_internal || marker.phone)
                ? '<span class="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md border border-blue-300">To\'ldirilgan</span>'
                : '<span class="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md border border-amber-300">To\'ldirilmagan</span>'
            }
          </div>
          <h4 class="font-bold text-slate-900 text-xs truncate">
            ${escapeHtml(marker.tjm_name || marker.object_name)}
          </h4>
          <div class="text-[11px] text-slate-500 truncate mt-0.5">
            ${escapeHtml(marker.address || marker.district_name || "Samarqand")}
          </div>
          <div class="flex items-center gap-1 text-[11px] font-semibold text-blue-600 mt-1">
            <span>📍 ${dist}</span>
          </div>
        </div>
      `;

      popupDiv.onclick = () => {
        onSelect(marker.source_id);
      };

      leafletMarker.bindPopup(popupDiv, {
        closeButton: false,
        className: 'custom-popup'
      });

      leafletMarker.on('click', () => {
        onSelect(marker.source_id);
      });

      layer.addLayer(leafletMarker);
    });

    map.addLayer(layer);
    layerRef.current = layer;
  }, [markers, selectedId, onSelect, createPinIcon, createClusterCustomIcon]);

  // 4. Focus / Fly to Selected Object
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const found = markers.find(m => m.source_id === selectedId);
    if (found && found.latitude && found.longitude) {
      map.flyTo([found.latitude, found.longitude], 15, { duration: 1 });
    }
  }, [selectedId, markers]);

  // 5. User Location Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userLat && userLng) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
      } else {
        userMarkerRef.current.setLatLng([userLat, userLng]);
      }
      map.flyTo([userLat, userLng], 14, { duration: 1 });
    } else if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
  }, [userLat, userLng]);

  // 6. Fly to Selected Region
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (selectedRegion) {
      const reg = getRegionBySoato(selectedRegion);
      if (reg) {
        map.flyTo(reg.center, reg.zoom, { duration: 1.2 });
      }
    } else {
      map.flyTo(UZBEKISTAN_CENTER, UZBEKISTAN_ZOOM, { duration: 1.2 });
    }
  }, [selectedRegion]);

  // 7. Invalidate size on resize
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs select-none">
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Map Legend for pin colors */}
      <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-md hidden sm:flex items-center gap-3 text-[11px] font-semibold text-slate-700">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-600 flex items-center justify-center text-[8px] text-white font-black shadow-xs">✓</span>
          <span>Borgan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-xs"></span>
          <span>To'ldirilgan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs"></span>
          <span>To'ldirilmagan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shadow-xs"></span>
          <span>To'xtatilgan</span>
        </div>
      </div>

      {/* Map Tile Switcher (Xarita | Satelit) bottom-right */}
      <div className="absolute bottom-5 right-5 z-[400] bg-white border border-slate-200/80 rounded-xl p-1 shadow-md flex items-center gap-1 text-xs font-semibold text-slate-700">
        <button
          onClick={() => setMapType('map')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            mapType === 'map' ? 'bg-slate-900 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          Xarita
        </button>
        <button
          onClick={() => setMapType('satellite')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            mapType === 'satellite' ? 'bg-slate-900 text-white shadow-xs' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          Satelit
        </button>
      </div>

      {/* Scale indicator bottom-left */}
      <div className="absolute bottom-5 left-5 z-[400] bg-white/90 backdrop-blur-xs border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] font-semibold text-slate-600 shadow-2xs">
        2 km
      </div>
    </div>
  );
}
