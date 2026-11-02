import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, HttpError, readJsonBody, requireUser, resolveCompanyId, userActorId } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

function coordinate(value: unknown, min: number, max: number): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(num) || num < min || num > max) {
    throw new HttpError(400, "Start (A) va End (B) koordinatalari noto'g'ri");
  }
  return num;
}

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const routes = await db.getRoutes(resolveCompanyId(user, searchParams.get('company_id')));
    return NextResponse.json({ success: true, count: routes.length, data: routes });
  } catch (err) {
    return apiError(err, 'Routes GET error');
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await readJsonBody(req);
    const result = await db.saveRoute({
      ...body,
      id: undefined,
      company_id: resolveCompanyId(user, body.company_id),
      user_id: userActorId(user),
      user_name: user.name,
      start_lat: coordinate(body.start_lat, -90, 90),
      start_lng: coordinate(body.start_lng, -180, 180),
      end_lat: coordinate(body.end_lat, -90, 90),
      end_lng: coordinate(body.end_lng, -180, 180)
    });
    return NextResponse.json({ success: true, routeId: result.id, data: result });
  } catch (err) {
    return apiError(err, 'Routes POST error');
  }
}
