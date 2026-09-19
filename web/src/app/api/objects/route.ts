import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exportAllObjectsFromSheet } from '@/lib/googleSheets';
import { dataCache } from '@/lib/dataCache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Check in-memory shared cache first for fast response
    const cached = dataCache.getRows();
    if (cached && cached.length > 0) {
      return NextResponse.json({ success: true, count: cached.length, data: cached });
    }

    // 2. Fetch directly from Google Sheets (Primary Permanent Source of Truth)
    try {
      const sheetsResult = await exportAllObjectsFromSheet();
      if (sheetsResult.success && sheetsResult.rows && sheetsResult.rows.length > 0) {
        return NextResponse.json({ 
          success: true, 
          count: sheetsResult.rows.length, 
          data: sheetsResult.rows 
        });
      }
    } catch (sheetErr) {
      console.warn('Google Sheets live fetch warning, falling back to local file backup:', sheetErr);
    }

    // 3. Fallback to local JSON backup if sheets is unreachable
    try {
      const filePath = path.join(process.cwd(), 'src', 'lib', 'real-sheets-data.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(raw);
        if (json.rows && json.rows.length > 0) {
          dataCache.setAll(json.headers || [], json.rows);
          return NextResponse.json({ success: true, count: json.rows.length, data: json.rows });
        }
      }
    } catch (fsErr) {
      console.warn('Local backup read failed:', fsErr);
    }

    return NextResponse.json({ success: false, error: "Ma'lumot topilmadi" }, { status: 404 });
  } catch (err: any) {
    console.error('API /api/objects error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
