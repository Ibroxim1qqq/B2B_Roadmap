import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { updateObjectInSheet, logActivity } from '@/lib/googleSheets';
import { dataCache } from '@/lib/dataCache';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source_id, data, user, company_id, user_id } = body;

    if (!source_id || !data) {
      return NextResponse.json({ success: false, error: 'source_id va data talab qilinadi' }, { status: 400 });
    }

    // 1. Immediately update in-memory cache
    dataCache.updateRow(String(source_id), data);

    // 2. Multi-company update: write to Company_Data sheet if company_id is provided
    try {
      if (company_id && company_id !== 'system') {
        const { updateCompanyDataInSheet } = await import('@/lib/googleSheets');
        await updateCompanyDataInSheet(company_id, user_id || user || '', String(source_id), data);
      } else {
        await updateObjectInSheet(String(source_id), data);
      }
      
      // Log to ActivityLog sheet
      await logActivity({
        action: 'UPDATE',
        source_id: String(source_id),
        object_name: data.tjm_name || '',
        user: `${user || 'Menejer'} (${company_id || 'Umumiy'})`,
        details: data,
        status: 'SUCCESS'
      });
    } catch (sheetErr: any) {
      console.error('Google Sheets update error:', sheetErr);
      await logActivity({
        action: 'UPDATE',
        source_id: String(source_id),
        object_name: data.tjm_name || '',
        user: `${user || 'Menejer'} (${company_id || 'Umumiy'})`,
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
          json.rows[rowIdx] = { ...json.rows[rowIdx], ...data };
          fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf-8');
        }
      }
    } catch (e) {
      // Harmless on read-only environments
    }

    return NextResponse.json({ success: true, message: 'Saqlandi' });
  } catch (err: any) {
    console.error('Update route error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
