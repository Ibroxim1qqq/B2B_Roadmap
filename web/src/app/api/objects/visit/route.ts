import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { updateObjectInSheet, logActivity } from '@/lib/googleSheets';
import { dataCache } from '@/lib/dataCache';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source_id, visited_by, lat_lng } = body;

    if (!source_id) {
      return NextResponse.json({ success: false, error: 'source_id talab qilinadi' }, { status: 400 });
    }

    const now = new Date();
    const formattedDate = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)} (${visited_by || 'Field Sales'})`;

    const visitData = {
      last_visit: formattedDate,
      visited_by: visited_by || 'Field Sales',
      visit_lat_lng: lat_lng || ''
    };

    // 1. Immediately update in-memory cache
    dataCache.updateRow(String(source_id), visitData);

    // 2. Direct Google Sheets API update
    try {
      await updateObjectInSheet(String(source_id), visitData);

      // Log to ActivityLog sheet
      await logActivity({
        action: 'VISIT',
        source_id: String(source_id),
        user: visited_by || 'Field Sales',
        details: visitData,
        status: 'SUCCESS'
      });
    } catch (sheetErr: any) {
      console.error('Google Sheets visit update error:', sheetErr);
      await logActivity({
        action: 'VISIT',
        source_id: String(source_id),
        user: visited_by || 'Field Sales',
        details: `Xatolik: ${sheetErr.message}`,
        status: 'FAILED'
      });
      return NextResponse.json({ 
        success: false, 
        error: `Google Sheets xatosi: ${sheetErr.message}` 
      }, { status: 500 });
    }

    // 3. Update local backup file if writable
    try {
      const filePath = path.join(process.cwd(), 'src', 'lib', 'real-sheets-data.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(raw);
        const rowIdx = json.rows.findIndex((r: any) => String(r.source_id).trim() === String(source_id).trim());
        if (rowIdx !== -1) {
          json.rows[rowIdx] = { ...json.rows[rowIdx], ...visitData };
          fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
        }
      }
    } catch (e) {
      // Harmless on read-only environments
    }

    return NextResponse.json({ success: true, message: 'Saqlandi', visit: visitData });
  } catch (err: any) {
    console.error('Visit route error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
