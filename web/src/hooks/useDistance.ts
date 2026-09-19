import { useMemo } from 'react';
import { MapObject } from '../lib/types';
import { calculateDistance } from '../lib/utils';

export function useDistance(markers: MapObject[], userLat: number | null, userLng: number | null) {
  const objectsWithDistance = useMemo(() => {
    if (!userLat || !userLng || !markers.length) return [];

    return markers.map(marker => {
      const distance = calculateDistance(userLat, userLng, marker.latitude, marker.longitude);
      return { ...marker, distance };
    }).sort((a, b) => a.distance - b.distance);
  }, [markers, userLat, userLng]);

  return objectsWithDistance;
}
