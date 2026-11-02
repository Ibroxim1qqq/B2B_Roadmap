import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, HttpError, readJsonBody, requireSuperadmin } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireSuperadmin(req);
    const [routes, companies] = await Promise.all([db.getRoutes(), db.getCompanies()]);
    const names = new Map(companies.map(c => [c.company_id, c.company_name]));
    const data = routes.map(r => ({ ...r, company_name: names.get(r.company_id) || r.company_id }));
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (err) {
    return apiError(err, 'Admin routes GET error');
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireSuperadmin(req);
    const { id, route_name, notes, status } = await readJsonBody(req);
    if (typeof id !== 'string' || !id) throw new HttpError(400, 'Marshrut tanlanmagan');
    if (!(await db.updateRoute(id, { route_name, notes, status }))) throw new HttpError(404, 'Marshrut topilmadi');
    await db.logActivity({ action: 'ADMIN_ROUTE_UPDATE', source_id: id, user: admin.name, details: { route_name, notes, status } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err, 'Admin routes PATCH error');
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireSuperadmin(req);
    const id = new URL(req.url).searchParams.get('id');
    if (!id) throw new HttpError(400, 'Marshrut tanlanmagan');
    if (!(await db.deleteRoute(id))) throw new HttpError(404, 'Marshrut topilmadi');
    await db.logActivity({ action: 'ADMIN_ROUTE_DELETE', source_id: id, user: admin.name });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err, 'Admin routes DELETE error');
  }
}
