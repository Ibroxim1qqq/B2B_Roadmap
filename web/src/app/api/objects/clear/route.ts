import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dataCache } from '@/lib/dataCache';

export const dynamic = 'force-dynamic';

const INTERNAL_COLUMNS = [
  'tjm_name',
  'phone',
  'sales_office',
  'manager_name',
  'manager_phone',
  'telegram',
  'instagram',
  'notes',
  'priority',
  'last_visit',
  'visited_by',
  'visit_lat_lng'
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source_id, user, company_id, user_id } = body;

    if (!source_id) {
      return NextResponse.json({ success: false, error: 'source_id talab qilinadi' }, { status: 400 });
    }

    const cleanSourceId = String(source_id);
    const effectiveCompany = company_id || 'comp_default';

    // ONLY clear internal B2B columns; Government source data is 100% safeguarded!
    const clearedFields: Record<string, string> = {};
    INTERNAL_COLUMNS.forEach(col => {
      clearedFields[col] = '';
    });

    // 1. Update in-memory cache
    dataCache.clearRowB2B(cleanSourceId, INTERNAL_COLUMNS);

    // 2. Direct Neon PostgreSQL update
    if (effectiveCompany !== 'system') {
      await db.clearCompanyData(effectiveCompany, cleanSourceId);
    } else {
      await db.updateObject(cleanSourceId, clearedFields);
    }

    // 3. Log to activity logs
    await db.logActivity({
      action: 'CLEAR',
      source_id: cleanSourceId,
      user: user || 'Menejer',
      details: effectiveCompany ? `Kompaniya [${effectiveCompany}] uchun B2B ma'lumotlari tozalandi` : "Barcha B2B ma'lumotlari tozalandi",
      status: 'SUCCESS'
    });

    return NextResponse.json({
      success: true,
      message: "Obyekt B2B ma'lumotlari Neon PostgreSQL ma'lumotlar bazasida tozalandi"
    });
  } catch (err: any) {
    console.error('API /api/objects/clear error:', err);
    return NextResponse.json({ 
      success: false, 
      error: err.message || "Tozalashda xatolik yuz berdi" 
    }, { status: 500 });
  }
}
