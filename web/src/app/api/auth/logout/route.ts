import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, clearSessionCookie, clearUserCache, getSessionToken } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const token = getSessionToken(req);
    if (token) await db.deleteAuthSession(token);
    clearUserCache();
    const res = NextResponse.json({ success: true });
    clearSessionCookie(res);
    return res;
  } catch (err) {
    return apiError(err, 'Auth logout error');
  }
}
