import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exportAllObjectsFromSheet } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// In-memory cache for ultra-fast response and server load optimization
let cachedData: any[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 10000; // 10 seconds cache

export async function GET() {
  try {
    const now = Date.now();

    // 1. Return fresh in-memory cache if available and young
    if (cachedData && (now - lastFetchTime < CACHE_TTL_MS)) {
      return NextResponse.json({ success: true, count: cachedData.length, data: cachedData });
    }

    // 2. Try to fetch directly from Google Sheets (Primary Permanent Source of Truth)
    try {
      const sheetsResult = await exportAllObjectsFromSheet();
      if (sheetsResult.success && sheetsResult.rows && sheetsResult.rows.length > 0) {
        cachedData = sheetsResult.rows;
        lastFetchTime = now;

        // Also update local cache file if writable
        try {
          const filePath = path.join(process.cwd(), 'src', 'lib', 'real-sheets-data.json');
          fs.writeFileSync(filePath, JSON.stringify({ headers: sheetsResult.headers, rows: sheetsResult.rows }, null, 2), 'utf-8');
        } catch (e) {}

        return NextResponse.json({ success: true, count: cachedData.length, data: cachedData });
      }
    } catch (sheetErr) {
      console.warn('Google Sheets live fetch warning, falling back to local cache:', sheetErr);
    }

    // 3. Fallback to local JSON if sheets is unreachable
    const filePath = path.join(process.cwd(), 'src', 'lib', 'real-sheets-data.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(raw);
      cachedData = json.rows;
      lastFetchTime = now;
      return NextResponse.json({ success: true, count: json.rows.length, data: json.rows });
    }

    return NextResponse.json({ success: false, error: 'Ma\'lumot topilmadi' }, { status: 404 });
  } catch (err: any) {
    console.error('API /api/objects error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
