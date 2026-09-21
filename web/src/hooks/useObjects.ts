import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../lib/api';
import { MapObject } from '../lib/types';

export function useObjects(companyId?: string) {
  const [markers, setMarkers] = useState<MapObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [status, setStatus] = useState('');

  const fetchMarkers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getMarkers(companyId);
      setMarkers(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchMarkers();
  }, [fetchMarkers]);

  const filteredMarkers = useMemo(() => {
    return markers.filter(marker => {
      if (search) {
        const q = search.toLowerCase();
        const matchesName = (marker.object_name || '').toLowerCase().includes(q);
        const matchesTjm = (marker.tjm_name || '').toLowerCase().includes(q);
        const matchesPhone = (marker.phone || '').toLowerCase().includes(q);
        const matchesManager = (marker.manager_name || '').toLowerCase().includes(q);
        const matchesAddress = (marker.sales_office || '').toLowerCase().includes(q);
        if (!matchesName && !matchesTjm && !matchesPhone && !matchesManager && !matchesAddress) return false;
      }
      if (district && marker.district_name && !marker.district_name.toLowerCase().includes(district.toLowerCase())) {
        return false;
      }
      if (status && !marker.status.toLowerCase().includes(status.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [markers, search, district, status]);

  return {
    markers,
    filteredMarkers,
    loading,
    error,
    refresh: fetchMarkers,
    filters: { search, setSearch, district, setDistrict, status, setStatus }
  };
}
