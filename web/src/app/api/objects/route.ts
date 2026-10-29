import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getRegionName, getDistrictName } from '@/lib/regions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isUysotCompany = (cid?: string | null): boolean => {
  if (!cid) return false;
  const clean = String(cid).trim().toLowerCase();
  return clean === 'uysot' || 
         clean === 'comp_1789981554543' || 
         clean === 'uysot.uz' || 
         clean === 'uysot_uz' || 
         clean.includes('uysot');
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('company_id') || '';
    const targetId = (searchParams.get('id') || '').trim();
    const isUysot = companyId === 'uysot' || isUysotCompany(companyId) || (targetId ? targetId.startsWith('domtut_') : false);

    // 100% Direct Neon PostgreSQL database query
    const rawList = await db.getObjects(companyId, isUysot, targetId || undefined);

    if (targetId) {
      if (rawList && rawList.length > 0) {
        const item = rawList[0];
        const isVisited = Boolean(item.last_visit || item.is_visited);
        const hasInternal = Boolean(item.phone || item.manager_name || item.tjm_name || item.notes || item.has_internal);
        const formatted = {
          ...item,
          latitude: typeof item.latitude === 'string' ? parseFloat(item.latitude) : item.latitude,
          longitude: typeof item.longitude === 'string' ? parseFloat(item.longitude) : item.longitude,
          region_name: item.region_name || getRegionName(item.region_soato),
          district_name: item.district_name || getDistrictName(item.district_soato),
          is_visited: isVisited,
          has_internal: hasInternal
        };
        return NextResponse.json({ success: true, data: formatted });
      }
      return NextResponse.json({ success: false, error: 'Obyekt topilmadi' }, { status: 404 });
    }

    const data = rawList.map((item: any) => {
      const isVisited = Boolean(item.last_visit || item.is_visited);
      const hasInternal = Boolean(item.phone || item.manager_name || item.tjm_name || item.notes || item.has_internal);
      return {
        ...item,
        latitude: typeof item.latitude === 'string' ? parseFloat(item.latitude) : item.latitude,
        longitude: typeof item.longitude === 'string' ? parseFloat(item.longitude) : item.longitude,
        region_name: item.region_name || getRegionName(item.region_soato),
        district_name: item.district_name || getDistrictName(item.district_soato),
        is_visited: isVisited,
        has_internal: hasInternal
      };
    });

    return NextResponse.json({ success: true, count: data.length, data });
  } catch (err: any) {
    console.error('API /api/objects error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
