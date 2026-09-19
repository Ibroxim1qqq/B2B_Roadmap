/**
 * In-memory shared data cache for B2B Samarqand API routes.
 * Ensures that changes made in update/visit/clear/create routes
 * are immediately visible in GET /api/objects without waiting for cache expiry.
 */

let cachedRows: any[] | null = null;
let cachedHeaders: string[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60000; // 1 minute background freshness check

export const dataCache = {
  getRows(): any[] | null {
    const now = Date.now();
    if (cachedRows && (now - lastFetchTime < CACHE_TTL_MS)) {
      return cachedRows;
    }
    return null;
  },

  getHeaders(): string[] | null {
    return cachedHeaders;
  },

  setAll(headers: string[], rows: any[]) {
    cachedHeaders = [...headers];
    cachedRows = [...rows];
    lastFetchTime = Date.now();
  },

  updateRow(sourceId: string, updatedFields: Record<string, any>) {
    if (!cachedRows) return;
    const idx = cachedRows.findIndex(r => String(r.source_id).trim() === String(sourceId).trim());
    if (idx !== -1) {
      cachedRows[idx] = { ...cachedRows[idx], ...updatedFields };
      lastFetchTime = Date.now();
    }
  },

  appendRow(newRecord: Record<string, any>) {
    if (!cachedRows) {
      cachedRows = [newRecord];
    } else {
      cachedRows.unshift(newRecord);
    }
    lastFetchTime = Date.now();
  },

  clearRowB2B(sourceId: string, fieldsToClear: string[]) {
    if (!cachedRows) return;
    const idx = cachedRows.findIndex(r => String(r.source_id).trim() === String(sourceId).trim());
    if (idx !== -1) {
      const updated = { ...cachedRows[idx] };
      for (const field of fieldsToClear) {
        updated[field] = '';
      }
      cachedRows[idx] = updated;
      lastFetchTime = Date.now();
    }
  },

  invalidate() {
    cachedRows = null;
    lastFetchTime = 0;
  }
};
