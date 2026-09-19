import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { updateObjectInSheet, INTERNAL_COLUMNS } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source_id } = body;

    if (!source_id) {
      return NextResponse.json({ success: false, error: 'source_id is required' }, { status: 400 });
    }

    const clearedFields: Record<string, string> = {};
    INTERNAL_COLUMNS.forEach(col => {
      clearedFields[col] = '';
    });

    // 1. Update local JSON file cache
    try {
      const filePath = path.join(process.cwd(), 'src', 'lib', 'real-sheets-data.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(raw);
        const rowIdx = json.rows.findIndex((r: any) => String(r.source_id).trim() === String(source_id).trim());
        if (rowIdx !== -1) {
          json.rows[rowIdx] = { ...json.rows[rowIdx], ...clearedFields };
          fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
        }
      }
    } catch (e) {
      console.warn('Local cache update skipped:', e);
    }

    // 2. Direct Google Sheets API update
    try {
      await updateObjectInSheet(String(source_id), clearedFields);
    } catch (sheetErr: any) {
      console.error('Google Sheets clear error:', sheetErr);
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        return NextResponse.json({ success: true, message: "O'chirildi (Lokal)" });
      }
      return NextResponse.json({ success: false, error: `Google Sheets xatosi: ${sheetErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "O'chirildi" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
