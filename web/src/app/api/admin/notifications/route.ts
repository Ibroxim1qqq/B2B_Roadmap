import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, HttpError, readJsonBody, requireSuperadmin } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireSuperadmin(req);
    const data = await db.getNotifications();
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (err) {
    return apiError(err, 'Admin notifications GET error');
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireSuperadmin(req);
    const { title, summary } = await readJsonBody(req);
    if (typeof title !== 'string' || !title.trim()) throw new HttpError(400, 'Sarlavha kiritilishi shart');
    const created = await db.saveNotification({ title: title.trim(), summary: String(summary || '') });
    await db.logActivity({ action: 'ADMIN_NOTIFICATION_CREATE', source_id: created.id, user: admin.name });
    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    return apiError(err, 'Admin notifications POST error');
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireSuperadmin(req);
    const { id, title, summary } = await readJsonBody(req);
    if (typeof id !== 'string' || !id) throw new HttpError(400, 'Bildirishnoma tanlanmagan');
    if (title !== undefined && (typeof title !== 'string' || !title.trim())) throw new HttpError(400, "Sarlavha bo'sh bo'lmasligi kerak");
    if (!(await db.updateNotification(id, { title: title?.trim(), summary }))) throw new HttpError(404, 'Bildirishnoma topilmadi');
    await db.logActivity({ action: 'ADMIN_NOTIFICATION_UPDATE', source_id: id, user: admin.name });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err, 'Admin notifications PATCH error');
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireSuperadmin(req);
    const id = new URL(req.url).searchParams.get('id');
    if (!id) throw new HttpError(400, 'Bildirishnoma tanlanmagan');
    if (!(await db.deleteNotification(id))) throw new HttpError(404, 'Bildirishnoma topilmadi');
    await db.logActivity({ action: 'ADMIN_NOTIFICATION_DELETE', source_id: id, user: admin.name });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err, 'Admin notifications DELETE error');
  }
}
