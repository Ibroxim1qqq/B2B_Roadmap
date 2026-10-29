import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const notifications = await db.getNotifications();
    return NextResponse.json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (err: any) {
    console.error('Notifications GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Bildirishnoma sarlavhasi kiritilishi shart' },
        { status: 400 }
      );
    }

    const result = await db.saveNotification(body);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Notifications POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
