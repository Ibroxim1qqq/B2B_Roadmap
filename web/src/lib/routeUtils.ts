import { MapObject } from './types';

export interface RoutePoint {
  lat: number;
  lng: number;
  name: string;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][]; // [lat, lng]
}

export interface TJMAlongRoute {
  object: MapObject;
  orderNumber: number;
  distFromRoadMeters: number;
  distAlongRouteMeters: number;
}

/**
 * Haversine formula for distance between two geographic coordinates in meters
 */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Shortest distance from point P to line segment AB, plus projection factor t [0, 1]
 */
function distToSegment(
  pLat: number,
  pLon: number,
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): { distMeters: number; t: number } {
  const midLat = ((aLat + bLat) / 2 * Math.PI) / 180;
  const x = (bLon - aLon) * Math.cos(midLat) * 111320;
  const y = (bLat - aLat) * 110540;
  const px = (pLon - aLon) * Math.cos(midLat) * 111320;
  const py = (pLat - aLat) * 110540;

  const lenSq = x * x + y * y;
  let t = 0;
  if (lenSq > 0) {
    t = Math.max(0, Math.min(1, (px * x + py * y) / lenSq));
  }

  const projLon = aLon + t * (bLon - aLon);
  const projLat = aLat + t * (bLat - aLat);
  const dist = haversineMeters(pLat, pLon, projLat, projLon);

  return { distMeters: dist, t };
}

/**
 * Fetch real driving route from OSRM
 */
export async function calculateOSRMRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RouteResult> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM API returned error');

    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const primary = data.routes[0];
      // OSRM coordinates are [lng, lat], convert to Leaflet [lat, lng]
      const coords: [number, number][] = primary.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);

      return {
        distanceMeters: primary.distance || 0,
        durationSeconds: primary.duration || 0,
        coordinates: coords
      };
    }
  } catch (err) {
    console.warn('OSRM route calculation failed, using direct line:', err);
  }

  // Fallback: straight line with 20 intermediate points
  const points: [number, number][] = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push([
      startLat + t * (endLat - startLat),
      startLng + t * (endLng - startLng)
    ]);
  }
  const directDist = haversineMeters(startLat, startLng, endLat, endLng);
  return {
    distanceMeters: directDist,
    durationSeconds: Math.round((directDist / 1000) * 120), // ~30 km/h
    coordinates: points
  };
}

/**
 * Find all TJMs within bufferRadius of the route polyline and order them by progress along route
 */
export function findTJMsAlongRoute(
  objects: MapObject[],
  routeCoords: [number, number][],
  bufferRadiusMeters: number = 200
): TJMAlongRoute[] {
  if (routeCoords.length < 2) return [];

  // 1. Calculate cumulative segment distances along route
  const cumulativeDists: number[] = [0];
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const p1 = routeCoords[i];
    const p2 = routeCoords[i + 1];
    const segDist = haversineMeters(p1[0], p1[1], p2[0], p2[1]);
    cumulativeDists.push(cumulativeDists[i] + segDist);
  }

  const results: {
    object: MapObject;
    distFromRoadMeters: number;
    distAlongRouteMeters: number;
  }[] = [];

  // 2. Test each object
  for (const obj of objects) {
    if (!obj.latitude || !obj.longitude) continue;

    let minRoadDist = Infinity;
    let bestAlongDist = 0;

    for (let i = 0; i < routeCoords.length - 1; i++) {
      const a = routeCoords[i];
      const b = routeCoords[i + 1];
      const segLen = cumulativeDists[i + 1] - cumulativeDists[i];

      const { distMeters, t } = distToSegment(
        obj.latitude,
        obj.longitude,
        a[0],
        a[1],
        b[0],
        b[1]
      );

      if (distMeters < minRoadDist) {
        minRoadDist = distMeters;
        bestAlongDist = cumulativeDists[i] + t * segLen;
      }
    }

    if (minRoadDist <= bufferRadiusMeters) {
      results.push({
        object: obj,
        distFromRoadMeters: Math.round(minRoadDist),
        distAlongRouteMeters: Math.round(bestAlongDist)
      });
    }
  }

  // 3. Sort by position along route from start to destination
  results.sort((a, b) => a.distAlongRouteMeters - b.distAlongRouteMeters);

  // 4. Assign sequential order numbers (#1, #2, #3...)
  return results.map((item, idx) => ({
    ...item,
    orderNumber: idx + 1
  }));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    return `~${mins} daqiqa`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `~${hours} soat ${remainingMins} daq`;
}

/**
 * Calculate compass bearing between two coordinates in degrees [0, 360)
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const deltaLambda = (lon2 - lon1) * toRad;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return (theta * toDeg + 360) % 360;
}

/**
 * Calculate array of cumulative distances along route coordinates
 */
export function getRouteCumulativeDistances(coords: [number, number][]): number[] {
  if (coords.length === 0) return [0];
  const cum: number[] = [0];
  for (let i = 0; i < coords.length - 1; i++) {
    const d = haversineMeters(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
    cum.push(cum[i] + d);
  }
  return cum;
}

export interface RouteInterpolation {
  position: [number, number];
  bearing: number;
  passedDistanceMeters: number;
  totalDistanceMeters: number;
  traveledCoords: [number, number][];
}

/**
 * Smoothly interpolate car position and bearing along route given progress (0 to 1)
 */
export function interpolateRoutePosition(
  coords: [number, number][],
  cumulativeDists: number[],
  progress: number
): RouteInterpolation {
  if (coords.length === 0) {
    return {
      position: [0, 0],
      bearing: 0,
      passedDistanceMeters: 0,
      totalDistanceMeters: 0,
      traveledCoords: []
    };
  }

  if (coords.length === 1) {
    return {
      position: coords[0],
      bearing: 0,
      passedDistanceMeters: 0,
      totalDistanceMeters: 0,
      traveledCoords: [coords[0]]
    };
  }

  const totalDist = cumulativeDists[cumulativeDists.length - 1] || 1;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const targetDist = clampedProgress * totalDist;

  let segIndex = 0;
  for (let i = 0; i < cumulativeDists.length - 1; i++) {
    if (targetDist >= cumulativeDists[i] && targetDist <= cumulativeDists[i + 1]) {
      segIndex = i;
      break;
    }
    if (i === cumulativeDists.length - 2) {
      segIndex = i;
    }
  }

  const segStartDist = cumulativeDists[segIndex];
  const segEndDist = cumulativeDists[segIndex + 1] || segStartDist + 1;
  const segLen = segEndDist - segStartDist;

  const t = segLen > 0 ? (targetDist - segStartDist) / segLen : 0;
  const clampedT = Math.max(0, Math.min(1, t));

  const p1 = coords[segIndex];
  const p2 = coords[segIndex + 1] || p1;

  const lat = p1[0] + clampedT * (p2[0] - p1[0]);
  const lng = p1[1] + clampedT * (p2[1] - p1[1]);

  const bearing = calculateBearing(p1[0], p1[1], p2[0], p2[1]);
  const traveled = coords.slice(0, segIndex + 1);
  traveled.push([lat, lng]);

  return {
    position: [lat, lng],
    bearing,
    passedDistanceMeters: targetDist,
    totalDistanceMeters: totalDist,
    traveledCoords: traveled
  };
}

