import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, HttpError, readJsonBody, requireSuperadmin } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;
const EDITABLE = new Set([
  'object_name', 'address', 'region_soato', 'region_name', 'district_soato', 'district_name', 'latitude', 'longitude',
  'status', 'customer', 'builder', 'designer', 'difficulty', 'floors', 'apartment_count', 'block_count', 'deadline',
  'phone', 'sales_office', 'manager_name', 'manager_phone', 'telegram', 'email', 'notes'
]);

function matches(item: any, query: string): boolean {
  return [item.source_id, item.object_name, item.tjm_name, item.address, item.district_name, item.builder, item.customer, item.phone, item.company_id]
    .some(value => String(value ?? '').toLowerCase().includes(query));
}

export async function GET(req: Request) {
  try {
    await requireSuperadmin(req);
    const { searchParams } = new URL(req.url);
    const dataset = searchParams.get('dataset') || 'dshk';
    const query = (searchParams.get('q') || '').trim().toLowerCase();
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);

    const all = dataset === 'custom'
      ? (await db.getCompanyData('system')).customObjects
      : await db.getObjects(undefined, dataset === 'uysot');
    const filtered = query ? all.filter(item => matches(item, query)) : all;

    return NextResponse.json({
      success: true,
      count: filtered.length,
      page,
      page_size: PAGE_SIZE,
      data: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    });
  } catch (err) {
    return apiError(err, 'Admin objects GET error');
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireSuperadmin(req);
    const { source_id, company_id, data } = await readJsonBody(req);
    if (!source_id || !data || typeof data !== 'object') throw new HttpError(400, 'Obyekt tanlanmagan');

    const clean = Object.fromEntries(Object.entries(data).filter(([key]) => EDITABLE.has(key)));
    for (const key of ['latitude', 'longitude']) {
      if (clean[key] !== undefined && clean[key] !== '' && !Number.isFinite(Number(clean[key]))) {
        throw new HttpError(400, "Koordinatalar noto'g'ri");
      }
    }
    if (clean.object_name !== undefined && !String(clean.object_name).trim()) {
      throw new HttpError(400, "Obyekt nomi bo'sh bo'lmasligi kerak");
    }

    // A company-created object lives with its company; a source object is shared by everyone.
    const updated = company_id
      ? await db.updateCustomObject(String(company_id), String(source_id), clean)
      : await db.updateBaseObject(String(source_id), clean);
    if (!updated) throw new HttpError(404, 'Obyekt topilmadi');

    await db.logActivity({ action: 'ADMIN_OBJECT_UPDATE', source_id: String(source_id), user: admin.name, details: clean });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err, 'Admin objects PATCH error');
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireSuperadmin(req);
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('company_id');
    const sourceId = searchParams.get('source_id');
    if (!companyId || !sourceId) throw new HttpError(400, "Faqat kompaniya yaratgan obyektni o'chirish mumkin");

    if (!(await db.deleteCustomObject(companyId, sourceId))) throw new HttpError(404, 'Obyekt topilmadi');
    await db.logActivity({ action: 'ADMIN_OBJECT_DELETE', source_id: sourceId, user: admin.name, details: { company_id: companyId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err, 'Admin objects DELETE error');
  }
}
