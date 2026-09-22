import { NextResponse } from 'next/server';
import { getNotificationsFromSheet, saveNotificationToSheet } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const notifications = await getNotificationsFromSheet();
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
    const { title, new_count, new_objects } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Bildirishnoma sarlavhasi kiritilishi shart' },
        { status: 400 }
      );
    }

    const result = await saveNotificationToSheet(body);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Notifications POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
