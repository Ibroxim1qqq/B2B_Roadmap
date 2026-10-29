import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dataCache } from '@/lib/dataCache';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source_id, visited_by, lat_lng, company_id, user_id } = body;

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

    const cleanSourceId = String(source_id);
    const effectiveCompany = company_id || 'comp_default';
    const effectiveUser = user_id || visited_by || 'Field Sales';

    // 1. Immediately update in-memory cache
    dataCache.updateRow(cleanSourceId, visitData);

    // 2. Direct Neon PostgreSQL update
    if (effectiveCompany !== 'system') {
      await db.updateCompanyData(effectiveCompany, effectiveUser, cleanSourceId, visitData);
    } else {
      await db.updateObject(cleanSourceId, visitData);
    }

    // 3. Log to activity logs
    await db.logActivity({
      action: 'VISIT',
      source_id: cleanSourceId,
      user: `${visited_by || 'Field Sales'} (${effectiveCompany})`,
      details: visitData,
      status: 'SUCCESS'
    });

    return NextResponse.json({ 
      success: true, 
      message: "Tashrif Neon PostgreSQL ma'lumotlar bazasida muvaffaqiyatli saqlandi",
      data: visitData 
    });
  } catch (err: any) {
    console.error('API /api/objects/visit error:', err);
    return NextResponse.json({ 
      success: false, 
      error: err.message || "Tashrifni saqlashda xatolik yuz berdi" 
    }, { status: 500 });
  }
}
