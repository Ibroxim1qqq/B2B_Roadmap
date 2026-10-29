import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
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

    // Refresh memory cache from Neon PostgreSQL
    dataCache.invalidate();

    const objects = await db.getObjects(companyId, isUysot);

    return NextResponse.json({
      success: true,
      message: "Neon PostgreSQL ma'lumotlar bazasi bilan muvaffaqiyatli sinxronlashtirildi",
      count: objects.length,
      data: objects
    });
  } catch (err: any) {
    console.error('API /api/objects/sync error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
