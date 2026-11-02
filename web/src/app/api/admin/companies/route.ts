import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, HttpError, readJsonBody, requireSuperadmin } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireSuperadmin(req);
    const [companies, users] = await Promise.all([db.getCompanies(), db.getUsers()]);

    // Attach user count per company
    const enriched = companies.map(c => ({
      ...c,
      user_count: users.filter((u: any) => u.company_id === c.company_id).length
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
