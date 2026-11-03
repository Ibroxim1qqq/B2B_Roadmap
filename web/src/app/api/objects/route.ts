import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRegionName, getDistrictName } from '@/lib/regions';
import { apiError, requireUser, resolveCompanyId } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatObject(item: any) {
  return {
    ...item,
    latitude: typeof item.latitude === 'string' ? parseFloat(item.latitude) : item.latitude,
    longitude: typeof item.longitude === 'string' ? parseFloat(item.longitude) : item.longitude,
    region_name: item.region_name || getRegionName(item.region_soato),
    district_name: item.district_name || getDistrictName(item.district_soato),
    is_visited: Boolean(item.last_visit || item.is_visited),
    has_internal: Boolean(item.phone || item.manager_name || item.tjm_name || item.brand_name || item.notes || item.has_internal)
  };
}

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const companyId = resolveCompanyId(user, searchParams.get('company_id'));
    const targetId = (searchParams.get('id') || '').trim();

    const dataSource = companyId === user.company_id
      ? user.data_source || 'dshk'
      : await db.getCompanyDataSource(companyId);
    const isUysot = dataSource === 'uysot';

    if (targetId) {
      const [item] = await db.getObjects(companyId, undefined, targetId);
      const wrongDataset = item && !item.is_custom_tjm && Boolean(item.is_uysot) !== isUysot && user.role !== 'superadmin';
      if (!item || wrongDataset) {
        return NextResponse.json({ success: false, error: 'Obyekt topilmadi' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data_source: dataSource, data: formatObject(item) });
    }

    const data = (await db.getObjects(companyId, isUysot)).map(formatObject);
    return NextResponse.json({ success: true, data_source: dataSource, count: data.length, data });
  } catch (err) {
    return apiError(err, 'API /api/objects error');
  }
}
