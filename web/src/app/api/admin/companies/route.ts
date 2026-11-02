import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, clearUserCache, HttpError, readJsonBody, requireSuperadmin } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

const STATUSES = ['active', 'inactive'];
const DATA_SOURCES = ['dshk', 'uysot'];

export async function GET(req: Request) {
  try {
    await requireSuperadmin(req);
    const [companies, users, stats] = await Promise.all([db.getCompanies(), db.getUsers(), db.getCompanyStats()]);

    const enriched = companies.map(c => ({
      ...c,
      user_count: users.filter((u: any) => u.company_id === c.company_id).length,
      crm_count: stats[c.company_id]?.crm || 0,
      route_count: stats[c.company_id]?.routes || 0
    }));

    return NextResponse.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    return apiError(err, 'Admin companies GET error');
  }
}

export async function POST(req: Request) {
  try {
    await requireSuperadmin(req);
    const { name, status, data_source } = await readJsonBody(req);

    if (typeof name !== 'string' || !name.trim()) {
      throw new HttpError(400, 'Kompaniya nomi kiritilishi shart');
    }
    const cleanStatus = status === 'inactive' ? 'inactive' : 'active';
    const dataSource = data_source === 'uysot' ? 'uysot' : 'dshk';

    const created = await db.createCompany(name.trim(), cleanStatus, dataSource);
    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    return apiError(err, 'Admin companies POST error');
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireSuperadmin(req);
    const { company_id, company_name, status, data_source } = await readJsonBody(req);

    if (typeof company_id !== 'string' || !company_id) throw new HttpError(400, 'Kompaniya tanlanmagan');
    if (company_name !== undefined && (typeof company_name !== 'string' || !company_name.trim())) {
      throw new HttpError(400, "Kompaniya nomi bo'sh bo'lmasligi kerak");
    }
    if (status !== undefined && !STATUSES.includes(status)) throw new HttpError(400, "Holat noto'g'ri");
    if (data_source !== undefined && !DATA_SOURCES.includes(data_source)) throw new HttpError(400, "Ma'lumot manbasi noto'g'ri");

    const updated = await db.updateCompany(company_id, { company_name: company_name?.trim(), status, data_source });
    if (!updated) throw new HttpError(404, 'Kompaniya topilmadi');
    clearUserCache();

    await db.logActivity({ action: 'ADMIN_COMPANY_UPDATE', source_id: company_id, user: admin.name, details: { company_name, status, data_source } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err, 'Admin companies PATCH error');
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireSuperadmin(req);
    const companyId = new URL(req.url).searchParams.get('company_id');
    if (!companyId) throw new HttpError(400, 'Kompaniya tanlanmagan');

    const users = await db.getUsers();
    const userCount = users.filter((u: any) => u.company_id === companyId).length;
    if (userCount > 0) {
      throw new HttpError(409, `Bu kompaniyada ${userCount} ta foydalanuvchi bor. Avval ularni boshqa kompaniyaga o'tkazing yoki o'chiring.`);
    }

    await db.deleteCompany(companyId);
    await db.logActivity({ action: 'ADMIN_COMPANY_DELETE', source_id: companyId, user: admin.name });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err, 'Admin companies DELETE error');
  }
}
