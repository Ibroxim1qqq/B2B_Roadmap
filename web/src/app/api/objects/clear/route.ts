import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { updateObjectInSheet, INTERNAL_COLUMNS } from '@/lib/googleSheets';
import { dataCache } from '@/lib/dataCache';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source_id } = body;

    if (!source_id) {
      return NextResponse.json({ success: false, error: 'source_id talab qilinadi' }, { status: 400 });
    }

    // ONLY clear internal B2B columns; Government source data is 100% safeguarded!
    const clearedFields: Record<string, string> = {};
    INTERNAL_COLUMNS.forEach(col => {
      clearedFields[col] = '';
    });

    // 1. Update in-memory cache
    dataCache.clearRowB2B(String(source_id), INTERNAL_COLUMNS);

    // 2. Direct Google Sheets API update
    try {
      await updateObjectInSheet(String(source_id), clearedFields);
    } catch (sheetErr: any) {
      console.error('Google Sheets clear error:', sheetErr);
      return NextResponse.json({ 
        success: false, 
        error: `Google Sheets xatosi: ${sheetErr.message}` 
      }, { status: 500 });
    }

    // 3. Update local file backup if writable
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
      // Harmless
    }

    return NextResponse.json({ success: true, message: "O'chirildi" });
  } catch (err: any) {
    console.error('Clear route error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
