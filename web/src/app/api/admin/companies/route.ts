import { NextResponse } from 'next/server';
import { getCompaniesFromSheet, createCompanyInSheet, getUsersFromSheet } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [companies, users] = await Promise.all([
      getCompaniesFromSheet(),
      getUsersFromSheet()
    ]);

    // Attach user count per company
    const enriched = companies.map(c => ({
      ...c,
      user_count: users.filter(u => u.company_id === c.company_id).length
    }));

    return NextResponse.json({ success: true, count: enriched.length, data: enriched });
  } catch (err: any) {
    console.error('Admin companies GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, status } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Kompaniya nomi kiritilishi shart' },
        { status: 400 }
      );
    }

    const created = await createCompanyInSheet(name.trim(), status || 'active');
    return NextResponse.json({ success: true, data: created });
  } catch (err: any) {
    console.error('Admin companies POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
