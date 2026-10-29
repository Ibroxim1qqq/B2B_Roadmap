import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dataCache } from '@/lib/dataCache';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source_id, data, user, company_id, user_id } = body;

    if (!source_id || !data) {
      return NextResponse.json({ success: false, error: 'source_id va data talab qilinadi' }, { status: 400 });
    }

    const cleanSourceId = String(source_id);
    const effectiveCompany = company_id || 'comp_default';
    const effectiveUser = user_id || user || 'Menejer';

    // 1. Immediately update in-memory cache for snappy responsiveness
    dataCache.updateRow(cleanSourceId, data);

    // 2. Direct Neon PostgreSQL Database Upsert
    if (effectiveCompany !== 'system') {
      await db.updateCompanyData(effectiveCompany, effectiveUser, cleanSourceId, data);
    } else {
      await db.updateObject(cleanSourceId, data);
    }

    // 3. Log activity directly into PostgreSQL activity logs
    await db.logActivity({
      action: 'UPDATE',
      source_id: cleanSourceId,
      object_name: data.tjm_name || '',
      user: `${user || 'Menejer'} (${effectiveCompany})`,
      details: data,
      status: 'SUCCESS'
    });

    return NextResponse.json({ 
      success: true, 
      message: "Ma'lumotlar Neon PostgreSQL ma'lumotlar bazasida muvaffaqiyatli yangilandi",
      data: { source_id: cleanSourceId, ...data }
    });
  } catch (err: any) {
    console.error('API /api/objects/update error:', err);
    return NextResponse.json({ 
      success: false, 
      error: err.message || "Yangilashda xatolik yuz berdi" 
    }, { status: 500 });
  }
}
