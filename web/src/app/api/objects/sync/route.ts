import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { exportAllObjectsFromSheet } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await exportAllObjectsFromSheet();
    if (result.success && result.rows) {
      try {
        const filePath = path.join(process.cwd(), 'src', 'lib', 'real-sheets-data.json');
        fs.writeFileSync(filePath, JSON.stringify({ headers: result.headers, rows: result.rows }, null, 2), 'utf-8');
      } catch (e) {
        console.warn('Local cache write skipped in production:', e);
      }
      return NextResponse.json({ success: true, count: result.count, data: result.rows });
    }

    // Fallback if sheet empty or credentials not configured
    const filePath = path.join(process.cwd(), 'src', 'lib', 'real-sheets-data.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(raw);
      return NextResponse.json({ success: true, count: json.rows.length, data: json.rows });
    }

    return NextResponse.json({ success: false, error: 'Ma\'lumot topilmadi' }, { status: 404 });
  } catch (err: any) {
    console.error('Sync route error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
