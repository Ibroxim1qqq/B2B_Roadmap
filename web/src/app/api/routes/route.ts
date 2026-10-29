import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('company_id') || undefined;

    const routes = await db.getRoutes(companyId);
    return NextResponse.json({ success: true, count: routes.length, data: routes });
  } catch (err: any) {
    console.error('Routes GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { start_lat, start_lng, end_lat, end_lng } = body;

    if (!start_lat || !start_lng || !end_lat || !end_lng) {
      return NextResponse.json(
        { success: false, error: 'Start (A) va End (B) koordinatalari kiritilishi shart' },
        { status: 400 }
      );
    }

    const result = await db.saveRoute(body);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Routes POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
