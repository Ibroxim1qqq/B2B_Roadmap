import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, requireSuperadmin } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireSuperadmin(req);
    const data = await db.getActivityLog(200);
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (err) {
    return apiError(err, 'Admin activity GET error');
  }
}
