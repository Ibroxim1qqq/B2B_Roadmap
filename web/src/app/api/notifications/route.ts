import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, HttpError, readJsonBody, requireSuperadmin, requireUser } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    // Notifications announce new DSHK objects, which UYSOT-sourced companies do not use.
    const notifications = user.data_source === 'uysot' ? [] : await db.getNotifications();
    return NextResponse.json({ success: true, count: notifications.length, data: notifications });
  } catch (err) {
    return apiError(err, 'Notifications GET error');
  }
}

export async function POST(req: Request) {
  try {
    await requireSuperadmin(req);
    const body = await readJsonBody(req);
    if (typeof body.title !== 'string' || !body.title.trim()) {
      throw new HttpError(400, 'Bildirishnoma sarlavhasi kiritilishi shart');
    }
    const result = await db.saveNotification(body);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return apiError(err, 'Notifications POST error');
  }
}
