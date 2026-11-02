import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, requireSuperadmin } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireSuperadmin(req);
    const { searchParams } = new URL(req.url);
    const parsed = parseInt(searchParams.get('limit') || '100', 10);
    const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 500) : 100;
    const sessions = await db.getUserSessions(limit);
    return NextResponse.json({ success: true, count: sessions.length, data: sessions });
  } catch (err) {
    return apiError(err, 'Admin sessions GET error');
  }
}
