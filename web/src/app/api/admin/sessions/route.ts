import { NextResponse } from 'next/server';
import { getUserSessionsFromSheet } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const sessions = await getUserSessionsFromSheet(limit);

    return NextResponse.json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (err: any) {
    console.error('Admin sessions GET error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Sessiyalarni yuklab bo\'lmadi' },
      { status: 500 }
    );
  }
}
