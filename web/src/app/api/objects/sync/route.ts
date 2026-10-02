import { NextResponse, NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { exportAllObjectsFromSheet, getUysotObjectsFromSheet } from '@/lib/googleSheets';
import { dataCache } from '@/lib/dataCache';

export const dynamic = 'force-dynamic';

const isUysotCompany = (cid?: string | null): boolean => {
  if (!cid) return false;
  const clean = String(cid).trim().toLowerCase();
  return clean === 'uysot' || 
         clean === 'comp_1789981554543' || 
         clean === 'uysot.uz' || 
         clean === 'uysot_uz' || 
         clean.includes('uysot');
};

export async function POST(req: NextRequest) {
  try {
    let companyId = '';
    try {
      const { searchParams } = new URL(req.url);
      companyId = searchParams.get('company_id') || '';
      if (!companyId) {
        const body = await req.json().catch(() => ({}));
        companyId = body.company_id || '';
      }
    } catch (e) {}

    const isUysot = isUysotCompany(companyId);

    if (isUysot) {
      // Sync strictly for UYSOT.UZ (Domtut dataset)
      const uysotObjects = await getUysotObjectsFromSheet();
      const pureUysot = uysotObjects.filter((r: any) => String(r.source_id || '').startsWith('domtut_') || r.is_uysot);
      return NextResponse.json({ success: true, count: pureUysot.length, data: pureUysot });
    }

    // Force cache invalidation to get 100% fresh data from Google Sheets for non-UYSOT (DSHK)
    dataCache.invalidate();

    const result = await exportAllObjectsFromSheet();
    if (result.success && result.rows) {
      // Filter out any domtut rows from DSHK dataset
      const pureDshk = result.rows.filter((r: any) => !String(r.source_id || '').startsWith('domtut_') && !r.is_uysot);
      try {
        const filePath = path.join(process.cwd(), 'src', 'lib', 'real-sheets-data.json');
        fs.writeFileSync(filePath, JSON.stringify({ headers: result.headers, rows: pureDshk }, null, 2), 'utf-8');
      } catch (e) {
        // Harmless on read-only environments
      }
      return NextResponse.json({ success: true, count: pureDshk.length, data: pureDshk });
    }

    // Fallback if sheet empty
    const filePath = path.join(process.cwd(), 'src', 'lib', 'real-sheets-data.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(raw);
      const pureRows = (json.rows || []).filter((r: any) => !String(r.source_id || '').startsWith('domtut_') && !r.is_uysot);
      dataCache.setAll(json.headers || [], pureRows);
      return NextResponse.json({ success: true, count: pureRows.length, data: pureRows });
    }

    return NextResponse.json({ success: false, error: "Ma'lumot topilmadi" }, { status: 404 });
  } catch (err: any) {
    console.error('Sync route error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
