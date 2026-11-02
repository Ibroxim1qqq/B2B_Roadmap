import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, HttpError, readJsonBody, requireSuperadmin } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireSuperadmin(req);
    const [fields, companies] = await Promise.all([db.getAllCustomFields(), db.getCompanies()]);
    const names = new Map(companies.map(c => [c.company_id, c.company_name]));
    const data = fields.map(f => ({ ...f, company_name: f.company_id ? names.get(f.company_id) || f.company_id : 'Barcha kompaniyalar' }));
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (err) {
    return apiError(err, 'Admin fields GET error');
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireSuperadmin(req);
    const { field_name, field_type, label, desc, company_id } = await readJsonBody(req);
    const key = String(field_name || label || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!key) throw new HttpError(400, 'Maydon kaliti kiritilishi shart');

    const created = await db.addCustomField({
      field_name: key,
      field_type: field_type || 'text',
      required: false,
      visible: true,
      label: String(label || '').trim(),
      desc: String(desc || '').trim()
    }, String(company_id || ''));
    await db.logActivity({ action: 'ADMIN_FIELD_CREATE', source_id: key, user: admin.name });
    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    return apiError(err, 'Admin fields POST error');
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireSuperadmin(req);
    const { field_name, company_id, label, desc, field_type, visible } = await readJsonBody(req);
    if (typeof field_name !== 'string' || !field_name) throw new HttpError(400, 'Maydon tanlanmagan');
    const updated = await db.updateCustomField(String(company_id || ''), field_name, { label, desc, field_type, visible });
    if (!updated) throw new HttpError(404, 'Maydon topilmadi');
    await db.logActivity({ action: 'ADMIN_FIELD_UPDATE', source_id: field_name, user: admin.name });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err, 'Admin fields PATCH error');
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireSuperadmin(req);
    const { searchParams } = new URL(req.url);
    const fieldName = searchParams.get('field_name');
    if (!fieldName) throw new HttpError(400, 'Maydon tanlanmagan');
    if (!(await db.deleteCustomField(searchParams.get('company_id') || '', fieldName))) throw new HttpError(404, 'Maydon topilmadi');
    await db.logActivity({ action: 'ADMIN_FIELD_DELETE', source_id: fieldName, user: admin.name });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err, 'Admin fields DELETE error');
  }
}
