import { NextResponse } from 'next/server';
import { apiError, requireUser } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return NextResponse.json({ success: true, user });
  } catch (err) {
    return apiError(err, 'Auth me error');
  }
}
